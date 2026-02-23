# 09 — Example Game: Grid War

> **Document type:** Design & implementation specification
> **Audience:** AI coding agents and human contributors implementing `packages/game`
> **Cross-references:**
> - Architecture — [`docs/01-architecture.md`](01-architecture.md)
> - Packages & folders — [`docs/02-packages-and-folders.md`](02-packages-and-folders.md)
> - Engine API — [`docs/03-engine-api.md`](03-engine-api.md)
> - Multiplayer — [`docs/04-multiplayer-socketio.md`](04-multiplayer-socketio.md)
> - Testing — [`docs/06-testing.md`](06-testing.md)
> - References — [`docs/08-references-and-resources.md`](08-references-and-resources.md)

---

## Table of Contents

1. [Purpose](#1-purpose)
2. [What Grid War Demonstrates](#2-what-grid-war-demonstrates)
3. [Non-Goals](#3-non-goals)
4. [Guiding Principles](#4-guiding-principles)
5. [Package Location and Tooling](#5-package-location-and-tooling)
6. [Folder Structure](#6-folder-structure)
7. [Server Architecture](#7-server-architecture)
8. [Client Bootstrap and State Machine](#8-client-bootstrap-and-state-machine)
9. [Procedural Map — Neon Grid City](#9-procedural-map--neon-grid-city)
10. [ECS Components and Systems](#10-ecs-components-and-systems)
11. [Capture Point System](#11-capture-point-system)
12. [Win Condition and Final Stand Timer](#12-win-condition-and-final-stand-timer)
13. [Lobby, Matchmaking, and Join-in-Progress](#13-lobby-matchmaking-and-join-in-progress)
14. [Teams and Bases](#14-teams-and-bases)
15. [Arsenal, Loadout, and Weapons](#15-arsenal-loadout-and-weapons)
16. [Ammo, Weight, and Resupply](#16-ammo-weight-and-resupply)
17. [Combat — Server-Authoritative Hitscan](#17-combat--server-authoritative-hitscan)
18. [Spawning and Spawn Protection](#18-spawning-and-spawn-protection)
19. [HUD and Map Overlay](#19-hud-and-map-overlay)
20. [Networking — Snapshot Protocol](#20-networking--snapshot-protocol)
21. [Audio Design](#21-audio-design)
22. [Performance Constraints](#22-performance-constraints)
23. [Scene Data Definitions](#23-scene-data-definitions)
24. [Implementation Checklist](#24-implementation-checklist)

---

## 1. Purpose

`packages/game` contains **Grid War** — the reference first-person shooter that ships with Grid Engine. It serves two roles:

1. **Integration test** — exercises every major engine feature end-to-end (rendering, physics, BVH collision, ECS, networking, audio) in a realistic, interactive context.
2. **Learning reference** — shows developers exactly how to wire Grid Engine into a complete game.

Grid War is a **v1.0.0 prototype**. It implements the minimum set of mechanics that produces a playable and fun loop. It is intentionally kept simple so the code remains readable and the AI can generate it without ambiguity.

---

## 2. What Grid War Demonstrates

| Engine Feature | How Grid War Uses It |
|---|---|
| `Game` + `Scene` + `GameObject` lifecycle | City, players, and capture points are all `GameObject` instances inside one `Scene` |
| Three.js `WebGLRenderer` | Procedural neon city rendered at 60 fps with instancing |
| Rapier kinematic character controller | Local player walks, slides on ramps, and respects gravity |
| `three-mesh-bvh` capsule sweep | Player vs. level mesh collision on complex procedural geometry |
| `three-mesh-bvh` accelerated raycast | Server-side hitscan damage validation |
| ECSY `World` / `System` / `Component` | All gameplay logic is structured as ECS systems |
| Howler.js audio sprites | Gunshots, footsteps, reload, capture sounds |
| `THREE.PositionalAudio` | Capture point alarms and enemy gunshots in 3D space |
| Socket.IO authoritative server | Capture logic, damage, spawns, ammo — all server-owned |
| Client-side interpolation | Remote players rendered smoothly at any network tick rate |
| Client-side prediction | Local player movement feels instant regardless of latency |
| Tailwind CSS overlay UI | Main menu, lobby, Arsenal UI, HUD, tactical map, scoreboard |

---

## 3. Non-Goals

The following are **explicitly out of scope** for v1.0.0 and must not be implemented:

- ❌ Spectator mode
- ❌ Persistent accounts or stats
- ❌ Custom match creation
- ❌ Voice chat
- ❌ Dynamic shadows (shadow maps disabled by default)
- ❌ Post-processing effects
- ❌ Weapon pickups from the floor
- ❌ Respawning at captured points (base-only in v1)
- ❌ Melee combat
- ❌ Vehicles
- ❌ External 3D model files — all geometry is procedural

---

## 4. Guiding Principles

These align with the engine's own principles from [`docs/00-overview.md`](00-overview.md):

**KISS** — Every system does one thing. `CaptureSystem` only ticks capture progress; `WeaponSystem` only fires weapons.

**DRY** — All weapon definitions live in `WeaponRegistry.js`. All socket event names are in a shared `Events.js` constant file. No magic strings inline.

**SOLID** — Each ECS `System` has a single `execute(delta)` responsibility. `SocketClient.js` is a thin wrapper with no game logic; game logic never imports from `socket.io-client` directly.

**Server authority** — Every game-changing outcome (damage, capture completion, respawn, ammo grant) is validated and emitted by the server. The client predicts and then reconciles.

**Performance by default** — `InstancedMesh` for city geometry, object pools for tracers, zero per-frame heap allocations in hot paths, `BVH` built once per match.

---

## 5. Package Location and Tooling

Grid War lives at `packages/game` inside the monorepo. See [`docs/02-packages-and-folders.md`](02-packages-and-folders.md) for the full workspace config.

Key constraints for this package:

| Constraint | Value |
|---|---|
| Language | **JavaScript** (`.js`) — not TypeScript |
| Build tool | Vite 5 |
| Dev server port | `5173` |
| Multiplayer server port | `3333` (default; overridable via `PORT` env var) |
| Node version | `18.18.2` (pinned via `mise.toml`) |
| Yarn version | `3.6.3` (pinned via `mise.toml`) |
| `nodeLinker` | `node-modules` (WASM requires it) |

> Client code is intentionally JavaScript, not TypeScript. The engine library (`packages/engine`) is TypeScript and ships `.d.ts` types. The game consumes those types via JSDoc if needed but does not enforce strict compilation.

---

## 6. Folder Structure

```
packages/game/
├── index.html                   ← Tailwind CDN, canvas, HUD shell, overlay panels
├── package.json
├── vite.config.js
│
├── public/
│   └── game.json                ← Grid Engine game manifest
│       scenes/
│       └── grid_war.json        ← scene definition (background, fog, gravity)
│       types/
│       ├── player.json          ← player GameObject type (rigidBody config)
│       ├── remote_player.json   ← remote player type (no physics)
│       ├── capture_point.json   ← capture point type (fixed cylinder collider)
│       └── arsenal.json         ← arsenal zone type
│
└── src/
    ├── main.js                  ← entry: init Game, patch BVH, connect socket
    │
    ├── constants/
    │   └── Events.js            ← all Socket.IO event name constants
    │
    ├── map/
    │   ├── CityGenerator.js     ← seed → procedural THREE.Group city
    │   ├── CapturePoint.js      ← 3D cylinder volume + ring indicator mesh
    │   └── SpawnNode.js         ← precomputed spawn position registry
    │
    ├── ecs/
    │   ├── components/          ← pure data — no logic
    │   │   ├── TransformComponent.js
    │   │   ├── VelocityComponent.js
    │   │   ├── HealthComponent.js
    │   │   ├── WeaponStateComponent.js
    │   │   ├── AmmoComponent.js
    │   │   ├── TeamComponent.js
    │   │   ├── CaptureStateComponent.js
    │   │   ├── SpawnShieldComponent.js
    │   │   ├── RemotePlayerComponent.js
    │   │   └── tags/
    │   │       ├── PlayerTag.js
    │   │       ├── LocalPlayerTag.js
    │   │       ├── EnemyTag.js
    │   │       ├── InArsenalTag.js
    │   │       └── DeadTag.js
    │   └── systems/             ← logic — no state
    │       ├── MovementSystem.js
    │       ├── PhysicsSyncSystem.js
    │       ├── CaptureSystem.js
    │       ├── SpawnShieldSystem.js
    │       ├── WeaponSystem.js
    │       ├── InterpolationSystem.js
    │       ├── AudioSyncSystem.js
    │       └── HUDUpdateSystem.js
    │
    ├── net/
    │   ├── SocketClient.js      ← thin socket.io-client wrapper
    │   ├── SnapshotBuffer.js    ← ring buffer for 100ms interpolation
    │   └── InputQueue.js        ← client-side prediction input log
    │
    ├── weapons/
    │   ├── WeaponRegistry.js    ← all weapon definitions
    │   └── BulletTracer.js      ← pooled tracer geometry (128 line segments)
    │
    ├── player/
    │   ├── LocalPlayer.js       ← capsule, camera, PointerLockControls, input
    │   └── RemotePlayer.js      ← interpolated ghost mesh
    │
    ├── ui/
    │   ├── MainMenu.js          ← name, team preference, settings
    │   ├── LobbyUI.js           ← player counts, seed, join button
    │   ├── ArsenalUI.js         ← weapon + ammo weight selection panel
    │   ├── HUD.js               ← ammo display (minimal)
    │   ├── MapOverlay.js        ← canvas-2D tactical map (M key)
    │   └── Scoreboard.js        ← Tab key, end-of-match results
    │
    └── audio/
        └── SFXManifest.js       ← Howler sprite offsets for all SFX
```

---

## 7. Server Architecture

The multiplayer server is a standalone Node.js process at `server/`. It is **not** part of the Vite build — it runs separately with `npm run dev` inside `server/`.

See [`docs/04-multiplayer-socketio.md`](04-multiplayer-socketio.md) for the full networking model. The server-specific details for Grid War are:

### Default port

```typescript
// server/src/index.ts
const PORT = process.env.PORT || 3333;
```

### Tick rates

```typescript
const TICK_RATE      = 60;   // Hz — physics + capture simulation
const SNAPSHOT_RATE  = 20;   // Hz — broadcast to all clients
const TICK_MS        = 1000 / TICK_RATE;
const SNAPSHOT_EVERY = TICK_RATE / SNAPSHOT_RATE;  // every 3 ticks
```

### Authoritative server responsibilities

The following outcomes are **never trusted from the client** — they are always computed and broadcast by the server:

- Capture progress ticks and contest detection
- Capture route unlock (next objective)
- Win condition evaluation
- Final Stand timer
- Damage application and health deduction
- Kill confirmation and kill feed
- Fire rate validation (reject if too fast)
- Ammo decrement
- Arsenal equip grant
- Resupply grants
- Spawn position assignment
- Spawn shield timers
- Team balance on join
- Match state machine transitions

---

## 8. Client Bootstrap and State Machine

### `src/main.js`

```js
import { Game } from '@tge/engine';
import * as THREE from 'three';
import {
  computeBoundsTree,
  disposeBoundsTree,
  acceleratedRaycast,
} from 'three-mesh-bvh';

// Patch Three.js once at app start — enables BVH on all geometries
THREE.BufferGeometry.prototype.computeBoundsTree = computeBoundsTree;
THREE.BufferGeometry.prototype.disposeBoundsTree = disposeBoundsTree;
THREE.Mesh.prototype.raycast = acceleratedRaycast;

const game = new Game('/assets', {
  rendererOptions: { setupFullScreenCanvas: true },
  inputOptions:    { wsadMovement: true, mouseOptions: { usePointerLock: true } },
  networkOptions:  { serverURL: 'http://localhost:3333', autoConnect: false },
});

await game._init();

// Show main menu; scene loads only after the player clicks Play
import { MainMenu } from './ui/MainMenu.js';
new MainMenu(game).show();
```

### Client state machine

```
MAIN_MENU
    │ (Play clicked)
    ▼
LOBBY
    │ (Join clicked)
    ▼
LOADING         ← CityGenerator runs, BVH built, scene loaded
    │ (scene ready + server SPAWN received)
    ▼
IN_MATCH
    │ (MATCH_END received or disconnect)
    ▼
POST_MATCH      ← Scoreboard shown, then back to LOBBY
```

---

## 9. Procedural Map — Neon Grid City

The city is generated entirely from a **numeric seed** using a deterministic PRNG. The same seed always produces the same city. The server chooses a new seed at the start of each match and sends it to all clients.

### Parameters

```js
// CityGenerator.js — default parameters
const CITY_CONFIG = {
  gridW:          24,       // city block columns
  gridH:          24,       // city block rows
  blockSize:      20,       // metres per block
  streetWidth:    6,        // metres per street
  minBuildHeight: 4,        // metres
  maxBuildHeight: 40,       // metres
  neonColors:     [0x00ffff, 0xff00ff, 0xffff00, 0x00ff88],
};
```

### Generation algorithm

```
1.  Seed a deterministic PRNG (mulberry32).
2.  Create a 2D cell grid; classify each cell as BUILDING or ROAD.
3.  Carve a connected road network (grid streets at regular intervals).
4.  Guarantee ≥3 approach routes to every objective zone
    (main corridor + 2 side alleys) by carving extra paths.
5.  Assign randomised building heights per cell (clamped min/max).
6.  Extrude to 3D:
      ROAD  cells → flat MeshBasicMaterial plane, dark grey.
      BUILD cells → BoxGeometry at computed height, dark navy.
7.  Add neon edge trim:
      Four thin BoxGeometry strips per building face.
      Emissive colour = neonColors[buildingIndex % 4].
      MeshBasicMaterial (always appears emissive — no lighting cost).
8.  Place 12 capture-point ring indicators (2 uncapturable team bases and a chain of 10 capturable objectives between them).
9.  Precompute base spawn clusters (dense grid inside each base zone)
    and mid-map spawn nodes (at road intersections).
10. Merge all collideable geometry into one BufferGeometry;
    call geometry.computeBoundsTree() to build the BVH.
```

### Performance rules

| Rule | Implementation |
|---|---|
| Buildings: 1 draw call | `THREE.InstancedMesh(buildingGeo, buildingMat, count)` |
| Neon trims: 1 draw call | `THREE.InstancedMesh(trimGeo, trimMat, count)` |
| Max materials | ≤ 5 across the entire city |
| Dynamic shadows | Off — `renderer.shadowMap.enabled = false` |
| BVH rebuild | Never mid-match — only between matches |

---

## 10. ECS Components and Systems

Grid War's gameplay logic is entirely structured as ECSY systems operating on components. See [`docs/01-architecture.md`](01-architecture.md) for the engine-level ECS design.

### Components

| Component | Key fields | Purpose |
|---|---|---|
| `TransformComponent` | `position`, `quaternion` | World-space position of any entity |
| `VelocityComponent` | `linear` | Movement vector for physics integration |
| `HealthComponent` | `current`, `max`, `shielded` | HP and spawn-shield flag |
| `WeaponStateComponent` | `srWeaponId`, `hrWeaponId`, `activeSlot`, `lastFiredAt`, `equipped` | Loadout state |
| `AmmoComponent` | `srCurrent`, `srMax`, `hrCurrent`, `hrMax`, `weightUsed`, `weightMax` | Ammo + weight budget |
| `TeamComponent` | `team` (`'blue'` \| `'red'`) | Team membership |
| `CaptureStateComponent` | `pointId`, `ownerTeam`, `progress`, `capturingTeam`, `contested`, `active`, `isBase` | Capture point state |
| `SpawnShieldComponent` | `expiresAt` | Countdown until shield drops |
| `RemotePlayerComponent` | `socketId`, `snapBuffer`, `interpTarget` | Interpolation data for remote entities |

### Tag components (zero data)

| Tag | Meaning |
|---|---|
| `PlayerTag` | Any player entity (local or remote) |
| `LocalPlayerTag` | The locally controlled player |
| `EnemyTag` | Remote player on the opposing team |
| `InArsenalTag` | Player is inside Arsenal zone |
| `DeadTag` | Player is dead; awaiting respawn |

### Systems — execution order (each frame)

```
world.execute(delta):

  1. MovementSystem          reads: input, VelocityComponent
                             writes: TransformComponent (via BVH capsule sweep)

  2. PhysicsSyncSystem       reads: RigidBodyRef (Rapier body translation)
                             writes: TransformComponent, THREE.Group.position

  3. InterpolationSystem     reads: RemotePlayerComponent.snapBuffer
                             writes: THREE.Group.position (remote players)

  4. CaptureSystem           reads: TransformComponent, TeamComponent
                             writes: CaptureStateComponent (client prediction only)

  5. SpawnShieldSystem       reads: SpawnShieldComponent, HealthComponent
                             writes: mesh visibility (flash), removes component on expiry

  6. WeaponSystem            reads: input, WeaponStateComponent, AmmoComponent
                             writes: AmmoComponent (optimistic), emits FIRE socket event

  7. AudioSyncSystem         reads: TransformComponent (local player)
                             writes: Howler.pos(), Howler.orientation()

  8. HUDUpdateSystem         reads: AmmoComponent, WeaponStateComponent
                             writes: DOM (ammo span text content)
```

---

## 11. Capture Point System

### Physical volume

Each capture point is a **cylinder** in 3D space:

```js
const CAPTURE_RADIUS = 8;   // metres
const CAPTURE_HEIGHT = 4;   // metres (player must be within ±2m of centre Y)
```

A player is "in range" when their position satisfies both the horizontal radius and the vertical height constraints.

### Progress formula (server, 60 Hz tick)

```
n = number of capturing-team players currently in range
n_clamped = min(n, 6)

captureRateMultiplier = min(2.25, 1 + 0.30 × (n_clamped − 1))
progressGainPerSecond = 5 × captureRateMultiplier
```

### State transitions

```
NEUTRAL ──(team enters)──► CAPTURING
                                │
                    ┌───────────┴────────────┐
              (enemy enters)           (progress = 100)
                    │                        │
                CONTESTED               CAPTURED (owned by team)
                    │
              (one team leaves)
                    │
                CAPTURING (resumed)
```

### Contest rule

When at least one player from **each** team is in range:

- `contested = true`
- Progress is **frozen** — no gain, no loss
- Ring flashes yellow

Progress resumes the instant one team has zero players in range.

### Indicator colours

| State | Ring colour |
|---|---|
| Neutral | `0xffffff` white |
| BLUE owned | `0x4488ff` blue |
| RED owned | `0xff4444` red |
| BLUE capturing | `0x88bbff` pulsing |
| RED capturing | `0xff8888` pulsing |
| CONTESTED | `0xffff00` yellow |
| Active (current target) | team colour + scale pulse + `★` label |
| Base (uncapturable) | solid team colour, wider ring (`radius = 16`) |

### Route chain

There are exactly 12 points: 2 uncapturable team bases (index 0 and 11) and a chain of 10 capturable objectives between them. Only the next capturable point in the chain can be captured — the rest are locked. After each capture, the server unlocks the next point and emits `ROUTE_ADVANCED` to all clients.

The route order is randomised at the start of each new match (new seed).

---

## 12. Win Condition and Final Stand Timer

### Win condition

The first team to own **3 capturable objectives** (non-base points) wins. The server checks this after every `capturePoint()` event.

### Final Stand

Triggered when a team is attempting to capture their **3rd objective** (the match-winning capture).

```
Duration: 15 minutes (900 seconds)

While active:
  - Leading team's active objective stays active (their match point).
  - A counter-objective is activated for the trailing team
    (The uncaptured point with the shortest absolute world-space distance to the trailing team's base (B0 or R0)).

End conditions:
  A. Leading team captures their match point first → match ends, leading team wins.
  B. Trailing team captures their counter-objective first →
       Final Stand is cancelled, leading team loses match-point status,
       server selects new objectives.
  C. Timer reaches 0:00 → leading team wins.
```

The Final Stand countdown is shown to all clients as a prominent timer overlay.

---

## 13. Lobby, Matchmaking, and Join-in-Progress

### Lobby state (server-owned)

```typescript
interface LobbyState {
  matchState: 'lobby' | 'in_match' | 'post_match';
  mapSeed:    number;
  blueCount:  number;
  redCount:   number;
}
const MAX_TEAM_SIZE = 32;   // 32 per team, 64 total
```

### Team assignment on join

1. If the player has a preference AND that team is not full → honour it.
2. Otherwise → assign to the team with fewer players.
3. If both teams are at 32 → emit `ROOM_FULL`; player stays in lobby.

### Join-in-progress

Players may join at any time during a running match. On `JOIN_ROOM`, the server immediately sends:

- Full current `WorldSnapshot`
- Current match timer and Final Stand state (if active)
- Current capture route and active point IDs

Late-joining players spawn with coordinates directly inside their base's Arsenal trigger volume, immediately granting the `InArsenalTag` and automatically opening the UI before releasing them into the match.

### Lobby UI layout

```
┌─────────────────────────────────────────────────────┐
│  GRID WAR                        Status: In Match   │
│                                                     │
│  BLUE  ██████████░░░░░░  18 / 32                   │
│  RED   ████████░░░░░░░░  16 / 32                   │
│                                                     │
│  Map Seed: 48291      Round time: 04:32 remaining  │
│                                                     │
│  Team:  [ Auto ]  [ Blue ]  [ Red ]                │
│  Name:  [_______________]                           │
│                                                     │
│              [ JOIN MATCH ]                         │
└─────────────────────────────────────────────────────┘
```

---

## 14. Teams and Bases

### Team colours

| Team | Geometry tint | Neon trim | Capture ring |
|---|---|---|---|
| BLUE | `0x1133aa` | `0x4488ff` | `0x4488ff` |
| RED | `0xaa1111` | `0xff4444` | `0xff4444` |

### Main bases (B0 and R0)

- **Uncapturable.** If the enemy team enters, progress resets to 0 and `POINT_CAPTURED` is never emitted for bases.
- The **Arsenal** is located inside the base — the only place to equip a loadout.
- All initial spawns and respawns happen inside the base (v1.0.0).
- The base neon ring is always solid (no pulsing), wider (`radius = 16`), and labelled `BASE`.

---

## 15. Arsenal, Loadout, and Weapons

### Arsenal interaction flow

```
Player walks into Arsenal zone (radius 5m)
    → InArsenalTag added to ECS entity
    → Arsenal UI panel opens
    → Player picks SR weapon, HR weapon, ammo amounts
    → Client validates weight ≤ 100
    → Player clicks "EQUIP LOADOUT"
    → Client emits ARSENAL_EQUIP
    → Server validates + sets player as equipped
    → Server emits EQUIP_CONFIRMED
    → Arsenal UI closes, player can fire
```

### Weapon definitions

All weapons live in `src/weapons/WeaponRegistry.js`. Every field is required:

| Field | Type | Description |
|---|---|---|
| `id` | string | Unique identifier |
| `slot` | `'sr'` \| `'hr'` | Short range or high range |
| `name` | string | Display name |
| `damage` | number | HP per bullet (or per pellet for shotgun) |
| `pellets` | number | Pellets per shot (shotgun only; default 1) |
| `fireRateHz` | number | Rounds per second |
| `magSize` | number | Max rounds per magazine |
| `ammoWeight` | number | Weight units per round |
| `range` | number | Max hitscan distance in metres |
| `spread` | number | Cone half-angle in radians |
| `tracerColor` | hex | Tracer line colour |

### Weapon roster (v1.0.0)

| Slot | ID | Name | Damage | Fire Rate | Ammo Weight | Range |
|---|---|---|---|---|---|---|
| SR | `smg` | SYNTH SMG | 18 | 12 Hz | 0.8 /round | 35 m |
| SR | `shotgun` | CIRCUIT SHOTGUN | 14 ×8 pellets | 1.2 Hz | 2.5 /round | 20 m |
| HR | `rifle` | LIGHTLINE RIFLE | 55 | 2.5 Hz | 3.0 /round | 150 m |
| HR | `sniper` | GRID SNIPER | 95 | 0.6 Hz | 6.0 /round | 300 m |

### Weapon switch

```
Q key  or  Mouse Wheel  →  toggle activeSlot between 'sr' and 'hr'
```

---

## 16. Ammo, Weight, and Resupply

### Weight budget

```
maxWeight = 100

totalWeight = (srRounds × srWeapon.ammoWeight)
            + (hrRounds × hrWeapon.ammoWeight)

Constraint: totalWeight ≤ maxWeight
```

The Arsenal UI prevents the player from exceeding `maxWeight`. Sliders for each ammo type adjust in real time and block at the budget ceiling.

### Arsenal UI layout

```
┌────────────────────────────────────────┐
│  ARSENAL                               │
│                                        │
│  SR: SYNTH SMG                         │
│    Rounds: [──────●──────] 60          │
│    Weight: 48.0                        │
│                                        │
│  HR: LIGHTLINE RIFLE                   │
│    Rounds: [───●─────────] 10          │
│    Weight: 30.0                        │
│                                        │
│  Total weight: 78 / 100  ████████░░    │
│                                        │
│         [ EQUIP LOADOUT ]              │
└───────────────────────��────────────────┘
```

### Resupply at owned points

When a team owns a capture point, that point becomes a **resupply zone** for that team. A player inside the zone (same radius as the capture cylinder) presses **R** to request a resupply.

- The server validates: (1) point is owned by the player's team, (2) player is within range.
- On success the server refills ammo to the player's chosen maximum (`srMax`, `hrMax`) — not beyond it.
- The client receives `RESUPPLY_GRANTED` and updates `AmmoComponent`.

This creates the intended logistics loop:
```
Base → choose loadout + ammo budget
  → push to objective → capture it
  → use it as forward resupply
  → push to next objective
```

---

## 17. Combat — Server-Authoritative Hitscan

### Client fire flow

```
1. Player presses LMB.
2. WeaponSystem checks locally:
   a. equipped === true
   b. ammo for activeSlot > 0
   c. (now − lastFiredAt) ≥ 1000 / fireRateHz
   d. SpawnShieldComponent is NOT present
3. All checks pass:
   → Decrement ammo locally (optimistic)
   → Play gunshot SFX (Howler)
   → Spawn tracer (BulletTracer pool)
   → Set `fire: true` on next `InputSnapshot` (sent with `weaponId` and `slot`)
```

### Server FIRE validation (Processed in Input tick)

```typescript
1. Look up the weapon definition.
2. Reject if (now − player.lastFiredAt) < (1000 / fireRateHz) × 0.8   // 20% tolerance
3. Reject if ammo[slot] ≤ 0.
4. Decrement server-side ammo.
5. Set player.lastFiredAt = now.
6. Clamp input.origin to within 0.5 m of server-authoritative player position.
7. BVH raycast from clamped origin along input.direction, max distance = weapon.range.
8. For each hit player on the enemy team:
   a. Skip if target.shielded === true.
   b. Deduct weapon.damage from target.health.
   c. Emit HIT to all room clients.
   d. If target.health ≤ 0: call killPlayer(target, shooter).
```

### Tracer visual (client, pooled)

All tracer geometry is pre-allocated at match start as a pool of 128 `THREE.Line` objects. No `new THREE.Line()` calls occur during gameplay.

- Tracers are 80ms visible, then hidden (returned to pool).
- Colour is set from `weapon.tracerColor`.

### Reconciliation

If the server detects a significant discrepancy between the client-predicted player position and the authoritative position (> 0.5m), it emits `RECONCILE` with the correct position. The client teleports and resimulates from that point.

---

## 18. Spawning and Spawn Protection

### Spawn positions

All spawns in v1.0.0 are at the team's main base. The server picks randomly from the precomputed spawn node cluster for that team.

### Spawn state reset

On each spawn (initial or respawn), the server sets:

```
player.health     = 100
player.shielded   = true        ← 2-second window
player.shieldEnd  = now + 2000
player.ammo.*     = 0           ← empty until Arsenal visit
player.equipped   = false
```

### Spawn shield behaviour (client)

- The local player **cannot fire** while `SpawnShieldComponent` is present (checked by `WeaponSystem`).
- The player mesh **flashes** at 10 Hz (toggling `visible`) for the duration.
- After 2 seconds, `SpawnShieldComponent` is removed and the player can fire (once they visit the Arsenal).

---

## 19. HUD and Map Overlay

### HUD rule

> The on-screen HUD shows **only ammo** (current magazine + reserve) for the currently equipped weapon. Nothing else.

```html
<!-- index.html — Tailwind HUD overlay -->
<div id="hud"
     class="fixed bottom-4 right-4 text-white font-mono text-2xl
            select-none pointer-events-none">
  <span id="hud-ammo-current">30</span>
  <span class="text-gray-400 mx-1">/</span>
  <span id="hud-ammo-reserve" class="text-gray-400">60</span>
</div>
```

`HUDUpdateSystem` writes to these DOM nodes once per frame from `AmmoComponent`.

### Tactical map overlay

Opened and closed with the **M key**. Implemented as a `<canvas>` 2D overlay drawn each frame while open.

The map projection maps the 3D world X/Z coordinates to canvas X/Y using the same `blockSize` and grid dimensions used by `CityGenerator`.

```
┌─────────────────────────────────────────────────────────────────┐
│  TACTICAL MAP                                         [M] Close │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  [B0]══[1]══[2]       [3]★← Active (RED)                │  │
│  │           ║                                              │  │
│  │  [4]═════[5]═════[6]  [7]                               │  │
│  │                        ║                                 │  │
│  │           [8]══════════[R0]                              │  │
│  │                                                          │  │
│  │  ◉ You    ● teammate    ○ enemy (if visible)             │  │
│  └───────────────────────────────────────────────────────┘  │
│  Active: Point 3  (RED capturing)     Next: Point 5          │
│  BLUE ●● 2 captured      RED ● 1 captured                   │
└─────────────────────────────────────────────────────────────────┘
```

The map shows in real time:
- All 10 capture points, coloured by owner
- Active and next objectives labelled
- Local player as a highlighted dot with a direction arrow
- Teammates as team-coloured dots with direction arrows
- Enemy player positions as faint dots (sent in snapshots)

---

## 20. Networking — Snapshot Protocol

This section covers the Grid War–specific message schema. For the full multiplayer model (interpolation algorithm, prediction, reconciliation), see [`docs/04-multiplayer-socketio.md`](04-multiplayer-socketio.md).

### All Socket.IO event names

All event name strings are defined as constants in `src/constants/Events.js` — no magic strings inline anywhere in the codebase.

### Client → Server events

| Event | Key payload fields | Description |
|---|---|---|
| `JOIN_ROOM` | `name`, `teamPref` | Join or create a match room |
| `PLAYER_INPUT` | `InputSnapshot` | Sent every client frame |
| `ARSENAL_EQUIP` | `srWeaponId`, `hrWeaponId`, `srRounds`, `hrRounds` | Confirm loadout selection |
| `RESUPPLY_REQ` | `pointId` | Request ammo refill at owned point |
| `LEAVE_ROOM` | — | Graceful disconnect |

### Server → Client events

| Event | Key payload fields | Description |
|---|---|---|
| `ROOM_JOINED` | `playerId`, `team`, full world state | Assigned identity + initial snapshot |
| `ROOM_FULL` | — | Server at capacity (64 players) |
| `WORLD_SNAPSHOT` | `WorldSnapshot` | 20 Hz broadcast |
| `SPAWN` | `position`, `shieldEnd` | Respawn position + shield expiry timestamp |
| `HIT` | `targetId`, `damage`, `health`, `hitPoint` | Damage confirmation |
| `KILL` | `killerId`, `victimId` | Kill feed entry |
| `POINT_CAPTURED` | `pointId`, `ownerTeam` | Ownership change |
| `ROUTE_ADVANCED` | `nextPointId` | New active objective unlocked |
| `FINAL_STAND_START` | `leadingTeam`, `endsAt` | 15-minute countdown begins |
| `FINAL_STAND_ENDED` | `reason` | Final Stand cancelled |
| `MATCH_END` | `winner` | Match over |
| `RESUPPLY_GRANTED` | `srCurrent`, `hrCurrent` | Ammo refill confirmed |
| `RECONCILE` | `position` | Position correction for local player |
| `EQUIP_CONFIRMED` | `srWeaponId`, `hrWeaponId`, ammo state | Arsenal equip accepted |

### `InputSnapshot` schema

```typescript
interface InputSnapshot {
  seq:      number;    // monotonic counter per client
  forward:  boolean;
  backward: boolean;
  left:     boolean;
  right:    boolean;
  jump:     boolean;
  yaw:      number;    // camera yaw in radians
  pitch:    number;    // camera pitch in radians
  fire:     boolean;   // trigger intent this tick
  weaponId: string;    // currently equipped weapon
  slot:     'sr' | 'hr';// current active slot
  origin:   [number, number, number]; // camera world position (clamped server-side)
  direction:[number, number, number]; // normalised camera forward vector
}

> **Anti-cheat note:** `origin` is accepted from the client as a starting point for the ray but is **clamped** server-side to within `0.5 m` of the server's known player position before the raycast fires. This prevents position-spoofing while avoiding the 20 Hz latency error from using the server position directly.
```

### `WorldSnapshot` schema

```typescript
interface WorldSnapshot {
  tick:        number;
  timestamp:   number;
  entities:    EntityState[];
  players:     PlayerSnap[];
  points:      PointSnap[];
  finalStand?: { endsAt: number; leadingTeam: string };
}

interface PlayerSnap {
  id:         string;
  team:       'blue' | 'red';
  position:   [number, number, number];
  yaw:        number;
  health:     number;
  equipped:   boolean;
  activeSlot: 'sr' | 'hr';
}

interface PointSnap {
  pointId:       number;
  ownerTeam:     string;
  progress:      number;   // 0–100
  capturingTeam: string;
  contested:     boolean;
  active:        boolean;
}
```

---

## 21. Audio Design

Grid War uses **both** audio systems provided by the engine. See [`docs/08-references-and-resources.md § 4`](08-references-and-resources.md#4-howlerjs--threejs-audio) for the full API reference.

### Audio split decision table

| Sound | System | Reason |
|---|---|---|
| Ambient neon music loop | Howler.js | Streaming large file |
| UI clicks and menu sounds | Howler.js | Sprite, reliable cross-browser |
| Own weapon gunshot | Howler.js | Non-positional, always full volume |
| Own weapon reload | Howler.js | Non-positional |
| Own player footsteps | Howler.js | Non-positional |
| Capture point alarm (contested) | `THREE.PositionalAudio` | Attenuates with distance |
| Enemy gunshots | `THREE.PositionalAudio` | Spatial — reveals enemy direction |
| Point capture completion | Howler.js | UI-level feedback |
| Kill confirmation | Howler.js | Non-positional feedback |

### Howler SFX sprite keys

All game SFX are packed into a single sprite file (`audio/sfx.webm` + `audio/sfx.mp3`) defined in `src/audio/SFXManifest.js`:

```
shoot_smg       shoot_shotgun   shoot_rifle   shoot_sniper
reload_smg      reload_rifle
footstep_a      footstep_b
point_capture   spawn           hit_confirm   ui_click
```

### Listener update (each frame)

`AudioSyncSystem` calls `Howler.pos()` and `Howler.orientation()` with the local player's current position and camera forward vector so all Howler-positioned sounds attenuate correctly.

---

## 22. Performance Constraints

These are hard requirements, not guidelines. The game must meet them at 64 concurrent players.

### Server

| Metric | Target |
|---|---|
| Simulation tick rate | 60 Hz |
| Snapshot broadcast rate | 20 Hz |
| Snapshot size at 64 players | < 4 KB per message |

### Client

| Metric | Target | Implementation |
|---|---|---|
| Target frame rate | 60 fps | — |
| Building draw calls | 1 | `InstancedMesh` |
| Neon trim draw calls | 1 | `InstancedMesh` |
| Total materials | ≤ 5 | Shared across all city geometry |
| Tracer allocation | 0 per frame | Pre-allocated pool of 128 `THREE.Line` |
| Per-frame heap allocations | 0 in hot paths | Reuse `THREE.Vector3`, `THREE.Ray`, `THREE.Raycaster` |
| Shadow maps | Disabled | `renderer.shadowMap.enabled = false` |
| BVH rebuild | 0 mid-match | Built once after city generation |

### Anti-allocation pattern

```js
// ❌ Never do this in systems or the game loop
const dir = new THREE.Vector3(0, -1, 0);

// ✅ Allocate once as a module-level constant, reuse every frame
const _dir  = new THREE.Vector3();
const _ray  = new THREE.Raycaster();

function sweep(origin, dx, dy, dz) {
  _dir.set(dx, dy, dz);
  _ray.set(origin, _dir);
  // ...
}
```

---

## 23. Scene Data Definitions

### `public/game.json`

```json
{
  "initialScene": "grid_war",
  "scenes": {
    "grid_war": "scenes/grid_war.json"
  },
  "gameObjectTypes": {
    "player":        "types/player.json",
    "remotePlayer":  "types/remote_player.json",
    "capturePoint":  "types/capture_point.json",
    "arsenal":       "types/arsenal.json"
  }
}
```

### `public/scenes/grid_war.json`

```json
{
  "name": "grid_war",
  "background": "#050510",
  "fog": { "color": "#050510", "near": 80, "far": 200 },
  "gravity": { "x": 0, "y": -20, "z": 0 },
  "gameObjects": []
}
```

> The scene JSON has no static GameObjects because the city and all entities are **generated and spawned procedurally at runtime**. The JSON only carries the scene configuration.

### `public/types/player.json`

```json
{
  "components": [
    {
      "type": "rigidBody",
      "rigidBodyType": "kinematicPositionBased",
      "colliders": [
        { "type": "capsule", "halfHeight": 0.5, "radius": 0.35 }
      ]
    }
  ]
}
```

### `public/types/capture_point.json`

```json
{
  "components": [
    {
      "type": "rigidBody",
      "rigidBodyType": "fixed",
      "colliders": [
        { "type": "cylinder", "halfHeight": 2, "radius": 8, "sensor": true }
      ]
    }
  ]
}
```

---

## 24. Implementation Checklist

Build in this order. Each phase is independently testable before moving to the next.

### Phase 0 — Scaffold

- [ ] `packages/game/` exists with `vite.config.js`, `package.json`, `index.html`
- [ ] Tailwind CDN loaded in `index.html`
- [ ] `server/src/index.ts` starts on port `3333` (`curl http://localhost:3333` → 200)
- [ ] Vite dev server starts on port `5173` (`yarn workspace @tge/game dev`)

### Phase 1 — Procedural Map

- [ ] `CityGenerator.js` generates a 24×24 city from a seed
- [ ] Buildings rendered as `InstancedMesh` (verify 1 draw call in `renderer.info`)
- [ ] Neon trims rendered as `InstancedMesh`
- [ ] BVH built on collision mesh (`computeBoundsTree()` called)
- [ ] 10 capture-point ring indicators visible at correct positions
- [ ] Spawn node positions precomputed and logged

### Phase 2 — Local Player Movement

- [ ] `PointerLockControls` active; pointer locks on click
- [ ] WASD moves player; mouse look rotates camera
- [ ] Capsule BVH sweep: player cannot walk through buildings
- [ ] Gravity applied; player falls to ground on spawn
- [ ] Camera positioned at 1.7m above capsule bottom

### Phase 3 — Networking Baseline

- [ ] `SocketClient.js` connects to `ws://localhost:3333`
- [ ] Server assigns `playerId` and team on `JOIN_ROOM`
- [ ] `PLAYER_INPUT` emitted each frame
- [ ] Server broadcasts `WORLD_SNAPSHOT` at 20 Hz
- [ ] Two browser tabs: both players visible as `RemotePlayer` meshes
- [ ] Interpolation smooth with 100ms buffer

### Phase 4 — Arsenal and Loadout

- [ ] Arsenal zone triggers `InArsenalTag` when player enters
- [ ] Arsenal UI (Tailwind panel) opens; weapon select + ammo sliders
- [ ] Weight budget enforced; sliders block at 100
- [ ] `ARSENAL_EQUIP` emitted; server validates and responds `EQUIP_CONFIRMED`
- [ ] `WeaponStateComponent` populated; player now able to fire

### Phase 5 — Capture Points

- [ ] Player entering/leaving capture cylinder detected each frame
- [ ] Server ticks progress at 60 Hz using the rate formula
- [ ] Ring flashes yellow when contested
- [ ] `POINT_CAPTURED` received; ring colour updates on all clients
- [ ] Route chain: next point unlocked after each capture
- [ ] Base points: progress always resets to 0 for the enemy team

### Phase 6 — Combat

- [ ] LMB fires; `WeaponSystem` enforces rate and ammo
- [ ] Server `handleFire`: BVH raycast, damage applied, `HIT` emitted
- [ ] Tracer spawns from pool on fire, hidden after 80ms
- [ ] Player dies at 0 HP; `KILL` emitted; kill feed toast shown
- [ ] Respawn at base after death; 2-second flash shield

### Phase 7 — Ammo and Resupply

- [ ] Owned point displays "RESUPPLY" label for the owning team
- [ ] R key inside owned point sends `RESUPPLY_REQ`
- [ ] Server validates ownership + position; emits `RESUPPLY_GRANTED`
- [ ] Ammo refilled to `srMax` / `hrMax`; HUD updates

### Phase 8 — Win Condition and Final Stand

- [ ] Server evaluates win condition after every capture
- [ ] `MATCH_END` emitted; end-of-match Tailwind overlay shown
- [ ] Final Stand triggered on match-point capture attempt
- [ ] 15-minute countdown shown in HUD
- [ ] Counter-objective activated for trailing team
- [ ] Final Stand cancels correctly when trailing team captures counter
- [ ] Timer expiry grants win to leading team

### Phase 9 — HUD and Map Overlay

- [ ] Ammo HUD (bottom-right): correct values; switches on Q
- [ ] M key toggles tactical map; closes on second M press
- [ ] Map renders points (coloured by owner), local player dot + direction arrow, teammate dots
- [ ] Active and next objective labelled

### Phase 10 — Lobby and Join-in-Progress

- [ ] Main menu: name input, team preference, settings panel, Play button
- [ ] Lobby panel: player counts per team, map seed, match state, Join button
- [ ] Late-join sends full state; player spawns directly inside Arsenal trigger volume
- [ ] `ROOM_FULL` message shown when server is at 64 players

### Phase 11 — Audio

- [ ] Howler SFX sprite loaded; all keys from `SFXManifest.js` play correctly
- [ ] Ambient neon music loops at game start
- [ ] Gunshot SFX on fire; footstep SFX on movement (interval-gated)
- [ ] Point capture completion sound
- [ ] Contested capture point alarm using `THREE.PositionalAudio`
- [ ] `AudioSyncSystem` updates Howler listener position each frame

### Phase 12 — Performance Audit

- [ ] `renderer.info.render.calls` ≤ 10 during normal gameplay
- [ ] No `new THREE.Vector3` / `new THREE.Ray` in any system `execute()` body
- [ ] Tracer pool: 128 pre-allocated lines; no new allocations confirmed
- [ ] `JSON.stringify(snapshot)` at 64 players < 4 096 bytes
- [ ] Stable 60 fps in Chrome with 2 browser tabs open

---

*End of `docs/09-example-game.md` — Grid War v1.0.0 specification.*