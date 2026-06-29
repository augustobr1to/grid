import { Client, Room } from '@colyseus/core';
import type { InputSnapshot } from '@thegridcn/shared';
import { GridRoomState, PlayerState } from './schema';

const FIXED_DT = 1 / 60;
const MOVE_SPEED = 8;
const MAX_PLAYERS = 32;
// Vertical sim — must match the client's KinematicCharacterController constants so
// remote players see jumps that line up with what the jumping client predicts.
const REST_Y = 1.7;
const JUMP_FORCE = 8;
const GRAVITY = 20;
// PeerJS ids are uuid-ish: hex, dashes, and the occasional underscore. Reject
// anything else so a client cannot force peers to dial an arbitrary string.
const PEER_ID_RE = /^[a-zA-Z0-9_-]{1,64}$/;

export class GridRoom extends Room<GridRoomState> {
  maxClients = MAX_PLAYERS;
  private readonly pendingInputs = new Map<string, InputSnapshot>();
  private readonly clientsById = new Map<string, Client>();
  /** Per-player vertical velocity (server-internal; not part of synced schema). */
  private readonly verticalVel = new Map<string, number>();

  onCreate(): void {
    const state = new GridRoomState();
    state.seed = Math.floor(Math.random() * 1_000_000_000);
    this.setState(state);
    this.setSimulationInterval(() => this.fixedUpdate(), FIXED_DT * 1000);

    this.onMessage('input', (client, input: InputSnapshot) => {
      if (!isValidInput(input)) return;
      const player = this.state.players.get(client.sessionId);
      if (!player || input.seq <= player.lastProcessedSeq) return;
      this.pendingInputs.set(client.sessionId, input);
    });

    // Loadout / resupply: accepted but unsimulated for now (parity with prior
    // server). Registered as no-ops so Colyseus does not warn on these messages.
    this.onMessage('ARSENAL_EQUIP', () => {});
    this.onMessage('RESUPPLY_REQ', () => {});

    // Voice: broker each client's PeerJS id through room state so peers can call
    // each other directly (P2P WebRTC). The server only relays the id.
    this.onMessage('voice-peer', (client, payload: { peerId?: string }) => {
      const player = this.state.players.get(client.sessionId);
      if (player && typeof payload?.peerId === 'string' && PEER_ID_RE.test(payload.peerId)) {
        player.peerId = payload.peerId;
      }
    });
  }

  onJoin(client: Client, options: { name?: string; team?: string } = {}): void {
    const player = new PlayerState();
    player.id = client.sessionId;
    player.name = options.name?.slice(0, 32) || `Player ${client.sessionId.slice(0, 6)}`;
    player.team = options.team === 'red' ? 'red' : 'blue';
    player.x = (this.state.players.size % 8) * 2;
    player.z = Math.floor(this.state.players.size / 8) * 2;
    this.state.players.set(client.sessionId, player);
    this.clientsById.set(client.sessionId, client);
    this.verticalVel.set(client.sessionId, 0);
  }

  onLeave(client: Client): void {
    this.pendingInputs.delete(client.sessionId);
    this.state.players.delete(client.sessionId);
    this.clientsById.delete(client.sessionId);
    this.verticalVel.delete(client.sessionId);
  }

  private fixedUpdate(): void {
    this.state.tick += 1;
    this.state.serverTime = Date.now();

    for (const [sessionId, input] of this.pendingInputs) {
      const player = this.state.players.get(sessionId);
      if (!player) continue;

      // Wrap yaw into [-π, π] instead of clamping — clamping diverged from the
      // client's unbounded yaw past ±180° and caused reconcile rubber-banding.
      const yaw = wrapAngle(input.yaw);
      const forwardX = Math.sin(yaw);
      const forwardZ = Math.cos(yaw);
      const rightX = Math.cos(yaw);
      const rightZ = -Math.sin(yaw);

      let dx = 0;
      let dz = 0;
      if (input.forward) {
        dx -= forwardX;
        dz -= forwardZ;
      }
      if (input.backward) {
        dx += forwardX;
        dz += forwardZ;
      }
      if (input.left) {
        dx -= rightX;
        dz -= rightZ;
      }
      if (input.right) {
        dx += rightX;
        dz += rightZ;
      }

      // Only horizontal motion is driven by input here; gravity/jump is integrated
      // for every player below so airborne players keep falling without input.
      const moving = dx !== 0 || dz !== 0;
      if (moving) {
        const length = Math.hypot(dx, dz);
        player.x += (dx / length) * MOVE_SPEED * FIXED_DT;
        player.z += (dz / length) * MOVE_SPEED * FIXED_DT;
      }
      player.qy = Math.sin(yaw / 2);
      player.qw = Math.cos(yaw / 2);
      player.pitch = clamp(input.pitch, -Math.PI / 2, Math.PI / 2);
      player.lastProcessedSeq = input.seq;
    }

    // Vertical simulation — flat-ground jump + gravity for every player. The server
    // has no terrain, so this is a planar approximation; the local client owns its
    // own terrain-aware Y (reconcile corrects X/Z only). It exists so OTHER clients
    // see a player's jump arc rather than a body glued to rest height.
    for (const [sessionId, player] of this.state.players) {
      let vy = this.verticalVel.get(sessionId) ?? 0;
      if (player.y <= REST_Y + 1e-4) {
        player.y = REST_Y;
        vy = this.pendingInputs.get(sessionId)?.jump ? JUMP_FORCE : 0;
      }
      vy -= GRAVITY * FIXED_DT;
      player.y += vy * FIXED_DT;
      if (player.y < REST_Y) {
        player.y = REST_Y;
        vy = 0;
      }
      this.verticalVel.set(sessionId, vy);
    }

    // Authoritative correction for each acting player's own prediction. Sent after
    // vertical sim so the y in the payload matches this tick's integrated position.
    for (const sessionId of this.pendingInputs.keys()) {
      const player = this.state.players.get(sessionId);
      const client = this.clientsById.get(sessionId);
      if (player && client) {
        client.send('reconcile', {
          seq: player.lastProcessedSeq,
          state: { id: player.id, position: [player.x, player.y, player.z] },
        });
      }
    }

    this.pendingInputs.clear();
  }
}

function wrapAngle(value: number): number {
  const twoPi = Math.PI * 2;
  return value - twoPi * Math.floor((value + Math.PI) / twoPi);
}

function isValidInput(input: InputSnapshot): boolean {
  if (!input) return false;
  if (!Number.isFinite(input.seq) || !Number.isFinite(input.yaw) || !Number.isFinite(input.pitch)) {
    return false;
  }
  if (input.origin !== undefined && !isFiniteVec3(input.origin)) return false;
  if (input.direction !== undefined && !isFiniteVec3(input.direction)) return false;
  return true;
}

function isFiniteVec3(v: unknown): v is [number, number, number] {
  return Array.isArray(v) && v.length === 3 && v.every((n) => Number.isFinite(n));
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
