/**
 * main.js — Grid War entry point.
 * Creates Game, patches BVH, connects socket, manages client state machine.
 */
import { Game, KinematicCharacterController } from '@thegridcn/engine';
import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import {
    computeBoundsTree,
    disposeBoundsTree,
    acceleratedRaycast,
} from 'three-mesh-bvh';

import CityGenerator from './map/CityGenerator.js';
import CapturePoint from './map/CapturePoint.js';
import SpawnNode from './map/SpawnNode.js';
import ColyseusClient from './net/ColyseusClient.js';
import SnapshotBuffer from './net/SnapshotBuffer.js';
import BulletTracerPool from './weapons/BulletTracer.js';
import { getWeapon } from './weapons/WeaponRegistry.js';
import { Events } from './constants/Events.js';
import { MainMenu } from './ui/MainMenu.js';
import { ArsenalUI } from './ui/ArsenalUI.js';
import { HUD } from './ui/HUD.js';
import { MapOverlay } from './ui/MapOverlay.js';
import { Scoreboard } from './ui/Scoreboard.js';

// ─── Patch Three.js once at app start — enables BVH on all geometries ───────
THREE.BufferGeometry.prototype.computeBoundsTree = computeBoundsTree;
THREE.BufferGeometry.prototype.disposeBoundsTree = disposeBoundsTree;
THREE.Mesh.prototype.raycast = acceleratedRaycast;

// ─── Game instance ──────────────────────────────────────────────────────────
const game = new Game('', {
    rendererOptions: {
        setupFullScreenCanvas: true,
        cameraOptions: { fov: 50, near: 0.01, far: 1000 },
        beforeRender: onBeforeRender,
    },
    inputOptions: { wsadMovement: true, mouseOptions: { usePointerLock: true } },
});

// ─── Client state ───────────────────────────────────────────────────────────
let clientState = 'MAIN_MENU';
let socketClient = null;
let snapshotBuffer = null;
let tracerPool = null;
let cityData = null;
let capturePoints = [];
let spawnNodeRegistry = null;
// Player state
let localPlayerId = null;
let localTeam = null;
let characterController = null;

// Collision
let collisionMesh = null;

// Weapon state
let equipped = false;
let activeSlot = 'sr';
let srWeaponId = 'smg';
let hrWeaponId = 'rifle';
let srAmmo = 0;
let hrAmmo = 0;
let srMax = 0;
let hrMax = 0;
let lastFiredAt = 0;
let firePendingThisFrame = false;
let qWasDown = false;

// Spawn shield
let shielded = false;
let shieldEnd = 0;

// Remote players (Map<string, THREE.Mesh>)
const remotePlayers = new Map();

// Constants
const MOVE_SPEED = 8;
const JUMP_FORCE = 8;
const GRAVITY = 20;
const CAPSULE_RADIUS = 0.35;
const CAPSULE_HALF_HEIGHT = 0.5;

// Pre-allocated temp vectors (zero per-frame allocations)
const _forward = new THREE.Vector3();
const _right = new THREE.Vector3();
const _moveDir = new THREE.Vector3();
const _rayOrigin = new THREE.Vector3();
const _rayDir = new THREE.Vector3();

// ─── Init ───────────────────────────────────────────────────────────────────
async function init() {
    await game._init();

    // Show main menu
    MainMenu.init(onPlayClicked);
    setState('MAIN_MENU');
}

function setState(state) {
    clientState = state;
    console.log(`[Grid War] State: ${state}`);
}

// ─── Play clicked → connect + load ──────────────────────────────────────────
async function onPlayClicked(playerName, teamPref) {
    MainMenu.hide();
    setState('LOADING');

    // Init networking
    socketClient = new ColyseusClient();
    snapshotBuffer = new SnapshotBuffer(100);

    localTeam = teamPref || 'blue';

    // Connect and join
    socketClient.connect();

    socketClient.onRoomJoined((data) => {
        localPlayerId = data.playerId;
        console.log(`[Grid War] Joined as ${localPlayerId}, team: ${localTeam}`);
    });

    // Generate city
    const seed = Math.floor(Math.random() * 100000);
    const generator = new CityGenerator(seed);
    cityData = generator.generate();

    // Load scene
    await game.loadScene('grid_war');

    // Add city to scene
    game.scene.threeJSScene.add(cityData.group);

    // Build BVH on collision mesh
    collisionMesh = cityData.collisionMesh;
    collisionMesh.geometry.computeBoundsTree();

    // Create capture point visuals
    capturePoints = cityData.capturePositions.map((pos, idx) => {
        const cp = new CapturePoint(pos, idx, pos.isBase, pos.team);
        game.scene.threeJSScene.add(cp.getGroup());
        return cp;
    });

    // Spawn nodes
    spawnNodeRegistry = new SpawnNode(cityData.spawnNodes);

    // Init tracer pool
    tracerPool = new BulletTracerPool(game.scene.threeJSScene);

    // Init HUD
    HUD.init();

    // Join room
    socketClient.joinRoom(playerName, teamPref);

    // Listen for server events
    setupNetworkListeners();

    // Spawn player
    // Set up the local player controller using the engine's KinematicCharacterController
    characterController = new KinematicCharacterController({
        inputManager: game.inputManager,
        camera: game.renderer.threeJSCamera,
        capsuleHalfHeight: CAPSULE_HALF_HEIGHT,
        capsuleRadius: CAPSULE_RADIUS,
        speed: MOVE_SPEED,
        jumpForce: JUMP_FORCE,
        gravity: GRAVITY,
    });
    characterController.setCollisionMesh(collisionMesh);

    const spawnPos = spawnNodeRegistry.getSpawnPosition(localTeam || 'blue');
    // Create a Rapier kinematic body for the player (for triggers and server prediction)
    const rbDesc = RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(spawnPos.x, spawnPos.y, spawnPos.z);
    const rb = game.scene.rapierWorld.createRigidBody(rbDesc);
    const colDesc = RAPIER.ColliderDesc.capsule(CAPSULE_HALF_HEIGHT, CAPSULE_RADIUS);
    game.scene.rapierWorld.createCollider(colDesc, rb);

    characterController.setRigidBody(rb);
    characterController.position.copy(spawnPos);

    setState('IN_MATCH');
}

// ─── Network listeners ──────────────────────────────────────────────────────
function setupNetworkListeners() {
    socketClient.onWorldSnapshot((snap) => {
        snapshotBuffer.push(snap);

        if (snap.entities) {
            for (const entity of snap.entities) {
                if (entity.id === localPlayerId) continue;
                updateRemotePlayer(entity);
            }
        }
    });

    socketClient.onPlayerJoined((info) => {
        console.log(`[Grid War] Player joined: ${info.playerName}`);
        createRemotePlayerMesh(info.playerId);
    });

    socketClient.onPlayerLeft((id) => {
        console.log(`[Grid War] Player left: ${id}`);
        removeRemotePlayer(id);
    });

    socketClient.onReconcile((payload) => {
        const diff = Math.sqrt(
            (payload.state.position[0] - characterController.position.x) ** 2 +
            (payload.state.position[1] - characterController.position.y) ** 2 +
            (payload.state.position[2] - characterController.position.z) ** 2
        );
        if (diff > 0.5 && characterController) {
            characterController.position.set(...payload.state.position);
            const rb = characterController['_rigidBody'];
            if (rb) {
                rb.setTranslation({ x: payload.state.position[0], y: payload.state.position[1], z: payload.state.position[2] }, true);
            }
        }
    });

    socketClient.onServer(Events.SPAWN, (data) => {
        if (characterController) {
            characterController.position.set(data.position[0], data.position[1], data.position[2]);
        }
        shielded = true;
        shieldEnd = data.shieldEnd;
        equipped = false;
        srAmmo = 0;
        hrAmmo = 0;
    });

    socketClient.onServer(Events.HIT, () => {
        // Visual hit feedback: could flash screen
    });

    socketClient.onServer(Events.KILL, (data) => {
        showKillFeed(data.killerId, data.victimId);
        if (data.victimId === localPlayerId) {
            // We died — await SPAWN
        }
    });

    socketClient.onServer(Events.EQUIP_CONFIRMED, (data) => {
        equipped = true;
        srWeaponId = data.srWeaponId;
        hrWeaponId = data.hrWeaponId;
        ArsenalUI.hide();
    });

    socketClient.onServer(Events.RESUPPLY_GRANTED, (data) => {
        srAmmo = data.srCurrent;
        hrAmmo = data.hrCurrent;
    });

    socketClient.onServer(Events.MATCH_END, (data) => {
        setState('POST_MATCH');
        showMatchEnd(data.winner);
    });

    socketClient.onServer(Events.POINT_CAPTURED, (data) => {
        const cp = capturePoints[data.pointId];
        if (cp) cp.ownerTeam = data.ownerTeam;
    });

    socketClient.onServer(Events.FINAL_STAND_START, (data) => {
        showFinalStand(data.endsAt);
    });
}

// ─── Remote players ─────────────────────────────────────────────────────────
function createRemotePlayerMesh(id) {
    // Guard against double-creation: a WORLD_SNAPSHOT can lazily create a mesh
    // before PLAYER_JOINED fires, which would otherwise orphan the first mesh.
    if (remotePlayers.has(id)) return;
    const geo = new THREE.CapsuleGeometry(CAPSULE_RADIUS, CAPSULE_HALF_HEIGHT * 2, 4, 8);
    const mat = new THREE.MeshBasicMaterial({ color: 0x888888 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.name = `remote_${id}`;
    game.scene.threeJSScene.add(mesh);
    remotePlayers.set(id, mesh);
}

function updateRemotePlayer(snap) {
    let mesh = remotePlayers.get(snap.id);
    if (!mesh) {
        createRemotePlayerMesh(snap.id);
        mesh = remotePlayers.get(snap.id);
    }
    if (mesh) {
        // Interpolate or set directly
        const interp = snapshotBuffer.getInterpolated(snap.id);
        if (interp) {
            mesh.position.set(interp.position[0], interp.position[1], interp.position[2]);
        } else {
            mesh.position.set(snap.position[0], snap.position[1], snap.position[2]);
        }
        // Team colour
        mesh.material.color.setHex(snap.team === 'blue' ? 0x4488ff : 0xff4444);
    }
}

function removeRemotePlayer(id) {
    const mesh = remotePlayers.get(id);
    if (mesh) {
        game.scene.threeJSScene.remove(mesh);
        mesh.geometry.dispose();
        mesh.material.dispose();
        remotePlayers.delete(id);
    }
}

// ─── Game loop (called via Renderer.beforeRender) ────────────────────────────
function onBeforeRender({ deltaTimeInSec }) {
    if (clientState !== 'IN_MATCH') return;

    const dt = Math.min(deltaTimeInSec, 0.05); // Cap delta to avoid spiral
    const camera = game.renderer.threeJSCamera;

    // ─── Character Controller Movement ──────────────────────────────────
    if (characterController) {
        characterController.update(dt);
    }

    // ─── Weapon switching (Q key or mouse wheel) ────────────────────────
    const qDown = game.inputManager.isKeyDown('q');
    if (qDown && !qWasDown) {
        activeSlot = activeSlot === 'sr' ? 'hr' : 'sr';
    }
    qWasDown = qDown;

    // ─── Fire ───────────────────────────────────────────────────────────
    if (game.inputManager.isKeyDown('mouse0')) {
        tryFire();
    }

    // ─── Spawn shield ──────────────────────────────────────────────────
    if (shielded && Date.now() > shieldEnd) {
        shielded = false;
    }

    // ─── Arsenal zone detection ────────────────────────────────────────
    checkArsenalZone();

    // ─── Resupply (R key) ──────────────────────────────────────────────
    if (game.inputManager.isKeyDown('r')) {
        tryResupply();
    }

    // ─── Map overlay (M key) ───────────────────────────────────────────
    if (game.inputManager.isKeyDown('m')) {
        MapOverlay.toggle();
    }

    // ─── Tab for scoreboard ────────────────────────────────────────────
    if (game.inputManager.isKeyDown('tab')) {
        Scoreboard.show();
    } else {
        Scoreboard.hide();
    }

    // ─── Send input to server ──────────────────────────────────────────
    if (socketClient && socketClient.isConnected) {
        const currentWeaponId = activeSlot === 'sr' ? srWeaponId : hrWeaponId;
        camera.getWorldDirection(_rayDir);
        socketClient.sendInput({
            forward: game.inputManager.isKeyDown('w'),
            backward: game.inputManager.isKeyDown('s'),
            left: game.inputManager.isKeyDown('a'),
            right: game.inputManager.isKeyDown('d'),
            jump: game.inputManager.isKeyDown(' '),
            yaw: characterController ? characterController.yaw : 0,
            pitch: characterController ? characterController.pitch : 0,
            fire: firePendingThisFrame,
            weaponId: currentWeaponId,
            slot: activeSlot,
            origin: [camera.position.x, camera.position.y, camera.position.z],
            direction: [_rayDir.x, _rayDir.y, _rayDir.z],
        });
        firePendingThisFrame = false;
    }

    // ─── HUD update ────────────────────────────────────────────────────
    const currentAmmo = activeSlot === 'sr' ? srAmmo : hrAmmo;
    const maxAmmo = activeSlot === 'sr' ? srMax : hrMax;
    HUD.update(currentAmmo, maxAmmo);

    // ─── Map overlay update ────────────────────────────────────────────
    if (MapOverlay.isOpen()) {
        MapOverlay.render(characterController ? characterController.position : new THREE.Vector3(), characterController ? characterController.yaw : 0, capturePoints, remotePlayers, localTeam);
    }
}

// ─── Fire logic ──────────────────────────────────────────────────────────────
function tryFire() {
    if (!equipped) return;
    if (shielded) return;

    const weaponId = activeSlot === 'sr' ? srWeaponId : hrWeaponId;
    const weapon = getWeapon(weaponId);
    if (!weapon) return;

    const ammo = activeSlot === 'sr' ? srAmmo : hrAmmo;
    if (ammo <= 0) return;

    const now = Date.now();
    if (now - lastFiredAt < 1000 / weapon.fireRateHz) return;

    lastFiredAt = now;
    firePendingThisFrame = true;

    // Decrement ammo optimistically
    if (activeSlot === 'sr') srAmmo--;
    else hrAmmo--;

    // Spawn tracer
    const camera = game.renderer.threeJSCamera;
    camera.getWorldDirection(_rayDir);
    tracerPool.fire(camera.position, _rayDir, weapon.range, weapon.tracerColor);
}

// ─── Arsenal zone ────────────────────────────────────────────────────────────
let inArsenal = false;
function checkArsenalZone() {
    // Check if player is near their base (simplified — arsenal is inside base)
    const base = capturePoints.find(cp => cp.isBase && cp.ownerTeam === localTeam);
    if (!base) return;

    const pos = characterController ? characterController.position : new THREE.Vector3();
    const wasInArsenal = inArsenal;
    inArsenal = base.isInRange(pos.x, pos.y, pos.z);

    if (inArsenal && !wasInArsenal && !equipped) {
        ArsenalUI.show(srWeaponId, hrWeaponId, (sr, hr, srR, hrR) => {
            srWeaponId = sr;
            hrWeaponId = hr;
            srMax = srR;
            hrMax = hrR;
            srAmmo = srR;
            hrAmmo = hrR;
            socketClient.equipLoadout(sr, hr, srR, hrR);
        });
    } else if (!inArsenal && wasInArsenal) {
        ArsenalUI.hide();
    }
}

// ─── Resupply ────────────────────────────────────────────────────────────────
let lastResupplyReq = 0;
function tryResupply() {
    if (Date.now() - lastResupplyReq < 1000) return;
    for (const cp of capturePoints) {
        if (cp.isBase) continue;
        if (cp.ownerTeam !== localTeam) continue;
        const pos = characterController ? characterController.position : new THREE.Vector3();
        if (cp.isInRange(pos.x, pos.y, pos.z)) {
            socketClient.requestResupply(cp.index);
            lastResupplyReq = Date.now();
            break;
        }
    }
}

// ─── UI helpers ──────────────────────────────────────────────────────────────
function showKillFeed(killerId, victimId) {
    const feed = document.getElementById('kill-feed');
    if (!feed) return;
    const entry = document.createElement('div');
    entry.className = 'kill-entry';
    entry.textContent = `${killerId.substring(0, 6)} ▸ ${victimId.substring(0, 6)}`;
    feed.appendChild(entry);
    setTimeout(() => entry.remove(), 5000);
}

function showMatchEnd(winner) {
    const el = document.getElementById('match-end');
    const result = document.getElementById('match-result');
    if (el && result) {
        result.textContent = winner === localTeam ? 'VICTORY' : 'DEFEAT';
        result.className = winner === localTeam ? 'neon-text' : 'neon-text-red';
        el.classList.remove('hidden');
    }
}

function showFinalStand(_endsAt) {
    const el = document.getElementById('final-stand');
    if (el) el.classList.remove('hidden');
    // Timer update handled in HUD
}

// ─── Boot ───────────────────────────────────────────────────────────────────
init().catch(console.error);
