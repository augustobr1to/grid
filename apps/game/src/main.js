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
import VoiceChat from './voice/VoiceChat.js';
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
let voiceChat = null;
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
let mWasDown = false;

// Spawn shield
let shielded = false;
let shieldEnd = 0;

// Remote players (Map<string, THREE.Mesh>)
const remotePlayers = new Map();
// playerId → PeerJS id, so we can tear down a leaver's voice call/audio element.
const remotePeerIds = new Map();
// Shared remote-player GPU resources — one geometry + per-team materials reused
// across all remote meshes (was one geometry + one material allocated per player).
let _remoteGeo = null;
const _teamMaterials = {};
function remoteGeometry() {
    if (!_remoteGeo) _remoteGeo = new THREE.CapsuleGeometry(CAPSULE_RADIUS, CAPSULE_HALF_HEIGHT * 2, 4, 8);
    return _remoteGeo;
}
function teamMaterial(team) {
    const key = team === 'blue' ? 'blue' : 'red';
    if (!_teamMaterials[key]) {
        _teamMaterials[key] = new THREE.MeshBasicMaterial({ color: key === 'blue' ? 0x4488ff : 0xff4444 });
    }
    return _teamMaterials[key];
}

// Input send throttle (see game loop)
const INPUT_SEND_HZ = 30;
const INPUT_SEND_INTERVAL = 1 / INPUT_SEND_HZ;
let _sendAccum = 0;
const _inputPayload = {
    forward: false, backward: false, left: false, right: false, jump: false,
    yaw: 0, pitch: 0, fire: false, weaponId: 'smg', slot: 'sr',
    origin: [0, 0, 0], direction: [0, 0, 0],
};

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

    // Release mic + network on tab close so PeerJS peers and the room are torn down.
    window.addEventListener('beforeunload', () => {
        voiceChat?.dispose();
        socketClient?.disconnect();
        game.dispose();
    });
}

function setState(state) {
    clientState = state;
    console.log(`[Grid War] State: ${state}`);
}

// ─── Play clicked → connect + join (world is built once the server replies) ──
async function onPlayClicked(playerName, teamPref) {
    MainMenu.hide();
    setState('LOADING');

    socketClient = new ColyseusClient();
    snapshotBuffer = new SnapshotBuffer(100);
    localTeam = teamPref || 'blue';

    // The world is built only after the server hands us the authoritative seed and
    // our assigned team, so every client generates the identical city/collision map.
    socketClient.onRoomJoined((data) => {
        localPlayerId = data.playerId;
        if (data.team) localTeam = data.team;
        console.log(`[Grid War] Joined as ${localPlayerId}, team: ${localTeam}, seed: ${data.seed}`);
        buildWorld(data.seed).catch(console.error);
    });

    socketClient.onDisconnect(() => {
        if (clientState !== 'POST_MATCH') showConnectionLost();
    });
    socketClient.onError((err) => {
        console.error('[Grid War] network error', err);
        if (clientState === 'LOADING') showConnectionLost();
    });

    // Register gameplay listeners up front; their handlers guard on IN_MATCH, so a
    // snapshot arriving before the world is built is safely ignored.
    setupNetworkListeners();

    socketClient.connect();
    socketClient.joinRoom(playerName, teamPref);
}

// ─── Build the match world from the server-authoritative seed ────────────────
async function buildWorld(seed) {
    const generator = new CityGenerator(seed);
    cityData = generator.generate();

    await game.loadScene('grid_war');
    game.scene.threeJSScene.add(cityData.group);

    collisionMesh = cityData.collisionMesh;
    collisionMesh.geometry.computeBoundsTree();

    capturePoints = cityData.capturePositions.map((pos, idx) => {
        const cp = new CapturePoint(pos, idx, pos.isBase, pos.team);
        game.scene.threeJSScene.add(cp.getGroup());
        return cp;
    });

    spawnNodeRegistry = new SpawnNode(cityData.spawnNodes);
    tracerPool = new BulletTracerPool(game.scene.threeJSScene);
    HUD.init();

    // Voice chat (best-effort P2P; never blocks the match if mic is denied)
    voiceChat = new VoiceChat();
    voiceChat.init((peerId) => socketClient.setVoicePeerId(peerId));

    // Local player controller (engine KinematicCharacterController)
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
    // Kinematic Rapier body for triggers + server prediction
    const rbDesc = RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(spawnPos.x, spawnPos.y, spawnPos.z);
    const rb = game.scene.rapierWorld.createRigidBody(rbDesc);
    const colDesc = RAPIER.ColliderDesc.capsule(CAPSULE_HALF_HEIGHT, CAPSULE_RADIUS);
    game.scene.rapierWorld.createCollider(colDesc, rb);

    characterController.setRigidBody(rb);
    characterController.position.copy(spawnPos);

    setState('IN_MATCH');
}

// ─── Connection-lost overlay (dropped socket no longer freezes silently) ─────
function showConnectionLost() {
    setState('DISCONNECTED');
    let el = document.getElementById('connection-lost');
    if (!el) {
        el = document.createElement('div');
        el.id = 'connection-lost';
        el.textContent = 'CONNECTION LOST — refresh to rejoin';
        el.style.cssText =
            'position:fixed;inset:0;display:flex;align-items:center;justify-content:center;' +
            'background:rgba(0,0,0,.85);color:#ff4444;font:700 28px monospace;z-index:9999';
        document.body.appendChild(el);
    }
    el.style.display = 'flex';
}

// ─── Network listeners ──────────────────────────────────────────────────────
function setupNetworkListeners() {
    socketClient.onWorldSnapshot((snap) => {
        // World may not be built yet (snapshots can precede buildWorld) — ignore
        // until we're actually in the match and the scene/controller exist.
        if (clientState !== 'IN_MATCH') return;
        snapshotBuffer.push(snap);

        if (snap.entities) {
            const peerIds = [];
            for (const entity of snap.entities) {
                if (entity.id === localPlayerId) continue;
                updateRemotePlayer(entity);
                if (entity.peerId) {
                    remotePeerIds.set(entity.id, entity.peerId);
                    peerIds.push(entity.peerId);
                }
            }
            if (voiceChat && peerIds.length) voiceChat.connectPeers(peerIds);
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
        if (!characterController) return;
        // Correct horizontal (X/Z) drift only. The server simulates Y on flat ground
        // and has no terrain, so the local terrain-aware controller owns its own Y —
        // reconciling it would yank the player down on every jump (rubber-banding).
        const px = payload.state.position[0];
        const pz = payload.state.position[2];
        const dx = px - characterController.position.x;
        const dz = pz - characterController.position.z;
        if (dx * dx + dz * dz > 0.25) {
            const py = characterController.position.y;
            characterController.position.x = px;
            characterController.position.z = pz;
            const rb = characterController['_rigidBody'];
            if (rb) rb.setTranslation({ x: px, y: py, z: pz }, true);
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
        // Match over — release the mic + all P2P voice connections.
        voiceChat?.dispose();
        voiceChat = null;
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
function createRemotePlayerMesh(id, team = 'red') {
    // Guard against double-creation: a WORLD_SNAPSHOT can lazily create a mesh
    // before PLAYER_JOINED fires, which would otherwise orphan the first mesh.
    if (remotePlayers.has(id)) return;
    const mesh = new THREE.Mesh(remoteGeometry(), teamMaterial(team));
    mesh.name = `remote_${id}`;
    game.scene.threeJSScene.add(mesh);
    remotePlayers.set(id, mesh);
}

function updateRemotePlayer(snap) {
    let mesh = remotePlayers.get(snap.id);
    if (!mesh) {
        createRemotePlayerMesh(snap.id, snap.team);
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
        // Team material (shared, swapped by reference — no per-frame color mutation)
        const mat = teamMaterial(snap.team);
        if (mesh.material !== mat) mesh.material = mat;
    }
}

function removeRemotePlayer(id) {
    const mesh = remotePlayers.get(id);
    if (mesh) {
        game.scene.threeJSScene.remove(mesh);
        // Geometry + materials are shared across all remotes — do NOT dispose here.
        remotePlayers.delete(id);
    }
    // Tear down the leaver's voice call + <audio> element (PeerJS 'close' may never fire).
    const peerId = remotePeerIds.get(id);
    if (peerId) {
        voiceChat?.dropPeer(peerId);
        remotePeerIds.delete(id);
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

    // ─── Map overlay (M key — edge-detected so it toggles once per press) ──
    const mDown = game.inputManager.isKeyDown('m');
    if (mDown && !mWasDown) {
        MapOverlay.toggle();
    }
    mWasDown = mDown;

    // ─── Tab for scoreboard ────────────────────────────────────────────
    if (game.inputManager.isKeyDown('tab')) {
        Scoreboard.show();
    } else {
        Scoreboard.hide();
    }

    // ─── Send input to server (fixed rate, reused payload) ─────────────
    // Render runs at up to 144 Hz; the server simulates at 60 Hz and keeps only
    // the latest input. Sending every frame is pure waste + GC churn, so throttle
    // to INPUT_SEND_HZ and reuse one payload object/arrays.
    _sendAccum += dt;
    if (socketClient && socketClient.isConnected && _sendAccum >= INPUT_SEND_INTERVAL) {
        _sendAccum = 0;
        const im = game.inputManager;
        const p = _inputPayload;
        p.forward = im.isKeyDown('w');
        p.backward = im.isKeyDown('s');
        p.left = im.isKeyDown('a');
        p.right = im.isKeyDown('d');
        p.jump = im.isKeyDown(' ');
        p.yaw = characterController ? characterController.yaw : 0;
        p.pitch = characterController ? characterController.pitch : 0;
        p.fire = firePendingThisFrame;
        p.weaponId = activeSlot === 'sr' ? srWeaponId : hrWeaponId;
        p.slot = activeSlot;
        camera.getWorldDirection(_rayDir);
        p.origin[0] = camera.position.x; p.origin[1] = camera.position.y; p.origin[2] = camera.position.z;
        p.direction[0] = _rayDir.x; p.direction[1] = _rayDir.y; p.direction[2] = _rayDir.z;
        socketClient.sendInput(p);
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
