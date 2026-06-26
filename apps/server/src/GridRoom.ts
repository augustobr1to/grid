import { Client, Room } from '@colyseus/core';
import type { InputSnapshot } from '@thegridcn/shared';
import { GridRoomState, PlayerState } from './schema';

const FIXED_DT = 1 / 60;
const MOVE_SPEED = 8;
const MAX_PLAYERS = 32;

export class GridRoom extends Room<{ state: GridRoomState }> {
  maxClients = MAX_PLAYERS;
  private readonly pendingInputs = new Map<string, InputSnapshot>();

  onCreate(): void {
    this.setState(new GridRoomState());
    this.setSimulationInterval(() => this.fixedUpdate(), FIXED_DT * 1000);

    this.onMessage('input', (client, input: InputSnapshot) => {
      if (!isValidInput(input)) return;
      const player = this.state.players.get(client.sessionId);
      if (!player || input.seq <= player.lastProcessedSeq) return;
      this.pendingInputs.set(client.sessionId, input);
    });
  }

  onJoin(client: Client, options: { name?: string } = {}): void {
    const player = new PlayerState();
    player.id = client.sessionId;
    player.name = options.name?.slice(0, 32) || `Player ${this.state.players.size + 1}`;
    player.x = (this.state.players.size % 8) * 2;
    player.z = Math.floor(this.state.players.size / 8) * 2;
    this.state.players.set(client.sessionId, player);
  }

  onLeave(client: Client): void {
    this.pendingInputs.delete(client.sessionId);
    this.state.players.delete(client.sessionId);
  }

  private fixedUpdate(): void {
    this.state.tick += 1;
    this.state.serverTime = Date.now();

    for (const [sessionId, input] of this.pendingInputs) {
      const player = this.state.players.get(sessionId);
      if (!player) continue;

      const yaw = clamp(input.yaw, -Math.PI, Math.PI);
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
      player.lastProcessedSeq = input.seq;
    }

    this.pendingInputs.clear();
  }
}

function isValidInput(input: InputSnapshot): boolean {
  return Boolean(
    input &&
      Number.isFinite(input.seq) &&
      Number.isFinite(input.yaw) &&
      Number.isFinite(input.pitch) &&
      Array.isArray(input.origin) &&
      input.origin.length === 3 &&
      Array.isArray(input.direction) &&
      input.direction.length === 3
  );
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
