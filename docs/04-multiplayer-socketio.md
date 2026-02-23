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
  shared/src/
    types.ts            ← InputSnapshot, WorldSnapshot, PlayerInfo, ReconcilePayload

  engine/src/network/
    NetworkManager.ts   ← client-side Socket.IO wrapper
    Snapshot.ts         ← serialisation helpers (types imported from @tge/shared)
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

> **Engine-level baseline only.** The events above are the minimum required by the `NetworkManager`. Game-specific events (e.g. `ARSENAL_EQUIP`, `RESUPPLY_REQ`, `HIT`, `KILL`) are defined and documented in [`docs/09-example-game.md § Networking`](09-example-game.md).

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
// Shared between client and server.
// Defined in packages/shared/src/types.ts (mandated — see § Shared Types Strategy below).

interface InputSnapshot {
  seq:       number;     // monotonically increasing per client
  forward:   boolean;
  backward:  boolean;
  left:      boolean;
  right:     boolean;
  jump:      boolean;
  yaw:       number;     // camera yaw in radians
  pitch:     number;     // camera pitch in radians
  fire:      boolean;    // trigger intent this tick
  weaponId:  string;     // currently equipped weapon
  slot:     'sr' | 'hr'; // current active slot
  origin:   [number, number, number]; // camera world position (clamped server-side)
  direction:[number, number, number]; // normalised camera forward vector
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
  seq:   number;             // last processed input sequence
  state: EntityState;
}
```

> **Extending for game-specific data:** The `WorldSnapshot` above is the **engine-level base schema**. Games with richer state (teams, health, capture points, weapon slots) should define a game-level snapshot type that composes or extends this base. For example, Grid War's `WorldSnapshot` adds `players: PlayerSnap[]` and `points: PointSnap[]` alongside the base `entities` array. See [`docs/09-example-game.md` § Networking](09-example-game.md).

### Shared Types Strategy

The types above must be identical on client and server. **This project strictly mandates Approach A (`packages/shared` workspace)** to prevent drift.

| Approach | Pros | Cons |
|---|---|---|
| **A. `packages/shared` workspace** (Mandated) | Single source of truth, type-checked imports | Extra package maintenance |

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

> **Transport:** Always configure the client to use WebSocket-only transport to avoid the HTTP long-polling upgrade phase (200–500ms of latency):
> ```typescript
> const socket = io(serverURL, { transports: ['websocket'] });
> ```

### Integration in Game

```typescript
const game = new Game('/assets', {
  networkOptions: { serverURL: 'http://localhost:3333', autoConnect: true }
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

1. Every frame, record the `InputSnapshot` (including a `seq` number).
2. Apply the input immediately to the local `RigidBodyComponent` (predictive).
3. Save `{ seq, stateAfterInput }` in a ring buffer.
4. When a `RECONCILE` message arrives, find the saved state for that `seq`.
5. If the server's `state.position` differs by more than a threshold (**0.5 units** — large enough to avoid constant corrections, small enough to catch cheating), re-apply all unacknowledged inputs from that point forward.

> **Tuning:** The 0.5-unit threshold is a starting point. Lower values (0.1) provide tighter sync but cause more corrections on high-latency connections. Higher values (1.0+) feel smoother but allow noticeable desync.

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

http.listen(3333);
```

### `GameRoom`

```typescript
class GameRoom {
  readonly roomId: string;

  constructor(roomId: string, io: Server);

  addPlayer(socket: Socket, info: PlayerInfo): void;
  removePlayer(playerId: string): void;
  handleInput(playerId: string, input: InputSnapshot): void;

  // 60 Hz physics loop
  physicsTick(): void;

  // 20 Hz state broadcast
  snapshotTick(): void;

  // Broadcast WorldSnapshot to all sockets in this room
  private broadcastSnapshot(): void;
}
```

**Server tick loop (decoupled physics + snapshot):**
```typescript
const PHYSICS_HZ = 60;
const SNAPSHOT_HZ = 20;
const PHYSICS_DT = 1 / PHYSICS_HZ;

// Physics runs at 60 Hz via a tight setInterval
setInterval(() => room.physicsTick(), 1000 / PHYSICS_HZ);

// Snapshot broadcast runs at 20 Hz
setInterval(() => room.snapshotTick(), 1000 / SNAPSHOT_HZ);

/* 
Inside physicsTick():
  1. Consume all queued InputSnapshots
  2. Apply inputs to each player's RigidBody
  3. Step Rapier (fixed 1/60 s)

Inside snapshotTick():
  1. Build WorldSnapshot from all RigidBody states
  2. Broadcast snapshot to all sockets in room
  3. Emit RECONCILE to each player with their last processed seq
*/
```

> **Why two intervals?** Physics must run at 60 Hz for deterministic consistency with the client. Snapshot broadcasting at 60 Hz would waste bandwidth — 20 Hz is sufficient because the client interpolates between snapshots.

> **Production note: setInterval drift.** Node.js `setInterval` can fire late under CPU load, causing the physics rate to drift — a well-known multiplayer engine problem. For production robustness, replace `setInterval` with a **drift-correcting loop**: measure actual elapsed time via `performance.now()` on each call within the physics loop and step Rapier by the true delta, while never stepping more than 200 ms of accumulated time to avoid the "spiral of death" on lag spikes. Reference: [Gaffer on Games — Fix Your Timestep](https://gafferongames.com/post/fix_your_timestep/).

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
    "@tge/shared": "file:../packages/shared",
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

---

## Security Considerations

For a multiplayer FPS, server authority is the primary defence. The following rules apply:

### Input validation

- **Clients never send position.** The server computes all positions from input intents (`InputSnapshot`). If a client message contains a position field, the server ignores it.
- **Clamp all input values.** `yaw` and `pitch` are clamped to `[-π, π]` and `[-π/2, π/2]` respectively. Boolean fields must be actual booleans; reject nonsense payloads.
- **`seq` must be monotonically increasing.** If a client sends a `seq` lower than the last processed value, discard the message.

### Rate limiting

- **Per-event rate limits.** The server tracks the timestamp of each event type per socket:
  - `PLAYER_INPUT`: max 120/sec (2× the expected render rate).
  - `PLAYER_INPUT` with `fire: true`: validated against `player.lastFiredAt`; rejects shots faster than `(1000 / fireRateHz) × 0.8` — no separate rate-limit counter needed.
  - `ARSENAL_EQUIP`: max 2/sec.
  - `RESUPPLY_REQ`: max 1/sec.
- Messages exceeding the limit are silently discarded. Persistent abuse (>5 violations in 10 seconds) disconnects the socket.

### CORS

- Development: `cors: { origin: '*' }` is acceptable.
- **Production:** Lock `origin` to the game's deployment domain(s):
  ```typescript
  const io = new Server(http, {
    cors: { origin: ['https://yourgame.example.com'] },
    transports: ['websocket'],  // skip long-polling
  });
  ```

### Fire validation (server-side)

- When `input.fire === true` on an `InputSnapshot`, the server validates `player.lastFiredAt` against the weapon's fire rate. Inputs arriving faster than `(1000 / fireRateHz) × 0.8` (20% tolerance for network jitter) are rejected.
- All damage, kills, and ammo deductions are server-computed. The client's `fire: true` flag is an **intent**, not a command.

---

## Connection Lifecycle

### Client-side reconnection

`NetworkManager` should handle disconnects gracefully:

1. **Detection:** Socket.IO fires `disconnect` when the connection drops. The `NetworkManager` emits its own `disconnected` event.
2. **UI feedback:** The game should display a "Reconnecting..." overlay (not handled by the engine — this is game-level UI).
3. **Reconnection:** Socket.IO's built-in auto-reconnect (`reconnection: true`, default) attempts reconnection with exponential backoff (1s, 2s, 4s, capped at 30s).
4. **Rejoin:** On `connect`, the client must re-emit `JOIN_ROOM` with the same `roomId`. The server should recognise the `playerId` and restore the player's state rather than creating a new entity.
5. **State reconciliation:** After rejoin, the server sends a full `WorldSnapshot`. The client resets its interpolation buffer and prediction history.
6. **Timeout:** If reconnection fails after 60 seconds, the client should return to the main menu.

```typescript
// Recommended client config
const socket = io(serverURL, {
  transports: ['websocket'],   // skip HTTP long-polling
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 30000,
});
```

### Server-side disconnect handling

- On `disconnect`, the server keeps the player entity alive for 30 seconds (grace period for reconnection).
- If the player reconnects within the grace period, their entity is reassigned to the new socket.
- If the grace period expires, the entity is removed and `PLAYER_LEFT` is broadcast.