```
  ██████╗ ██████╗ ██╗██████╗
 ██╔════╝ ██╔══██╗██║██╔══██╗
 ██║  ███╗██████╔╝██║██║  ██║
 ██║   ██║██╔══██╗██║██║  ██║
 ╚██████╔╝██║  ██║██║██████╔╝
  ╚═════╝ ╚═╝  ╚═╝╚═╝╚═════╝
```

**An AI-built TypeScript game engine for 3D First-Person multiplayer games.**

Powered by **Three.js** · **Rapier** · **three-mesh-bvh** · **ECSY** · **Socket.IO**

[![Node 18.18.2](https://img.shields.io/badge/node-18.18.2-brightgreen?logo=node.js)](https://nodejs.org)
[![Yarn 3.6.3](https://img.shields.io/badge/yarn-3.6.3-blue?logo=yarn)](https://yarnpkg.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.2-blue?logo=typescript)](https://www.typescriptlang.org)
[![Three.js](https://img.shields.io/badge/Three.js-r168-black?logo=three.js)](https://threejs.org)
[![Rapier](https://img.shields.io/badge/Rapier-0.11-orange)](https://rapier.rs)
[![License: MIT](https://img.shields.io/badge/license-MIT-green)](LICENSE)

</div>

---

## What is Grid?

**Grid** is a lightweight, TypeScript-first 3D game engine built exclusively for **first-person multiplayer browser games**. It composes battle-tested open-source libraries into a coherent, data-driven developer workflow:

| Library | Role |
|---|---|
| [Three.js](https://threejs.org) | WebGL rendering — scene graph, lights, models, animations |
| [Rapier](https://rapier.rs) | WASM physics — rigid bodies, character controller, colliders |
| [three-mesh-bvh](https://github.com/gkjohnson/three-mesh-bvh) | BVH-accelerated raycasting — sub-ms FPS collision on complex geometry |
| [ECSY](https://ecsy.io) + [ecsy-three](https://github.com/ecsyjs/ecsy-three) | Entity-Component-System architecture |
| [Howler.js](https://howlerjs.com) | Music, UI audio, audio sprites |
| [Socket.IO](https://socket.io) | Authoritative multiplayer server + client sync |

> **No VR. No mobile. No magic.**
> Grid targets desktop browsers and first-person gameplay only. All WebXR / VR code paths are intentionally omitted.

---

## Table of Contents

- [Features](#features)
- [Non-Goals](#non-goals)
- [Quick Start](#quick-start)
- [Monorepo Structure](#monorepo-structure)
- [Packages](#packages)
- [Tooling](#tooling)
- [Documentation](#documentation)
- [Scripts Reference](#scripts-reference)
- [Contributing](#contributing)
- [License](#license)

---

## Features

- 🎮 **First-Person focused** — built-in capsule character controller, pointer-lock mouse look, WASD + gamepad input
- 🏗️ **Data-driven scenes** — scenes and game-object types are plain JSON; no scene logic belongs only in code
- ⚡ **BVH collision** — `three-mesh-bvh` capsule sweeps give sub-millisecond player vs. world collision on high-poly levels
- 🧱 **ECS architecture** — `ECSY` separates data (Components) from logic (Systems); no deep inheritance hierarchies
- 🔊 **Dual audio system** — `Howler.js` for music/SFX sprites + Three.js `PositionalAudio` for in-world spatial sound
- 🌐 **Multiplayer ready** — Socket.IO authoritative server with client prediction, snapshot interpolation, and reconciliation
- 🖊️ **Visual editor** — React + Vite scene editor with live hot-reload viewport, inspector, and transform gizmo
- 📦 **Yarn workspaces monorepo** — `packages/engine`, `packages/game`, `packages/editor`, `server/`
- 🦺 **TypeScript first** — strict types throughout; engine ships `.d.ts` declaration files
- ✅ **Tested** — Jest (engine), Vitest (editor/game), with Three.js and Rapier mocked for Node.js

---

## Non-Goals

- ❌ No VR / WebXR
- ❌ No 2D or top-down games
- ❌ No Cordova / Electron / mobile packaging
- ❌ No server-side rendering
- ❌ No built-in AAA graphics pipeline (deferred rendering, GI, etc.)

---

## Quick Start

### Prerequisites

Install [mise](https://mise.jdx.dev) to pin exact tool versions:

```bash
# macOS
brew install mise

# Linux / WSL
curl https://mise.run | sh
```

### Clone and Install

```bash
git clone https://github.com/your-org/grid-engine.git
cd grid-engine

# Activate pinned Node 18.18.2 + Yarn 3.6.3
mise trust && mise install

# Verify versions
node --version   # v18.18.2
yarn --version   # 3.6.3

# Install all workspace dependencies
yarn install
```

### Run the Example Game

```bash
yarn dev:game
# → http://localhost:5173
```

### Run the Scene Editor

```bash
yarn dev:editor
# → http://localhost:5174
# Click "Open Project" and select the packages/game/public folder
```

### Run the Multiplayer Server

```bash
cd server
npm install
npm run dev
# → ws://localhost:3333
```

### Run All Tests

```bash
yarn test          # Jest – engine unit + integration tests
yarn test:editor   # Vitest – editor React component tests
```

### Build Everything

```bash
yarn build
# builds packages/engine (tsc), packages/game (vite), packages/editor (vite)
```

---

## Monorepo Structure

```
grid-engine/
│
├── .gitignore
├── .yarnrc.yml               ← nodeLinker: node-modules
├── mise.toml                 ← pins Node 18.18.2 + Yarn 3.6.3
├── package.json              ← workspace root
├── tsconfig.base.json        ← shared TypeScript config
├── LICENSE                   ← MIT — see third-party notices inside
│
├── docs/                     ← 📖 full specification documents (start here)
│   ├── 00-overview.md
│   ├── 01-architecture.md
│   ├── 02-packages-and-folders.md
│   ├── 03-engine-api.md
│   ├── 04-multiplayer-socketio.md
│   ├── 05-editor-react-vite.md
│   ├── 06-testing.md
│   ├── 07-migration-notes.md
│   ├── 08-references-and-resources.md
│   └── 09-example-game.md
│
├── tests/                    ← Jest cross-package tests
│   ├── setup/
│   │   ├── jestGlobalSetup.ts
│   │   └── jestSetupFile.ts
│   ├── __mocks__/
│   │   ├── three.ts
│   │   └── @dimforge/rapier3d-compat.ts
│   └── engine/
│       ├── Game.test.ts
│       ├── Scene.test.ts
│       ├── GameObject.test.ts
│       ├── assets/
│       ├── components/
│       ├── input/
│       ├── network/
│       └── physics/
│
├── packages/
│   ├── engine/               ← 📦 publishable library (@tge/engine)
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── src/
│   │   │   ├── index.ts      ← public API barrel
│   │   │   ├── Game.ts
│   │   │   ├── Scene.ts
│   │   │   ├── GameObject.ts
│   │   │   ├── Component.ts
│   │   │   ├── Renderer.ts
│   │   │   ├── Settings.ts
│   │   │   ├── Logger.ts
│   │   │   ├── Util.ts
│   │   │   ├── assets/
│   │   │   ├── components/
│   │   │   ├── input/
│   │   │   ├─�� network/
│   │   │   ├── physics/
│   │   │   ├── ui/
│   │   │   └── util/
│   │   └── dist/             ← tsc output (git-ignored)
│   │
│   ├── game/                 ← 🎮 example first-person game (@tge/game)
│   │   ├── package.json
│   │   ├── vite.config.js
│   │   ├── index.html
│   │   ├── public/           ← game assets + JSON data files
│   │   │   ├── game.json
│   │   │   ├── scenes/
│   │   │   ├── types/
│   │   │   └── assets/
│   │   └── src/
│   │       └── main.js
│   │
│   ├── shared/               ← 🔗 shared networking types (@tge/shared)
│   │   ├── package.json
│   │   └── src/
│   │       └── types.ts      ← InputSnapshot, WorldSnapshot (used by engine + server)
│   │
│   └── editor/               ← 🖊️ React + Vite scene editor (@tge/editor)
│       ├── package.json
│       ├── vite.config.ts
│       ├── index.html
│       └── src/
│           ├── main.tsx
│           ├── App.tsx
│           ├── store/
│           ├── components/
│           │   ├── Toolbar/
│           │   ├── SceneGraph/
│           │   ├── Viewport/
│           │   └── Inspector/
│           └── hooks/
│
└── server/                   ← 🌐 Socket.IO multiplayer server (standalone)
    ├── package.json
    ├── tsconfig.json
    └── src/
        ├── index.ts
        ├── GameRoom.ts
        ├── RoomManager.ts
        └── Snapshot.ts
```

---

## Packages

### `packages/engine` — `@tge/engine`

The publishable library. Import it in any project:

```typescript
import { Game, Scene, GameObject } from '@tge/engine';

const game = new Game('/assets', {
  rendererOptions: { setupFullScreenCanvas: true },
});

await game._init();
await game.loadScene('level1');
```

**Public API exports:**

```typescript
// Core
export { Game, Scene, GameObject, Component }

// Controllers
export { CharacterController, KinematicCharacterController, DynamicCharacterController }

// Multiplayer
export { NetworkManager }

// Re-exported underlying libraries
export { THREE, RAPIER }

// Types
export type { GameOptions, SceneJSON, GameObjectJSON, ComponentJSON }
```

See [`docs/03-engine-api.md`](docs/03-engine-api.md) for the full TypeScript API surface.

---

### `packages/game` — Example Game

A complete Vite app demonstrating the engine in a playable first-person scenario. Use this as a reference for wiring up the engine in your own project.

```bash
yarn workspace @tge/game dev      # development server
yarn workspace @tge/game build    # production build
```

---

### `packages/editor` — Scene Editor

A React + Vite visual editor for creating and editing scenes without touching JSON directly. Opens a project folder from disk via the File System Access API, shows a live Three.js viewport, and writes changes back to JSON in real time.

```bash
yarn workspace @tge/editor dev    # development server → http://localhost:5174
yarn workspace @tge/editor build  # production static build
```

**Editor features:**
- Scene graph tree view with drag-and-drop reordering
- Inspector panel for transforms, components, and scene settings
- Live Three.js viewport with hot-reload (change JSON → GameObject reloads instantly)
- Transform gizmo (translate / rotate / scale) using `THREE.TransformControls`
- Auto-save with 1 s debounce via the File System Access API
- Redux Toolkit state with action log (undo/redo is architecturally supported but not yet implemented in v1)

---

### `server/` — Multiplayer Server

An Express + Socket.IO authoritative game server. Runs a headless Rapier physics simulation, accepts player input from clients, and broadcasts world-state snapshots at 20 Hz.

```bash
cd server
npm run dev     # tsx watch (development)
npm run build   # tsc (production)
npm start       # node dist/index.js
```

---

## Tooling

### Runtime Version Management — `mise`

```toml
# mise.toml
[tools]
node = "18.18.2"
yarn = "3.6.3"
```

```bash
mise trust && mise install   # installs exact versions
```

### Package Manager — Yarn 3.6.3 (Berry)

```yaml
# .yarnrc.yml
nodeLinker: node-modules
```

> `node-modules` linker is required for WASM packages (Rapier) and packages that rely on `__dirname`.

### Build — TypeScript + Vite

| Package | Build command | Output |
|---|---|---|
| `packages/engine` | `tsc --project tsconfig.json` | `packages/engine/dist/` |
| `packages/game` | `vite build` | `packages/game/dist/` |
| `packages/editor` | `vite build` | `packages/editor/dist/` |

### Linting

```bash
yarn lint            # ESLint across all packages
yarn lint:fix        # ESLint with --fix
```

---

## Documentation

All design decisions, architecture specs, and implementation guides live in [`docs/`](docs/). Read these **before writing engine code** — they are the source of truth for what Grid is and how it works.

| Doc | What it covers |
|---|---|
| [`docs/00-overview.md`](docs/00-overview.md) | Goals, non-goals (VR explicitly excluded), guiding principles, dependency matrix |
| [`docs/01-architecture.md`](docs/01-architecture.md) | Scene/GameObject model, ECS design, engine loop, rendering, physics integration, asset pipeline, event system, character controllers |
| [`docs/02-packages-and-folders.md`](docs/02-packages-and-folders.md) | Complete monorepo tree, all `package.json` contents, public API barrel, workspace config |
| [`docs/03-engine-api.md`](docs/03-engine-api.md) | Full TypeScript API surface — every public class, method, and JSON schema |
| [`docs/04-multiplayer-socketio.md`](docs/04-multiplayer-socketio.md) | Networking model, message schemas, `NetworkManager`, snapshot interpolation, client-side prediction, reconciliation, server architecture |
| [`docs/05-editor-react-vite.md`](docs/05-editor-react-vite.md) | Editor component tree, Redux slices, Viewport/Gizmo/Inspector detail, File System Access API workflow, validation, Vite config |
| [`docs/06-testing.md`](docs/06-testing.md) | Test strategy, folder layout, Jest + ts-jest config, Three.js and Rapier mocks, key test cases, CI commands |
| [`docs/07-migration-notes.md`](docs/07-migration-notes.md) | Every change vs. the reference repo — VR removal, monorepo conversion, Webpack→Vite migration, test reorganisation, multiplayer addition |
| [`docs/08-references-and-resources.md`](docs/08-references-and-resources.md) | Complete library reference for all dependencies — official docs, best internet resources, API cheatsheets |
| [`docs/09-example-game.md`](docs/09-example-game.md) | Grid War: full design and implementation spec for the reference FPS game in `packages/game` |

---

## Scripts Reference

Run from the **repo root** unless noted.

```bash
# ── Development ──────────────────────────────────────────────────
yarn dev:game          # Vite dev server for the example game (port 5173)
yarn dev:editor        # Vite dev server for the scene editor (port 5174)

# ── Build ────────────────────────────────────────────────────────
yarn build             # Build all workspaces (engine tsc + game vite + editor vite)
yarn workspace @tge/engine  build   # Build engine only
yarn workspace @tge/game    build   # Build game only
yarn workspace @tge/editor  build   # Build editor only

# ── Test ─────────────────────────────────────────────────────────
yarn test              # Jest – all engine unit + integration tests
yarn test --coverage   # With coverage report
yarn test --watch      # Watch mode (development)
yarn test:editor       # Vitest – editor React component tests
yarn test:game         # Vitest – game integration tests

# ── Lint ─────────────────────────────────────────────────────────
yarn lint              # ESLint all workspaces
yarn lint:fix          # ESLint with auto-fix

# ── Multiplayer server (from server/) ────────────────────────────
cd server && npm run dev      # tsx watch (port 3333)
cd server && npm run build    # tsc
cd server && npm start        # node dist/index.js

# ── Utilities ────────────────────────────────────────────────────
yarn workspaces foreach -A run build   # Run build in all workspaces sequentially
yarn workspaces foreach -Ap run build  # Run build in all workspaces in parallel
```

---

## Architecture at a Glance

```
Browser
┌─────────────────────────────────────────────────────┐
│                                                     │
│  Game ────────────────── owns ──────────────────  │
│   ├── Renderer          (THREE.WebGLRenderer)       │
│   ├── AssetStore        (GLTF, JSON, Audio, Tex)    │
│   ├── InputManager      (KB + Mouse + Gamepad)      │
│   └── NetworkManager    (Socket.IO client)          │
│                                                     │
│  Scene ───────────────── contains ───────────────  │
│   ├── THREE.Scene                                   │
│   ├── RAPIER.World                                  │
│   └── GameObject[]  ◄── tree hierarchy              │
│         └── GameObject                              │
│               ├── THREE.Group   (position/rotation) │
│               └── Component[]                       │
│                     ├── ModelComponent   (GLTF)     │
│                     ├── RigidBodyComponent (Rapier) │
│                     ├── LightComponent   (THREE)    │
│                     └── SoundComponent   (THREE)    │
│                                                     │
│  BVH Layer ──────────── accelerates ─────────────  │
│   └── three-mesh-bvh   (capsule sweep, raycasts)    │
│                                                     │
│  ECSY World — MANDATED for v1.0.0 ────────────────  │
│   └── Games MUST use ECSY for ECS system structure   │
│       (MovementSystem, CaptureSystem, etc.)           │
│                                                     │
└─────────────────────────────────────────────────────┘
          ▲                          ▲
          │ Socket.IO                │ File System
          ▼                          ▼ Access API
   Multiplayer Server          Scene Editor (React)
   (Express + Rapier)          (packages/editor)
```

---

## Core Concepts

### Scene → GameObject → Component

Everything visible in the game world is a **GameObject** attached to a **Scene**. Each `GameObject` manages a `THREE.Group` in the render graph and can optionally own a `RAPIER.RigidBody` via a `RigidBodyComponent`.

```typescript
// scene.json
{
  "gravity": { "x": 0, "y": -9.8, "z": 0 },
  "gameObjects": [
    {
      "name": "player",
      "type": "player",
      "position": { "x": 0, "y": 1.7, "z": 0 },
      "components": [
        { "type": "model",     "assetPath": "models/player.glb" },
        { "type": "rigidBody", "rigidBodyType": "kinematicPositionBased",
          "colliders": [{ "type": "capsule", "halfHeight": 0.5, "radius": 0.35 }] }
      ]
    }
  ]
}
```

### BVH-Accelerated FPS Collision

```typescript
import { computeBoundsTree, disposeBoundsTree, acceleratedRaycast } from 'three-mesh-bvh';
import * as THREE from 'three';

THREE.BufferGeometry.prototype.computeBoundsTree = computeBoundsTree;
THREE.BufferGeometry.prototype.disposeBoundsTree = disposeBoundsTree;
THREE.Mesh.prototype.raycast = acceleratedRaycast;

// Build BVH once per level mesh
levelMesh.geometry.computeBoundsTree();

// Sub-millisecond capsule sweep every frame
const result = levelMesh.geometry.boundsTree.capsuleIntersects(levelMesh, playerCapsule);
if (result) playerCapsule.translate(result.normal.multiplyScalar(result.depth));
```

### ECS Systems

```typescript
class PhysicsSystem extends System {
  execute(delta: number) {
    this.queries.bodies.results.forEach(entity => {
      const ref = entity.getComponent(RigidBodyRef)!;
      const pos = entity.getMutableComponent(Transform)!;
      const t   = ref.body.translation();
      pos.position.set(t.x, t.y, t.z);
    });
  }
}
PhysicsSystem.queries = {
  bodies: { components: [RigidBodyRef, Transform] }
};
```

### Multiplayer Snapshot Loop

```
Client                            Server (20 Hz)
  │── PLAYER_INPUT (intent) ────▶│
  │   { seq, forward, left,      │  world.step() (Rapier)
  │     right, backward, jump,   │  broadcast all entity states
  │     yaw, pitch, fire,        │
  │     weaponId, slot,          │
  │     origin, direction }      │
  │◄───── WORLD_SNAPSHOT ───────│
  │  interpolate remote entities  │
  │  predict local player         │
  │◄───── RECONCILE ────────────│  correct if delta > 0.5 units
```

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/my-feature`
3. Install dependencies: `mise install && yarn install`
4. Make changes — follow the patterns described in [`docs/01-architecture.md`](docs/01-architecture.md)
5. Add tests — see [`docs/06-testing.md`](docs/06-testing.md)
6. Ensure all tests pass: `yarn test`
7. Ensure no lint errors: `yarn lint`
8. Open a Pull Request against `main`

### Commit Convention

```
feat:     new feature
fix:      bug fix
docs:     documentation only
refactor: code change with no feature/fix
test:     adding or fixing tests
chore:    build, tooling, deps
```

---

## License

[MIT](LICENSE) © 2026 Grid Engine Contributors

Grid Engine is released under the **MIT License** — free to use in personal,
commercial, and open-source projects.

All runtime dependencies (Three.js, Rapier, three-mesh-bvh, ECSY, Howler.js,
Socket.IO, React, Redux, Vite) are also MIT licensed. TypeScript is used only
as a build-time tool and is never bundled into engine output.

Full third-party license texts are reproduced in [`LICENSE`](LICENSE).

---



**Built with Three.js · Rapier · three-mesh-bvh · ECSY · Howler.js · Socket.IO**

[Read the Docs](docs/00-overview.md) · [Engine API](docs/03-engine-api.md) · [Multiplayer](docs/04-multiplayer-socketio.md) · [Editor](docs/05-editor-react-vite.md) · [Example Game](docs/09-example-game.md) · [References](docs/08-references-and-resources.md)

