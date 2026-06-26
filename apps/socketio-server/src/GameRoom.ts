/**
 * GameRoom — per-room authoritative physics simulation.
 * Runs physics at 60 Hz and broadcasts snapshots at 20 Hz.
 */
import { Server, Socket } from 'socket.io';
import RAPIER from '@dimforge/rapier3d-compat';
import type { InputSnapshot, PlayerInfo, ReconcilePayload } from '@thegridcn/shared';
import { buildWorldSnapshot } from './Snapshot';

const PHYSICS_HZ = 60;
const SNAPSHOT_HZ = 20;
const PHYSICS_DT = 1 / PHYSICS_HZ;

interface PlayerEntity {
    playerId: string;
    playerName: string;
    socket: Socket;
    rigidBody: RAPIER.RigidBody;
    lastInput: InputSnapshot | null;
    lastProcessedSeq: number;
    lastFiredAt: number;
    disconnectedAt: number | null;
}

export default class GameRoom {
    readonly roomId: string;
    private _io: Server;
    private _world!: RAPIER.World;
    private _players: Map<string, PlayerEntity> = new Map();
    private _entities: Map<string, { rigidBody: RAPIER.RigidBody }> = new Map();
    private _physicsInterval: ReturnType<typeof setInterval> | null = null;
    private _snapshotInterval: ReturnType<typeof setInterval> | null = null;
    private _tick = 0;

    constructor(roomId: string, io: Server) {
        this.roomId = roomId;
        this._io = io;
    }

    async init(): Promise<void> {
        await RAPIER.init();
        this._world = new RAPIER.World(new RAPIER.Vector3(0, -9.8, 0));

        // Start tick loops
        this._physicsInterval = setInterval(() => this.physicsTick(), 1000 / PHYSICS_HZ);
        this._snapshotInterval = setInterval(() => this.snapshotTick(), 1000 / SNAPSHOT_HZ);
    }

    addPlayer(socket: Socket, info: { playerName: string; teamPref?: string }): string {
        const playerId = socket.id;

        // Create a kinematic rigid body for the player
        const rbDesc = RAPIER.RigidBodyDesc.kinematicPositionBased()
            .setTranslation(0, 1.7, 0);
        const rigidBody = this._world.createRigidBody(rbDesc);

        // Create capsule collider
        const colDesc = RAPIER.ColliderDesc.capsule(0.5, 0.35);
        this._world.createCollider(colDesc, rigidBody);

        const entity: PlayerEntity = {
            playerId,
            playerName: info.playerName,
            socket,
            rigidBody,
            lastInput: null,
            lastProcessedSeq: 0,
            lastFiredAt: 0,
            disconnectedAt: null,
        };

        this._players.set(playerId, entity);
        this._entities.set(playerId, { rigidBody });

        // Join socket.io room
        socket.join(this.roomId);

        // Send ROOM_JOINED
        const peers: PlayerInfo[] = [];
        for (const [id, p] of this._players) {
            if (id !== playerId) {
                peers.push({ playerId: id, playerName: p.playerName, entityId: id });
            }
        }

        socket.emit('ROOM_JOINED', {
            playerId,
            tick: this._tick,
            peers,
        });

        // Broadcast PLAYER_JOINED to others
        socket.to(this.roomId).emit('PLAYER_JOINED', {
            playerId,
            playerName: info.playerName,
            entityId: playerId,
        });

        return playerId;
    }

    removePlayer(playerId: string): void {
        const entity = this._players.get(playerId);
        if (entity) {
            this._world.removeRigidBody(entity.rigidBody);
            this._players.delete(playerId);
            this._entities.delete(playerId);
            entity.socket.leave(this.roomId);

            this._io.to(this.roomId).emit('PLAYER_LEFT', { playerId });
        }
    }

    handleInput(playerId: string, input: InputSnapshot): void {
        const entity = this._players.get(playerId);
        if (!entity) return;

        // Validate seq is monotonically increasing
        if (input.seq <= entity.lastProcessedSeq) return;

        // Clamp yaw and pitch
        input.yaw = Math.max(-Math.PI, Math.min(Math.PI, input.yaw));
        input.pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, input.pitch));

        entity.lastInput = input;
    }

    physicsTick(): void {
        this._tick++;

        // Process all queued inputs
        for (const [, entity] of this._players) {
            const input = entity.lastInput;
            if (!input) continue;

            // Compute desired movement from input
            const speed = 8;
            const yaw = input.yaw;
            let dx = 0, dz = 0;

            const forwardX = Math.sin(yaw);
            const forwardZ = Math.cos(yaw);
            const rightX = Math.cos(yaw);
            const rightZ = -Math.sin(yaw);

            if (input.forward) { dx -= forwardX * speed; dz -= forwardZ * speed; }
            if (input.backward) { dx += forwardX * speed; dz += forwardZ * speed; }
            if (input.left) { dx -= rightX * speed; dz -= rightZ * speed; }
            if (input.right) { dx += rightX * speed; dz += rightZ * speed; }

            const t = entity.rigidBody.translation();
            entity.rigidBody.setNextKinematicTranslation({
                x: t.x + dx * PHYSICS_DT,
                y: t.y,
                z: t.z + dz * PHYSICS_DT,
            });

            entity.lastProcessedSeq = input.seq;
        }

        // Step physics
        this._world.step();
    }

    snapshotTick(): void {
        const snapshot = buildWorldSnapshot(this._entities);

        // Broadcast to all in room
        this._io.to(this.roomId).emit('WORLD_SNAPSHOT', snapshot);

        // Send reconcile for each player
        for (const [, entity] of this._players) {
            if (entity.lastProcessedSeq > 0) {
                const t = entity.rigidBody.translation();
                const r = entity.rigidBody.rotation();
                const reconcile: ReconcilePayload = {
                    seq: entity.lastProcessedSeq,
                    state: {
                        id: entity.playerId,
                        position: [t.x, t.y, t.z],
                        quaternion: [r.x, r.y, r.z, r.w],
                        velocity: [0, 0, 0],
                    },
                };
                entity.socket.emit('RECONCILE', reconcile);
            }
        }
    }

    get playerCount(): number {
        return this._players.size;
    }

    dispose(): void {
        if (this._physicsInterval) clearInterval(this._physicsInterval);
        if (this._snapshotInterval) clearInterval(this._snapshotInterval);
        this._world.free();
        this._players.clear();
        this._entities.clear();
    }
}
