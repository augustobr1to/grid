# 04 – Multiplayer (Socket.IO)

## Design Philosophy

The multiplayer layer uses an **authoritative server** model:

- The **server** owns the simulation truth. It runs a headless physics tick (Rapier Node.js WASM), broadcasts world state snapshots to all connected clients at a fixed rate (20 Hz default).
- Each **client** sends its own input/intent to the server every frame; it does **not** trust its own physics results for other players.
- The client side does **snapshot interpolation** of remote entities (renders between the two most recent server snapshots) and **client-side prediction** for the local player (applies input immediately, then reconciles against the server's confirmed state).

---

## Package Layout

```
packages/
  engine/src/network/
    NetworkManager.ts   ← client-side Socket.IO wrapper
    Snapshot.ts         ← shared types & serialisation helpers
    Interpolator.ts     ← smooth remote entity rendering

server/                 ← NEW top-level folder (not a Yarn workspace package)
  package.json
  tsconfig.json
  src/
    index.ts            ← Express + Socket.IO server entry point
    GameRoom.ts         ← per-room authoritative physics simulation
    RoomManager.ts      ← manages multiple concurrent rooms
    Snapshot.ts         ← server-side snapshot building
    types.ts
```

> The `server/` folder is excluded from the Yarn workspaces array. It is built and run separately (`node dist/index.js`).

---

## Message Protocol

All messages are plain JSON objects. The `type` field is the discriminator.

### Client → Server

| Message type | Payload | Description |
|---|---|---|
| `JOIN_ROOM` | `{ roomId: string, playerName: string }` | Join or create a game room |
| `PLAYER_INPUT` | `InputSnapshot` | Sent every client frame |
| `LEAVE_ROOM` | `{}` | Graceful disconnect |

### Server → Client

| Message type | Payload | Description |
|---|---|---|
| `ROOM_JOINED` | `{ playerId: string, tick: number, peers: PlayerInfo[] }` | Acknowledgement |
| `WORLD_SNAPSHOT` | `WorldSnapshot` | Broadcast 20×/sec |
| `PLAYER_JOINED` | `PlayerInfo` | New peer entered the room |
| `PLAYER_LEFT` | `{ playerId: string }` | Peer disconnected |
| `RECONCILE` | `ReconcilePayload` | Server correction for local player |

---

## Type Definitions

```typescript
// Shared between client and server (keep in sync or extract to a shared package)

interface InputSnapshot {
  tick:            number;
  sequenceNumber:  number;   // monotonically increasing per client
  vertical:        number;   // -1.0 to +1.0
  horizontal:      number;   // -1.0 to +1.0
  jump:            boolean;
  cameraYaw:       number;   // radians
}

interface EntityState {
  id:         string;        // gameObject UUID
  position:   [number, number, number];
  quaternion: [number, number, number, number];
  velocity:   [number, number, number];
}

interface WorldSnapshot {
  tick:        number;
  timestamp:   number;       // server Date.now()
  entities:    EntityState[];
}

interface PlayerInfo {
  playerId:   string;
  playerName: string;
  entityId:   string;        // gameObject UUID this player controls
}

interface ReconcilePayload {
  sequenceNumber: number;    // last processed input sequence
  state:          EntityState;
}
```

---

## `NetworkManager` (client)

```typescript
// packages/engine/src/network/NetworkManager.ts

class NetworkManager {
  constructor(options: NetworkOptions);

  connect(): void;
  disconnect(): void;

  joinRoom(roomId: string, playerName: string): Promise<void>;
  leaveRoom(): void;

  sendInput(input: InputSnapshot): void;

  // Events
  on(event: 'worldSnapshot',  cb: (snap: WorldSnapshot) => void): void;
  on(event: 'playerJoined',   cb: (info: PlayerInfo) => void): void;
  on(event: 'playerLeft',     cb: (id: string) => void): void;
  on(event: 'reconcile',      cb: (payload: ReconcilePayload) => void): void;
  on(event: 'connected',      cb: () => void): void;
  on(event: 'disconnected',   cb: () => void): void;

  off(event: string, cb: (...args: unknown[]) => void): void;

  readonly isConnected: boolean;
  readonly localPlayerId: string | null;
}
```

### Integration in Game

```typescript
const game = new Game('/assets', {
  networkOptions: { serverURL: 'http://localhost:3000', autoConnect: true }
});

await game._init();

game.networkManager.on('worldSnapshot', (snap) => {
  // Hand snapshot to Interpolator
  game.scene?.applyWorldSnapshot(snap);
});

game.networkManager.on('playerJoined', (info) => {
  // Spawn a remote player GameObject
  game.scene?.addGameObject({ type: 'remotePlayer', name: info.playerId });
});
```

---

## `Interpolator` (client)

The interpolator buffers the last N (`N=3` default) `WorldSnapshot` objects and on each render tick returns an interpolated `EntityState` for a given entity.

```typescript
class Interpolator {
  constructor(options?: { bufferSizeMs?: number });  // default 100ms buffer

  pushSnapshot(snapshot: WorldSnapshot): void;

  // Returns the interpolated state at (Date.now() - bufferSizeMs)
  getInterpolatedState(entityId: string): EntityState | null;
}
```

**Algorithm:**
1. Receive snapshot; push to a time-sorted ring buffer.
2. Compute `renderTimestamp = now - bufferSizeMs`.
3. Find the two snapshots bracketing `renderTimestamp` (one before, one after).
4. Linear-interpolate `position`; spherical-linear-interpolate (slerp) `quaternion`.
5. Return interpolated `EntityState`.

---

## Client-Side Prediction & Reconciliation

For the **local player** only:

1. Every frame, record the `InputSnapshot` (including a `sequenceNumber`).
2. Apply the input immediately to the local `RigidBodyComponent` (predictive).
3. Save `{ sequenceNumber, stateAfterInput }` in a ring buffer.
4. When a `RECONCILE` message arrives, find the saved state for that `sequenceNumber`.
5. If the server's `state.position` differs by more than a threshold (0.05 units), re-apply all unacknowledged inputs from that point forward.

---

## Server Architecture

```typescript
// server/src/index.ts

import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import RoomManager from './RoomManager';

const app  = express();
const http = createServer(app);
const io   = new Server(http, { cors: { origin: '*' } });

const rooms = new RoomManager(io);

io.on('connection', socket => {
  socket.on('JOIN_ROOM',    data => rooms.joinRoom(socket, data));
  socket.on('PLAYER_INPUT', data => rooms.handleInput(socket, data));
  socket.on('LEAVE_ROOM',   ()   => rooms.leaveRoom(socket));
  socket.on('disconnect',   ()   => rooms.handleDisconnect(socket));
});

http.listen(3000);
```

### `GameRoom`

```typescript
class GameRoom {
  readonly roomId: string;

  constructor(roomId: string, io: Server);

  addPlayer(socket: Socket, info: PlayerInfo): void;
  removePlayer(playerId: string): void;
  handleInput(playerId: string, input: InputSnapshot): void;

  // Called at fixed 50ms interval (20 Hz)
  tick(): void;

  // Broadcast WorldSnapshot to all sockets in this room
  private broadcastSnapshot(): void;
}
```

**Server tick loop:**
```typescript
setInterval(() => room.tick(), 50); // 20 Hz

tick() {
  // 1. Consume all queued InputSnapshots for this tick
  // 2. Apply inputs to each player's RigidBody in the Rapier world
  // 3. Step Rapier: this.rapierWorld.step()
  // 4. Build WorldSnapshot from all RigidBody states
  // 5. Broadcast snapshot to all sockets in room
  // 6. Emit RECONCILE to each player with their last processed seq number
}
```

---

## Server `package.json`

```json
{
  "name": "@tge/server",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev":   "tsx watch src/index.ts",
    "build": "tsc --project tsconfig.json",
    "start": "node dist/index.js"
  },
  "dependencies": {
    "@dimforge/rapier3d-compat": "^0.11.2",
    "express": "^4.18.0",
    "socket.io": "^4.7.0"
  },
  "devDependencies": {
    "typescript": "^5.2.2",
    "tsx": "^4.0.0",
    "@types/express": "^4.17.0",
    "@types/node": "^20.0.0"
  }
}
```