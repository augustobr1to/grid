import { Client, Room } from '@colyseus/core';
import type { InputSnapshot } from '@thegridcn/shared';
import { GridRoomState, PlayerState } from './schema';

const FIXED_DT = 1 / 60;
const MOVE_SPEED = 8;
const MAX_PLAYERS = 32;

export class GridRoom extends Room<{ state: GridRoomState }> {
  maxClients = MAX_PLAYERS;
  private readonly pendingInputs = new Map<string, InputSnapshot>();
  private readonly clientsById = new Map<string, Client>();

  onCreate(): void {
    this.setState(new GridRoomState());
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
  }

  onLeave(client: Client): void {
    this.pendingInputs.delete(client.sessionId);
    this.state.players.delete(client.sessionId);
    this.clientsById.delete(client.sessionId);
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

      const length = Math.hypot(dx, dz) || 1;
      player.x += (dx / length) * MOVE_SPEED * FIXED_DT;
      player.z += (dz / length) * MOVE_SPEED * FIXED_DT;
      player.qy = Math.sin(yaw / 2);
      player.qw = Math.cos(yaw / 2);
      player.pitch = clamp(input.pitch, -Math.PI / 2, Math.PI / 2);
      player.lastProcessedSeq = input.seq;

      // Authoritative correction for the player's own prediction.
      const client = this.clientsById.get(sessionId);
      if (client) {
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
  if (input.origin !== undefined && !(Array.isArray(input.origin) && input.origin.length === 3)) {
    return false;
  }
  if (input.direction !== undefined && !(Array.isArray(input.direction) && input.direction.length === 3)) {
    return false;
  }
  return true;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
