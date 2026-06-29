```
  ██████╗ ██████╗ ██╗██████╗
 ██╔════╝ ██╔══██╗██║██╔══██╗
 ██║  ███╗██████╔╝██║██║  ██║
 ██║   ██║██╔══██╗██║██║  ██║
 ╚██████╔╝██║  ██║██║██████╔╝
  ╚═════╝ ╚═╝  ╚═╝╚═╝╚═════╝
```

**Browser-first 3D game engine foundation for React, Three.js, shaders, and multiplayer games.**

Powered by **React** · **Three.js** · **Rapier** · **three-mesh-bvh** · **Colyseus** · **Vite** · **pnpm** · **Nx**

[![Node 22](https://img.shields.io/badge/node-22-brightgreen?logo=node.js)](https://nodejs.org)
[![pnpm 10](https://img.shields.io/badge/pnpm-10-orange?logo=pnpm)](https://pnpm.io)
[![Nx](https://img.shields.io/badge/Nx-monorepo-blue)](https://nx.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue?logo=typescript)](https://www.typescriptlang.org)
[![Three.js](https://img.shields.io/badge/Three.js-r168-black?logo=three.js)](https://threejs.org)
[![Rapier](https://img.shields.io/badge/Rapier-0.11-orange)](https://rapier.rs)
[![License: MIT](https://img.shields.io/badge/license-MIT-green)](LICENSE)

</div>

---

## Current Stack

This repo now uses `mise` for Node/pnpm versions, `pnpm` workspaces, and `Nx` for monorepo task orchestration.

```bash
pnpm install
pnpm build
pnpm test
pnpm dev:www
pnpm dev:server
```

Workspace highlights:

- `apps/www`: React + Vite engine landing page with shadcn-compatible structure and live Three.js shader preview.
- `apps/server`: Colyseus authoritative multiplayer server on `ws://localhost:2567`.
- `apps/socketio-server`: legacy Socket.IO authoritative server kept for compatibility.
- `apps/editor`: React + Vite scene editor.
- `apps/game`: existing Vite browser game example.
- `packages/engine`: Three.js/Rapier runtime, shader materials, asset loading, input, legacy Socket.IO, and Colyseus client manager.
- `packages/shared`: shared multiplayer protocol types.

`mise exec` requires trusting this repo config first: `mise trust`.

---

## What is Grid?

**Grid** is a lightweight, TypeScript-first 3D game engine built exclusively for **first-person multiplayer browser games**. It composes battle-tested open-source libraries into a coherent, data-driven developer workflow:

| Library | Role |
|---|---|
| [Three.js](https://threejs.org) | WebGL rendering — scene graph, lights, models, animations |
| [Rapier](https://rapier.rs) | WASM physics — rigid bodies, character controller, colliders |
| [three-mesh-bvh](https://github.com/gkjohnson/three-mesh-bvh) | BVH-accelerated raycasting — sub-ms FPS collision on complex geometry |
| [Colyseus](https://colyseus.io) | Authoritative multiplayer server + client state sync |
| [PeerJS](https://peerjs.com) | _(planned)_ P2P WebRTC voice chat between players |

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
- 🧩 **Scene → GameObject → Component model** — composition over inheritance; components own data and behaviour
- 🔊 **Spatial audio** — `SoundComponent` uses Three.js `AudioLoader` + `PositionalAudio` for in-world 3D sound
- 🌐 **Authoritative multiplayer** — Colyseus server owns the simulation; client `ColyseusNetworkManager` + `Interpolator` sync remote entities
- 🌌 **Default Tron look** — engine renderer ships ACES filmic tone mapping + `UnrealBloom` post-processing with a dark/neon default palette (opt-out via renderer options)
- 🖊️ **Visual editor** — React + Vite scene editor with live hot-reload viewport, inspector, and transform gizmo
- 📦 **pnpm + Nx monorepo** — deployables in `apps/*`, reusable libraries in `packages/*`
- 🦺 **TypeScript first** — strict types throughout; engine ships `.d.ts` declaration files
- ✅ **Engine tests** — Jest covers `packages/engine` (Scene, GameObject, InputManager, Interpolator) with Three.js and Rapier mocked for Node.js. No editor/game test suites yet — _TODO_.

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

# Activate pinned Node 22 + pnpm 10
mise trust && mise install

# Verify versions
node --version
pnpm --version

# Install all workspace dependencies
pnpm install
```

### Run the Example Game

```bash
pnpm dev:game
# → http://localhost:5173
```

### Run the Scene Editor

```bash
pnpm dev:editor
# → http://localhost:5174
# Click "Open Project" and select the apps/game/public folder
```

### Run the Multiplayer Server

```bash
pnpm dev:server
# → ws://localhost:2567

# Legacy Socket.IO server:
pnpm dev:socketio-server
# → ws://localhost:3333
```

### Run All Tests

```bash
pnpm test
```

### Build Everything

```bash
pnpm build
# builds Nx projects in apps/* and packages/*
```

---

## Monorepo Structure

```
grid-engine/
│
├── .gitignore
├── mise.toml                 ← pins Node + pnpm
├── nx.json                   ← Nx task graph config
├── package.json              ← workspace root
├── pnpm-workspace.yaml       ← workspace globs
├── tsconfig.base.json        ← shared TypeScript config
├── LICENSE                   ← MIT — see third-party notices inside
│
├── apps/
│   ├── www/                  ← landing page (@thegridcn/www)
│   ├── server/               ← Colyseus server (@thegridcn/server)
│   ├── socketio-server/      ← legacy Socket.IO server (@thegridcn/socketio-server)
│   ├── editor/               ← scene editor (@thegridcn/editor)
│   └── game/                 ← browser game example (@thegridcn/game)
│
├── packages/
│   ├── engine/               ← reusable engine library (@thegridcn/engine)
│   └── shared/               ← shared protocol types (@thegridcn/shared)
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
└── tests/                    ← Jest cross-package tests and mocks
```

---

## Packages

### `packages/engine` — `@thegridcn/engine`

The publishable library. Import it in any project:

```typescript
import { Game, Scene, GameObject } from '@thegridcn/engine';

const game = new Game('/assets', {
  rendererOptions: { setupFullScreenCanvas: true },
});

await game._init();
await game.loadScene('level1');
```

**Public API exports:**

```typescript
// Core
export { Game, Scene, GameObject, Component, Renderer, Settings, Logger }

// Controllers
export { CharacterController, KinematicCharacterController, DynamicCharacterController }
export { EventEmitter }
export { generateId, deepMerge, clamp }

// Multiplayer
export { ColyseusNetworkManager, Interpolator }
export { NetworkManager }            // legacy Socket.IO client (deprecated)

// Input
export { InputManager }

// Assets
export { AssetStore, Asset, GLTFAsset, JSONAsset, TextureAsset, SoundAsset }

// Components
export { ModelComponent, RigidBodyComponent, LightComponent, SoundComponent }

// Physics / UI helpers
export { createColliderDesc, createRigidBodyDesc }
export { createCrosshair, anchorHUD }

// Shaders (Tron-style materials)
export {
  ShaderLibrary, shaderLibrary,
  createHologramMaterial, createGridPulseMaterial, advanceShaderTime,
}

// Re-exported underlying library
export * as THREE from 'three'

// Types
export type {
  GameOptions, RendererOptions, CameraOptions, InputOptions,
  SceneJSON, GameObjectJSON, ComponentJSON,
  ColyseusNetworkOptions, NetworkOptions, PlayerSnapshot, GameSnapshot,
  Vec3, Quat, Transform,
}
```

> The default `ColyseusNetworkManager` is the authoritative transport. The
> Socket.IO–based `NetworkManager` is retained only as a legacy/compatibility
> client and is deprecated.

See [`docs/03-engine-api.md`](docs/03-engine-api.md) for the full TypeScript API surface.

---

### `apps/game` — Example Game

A complete Vite app demonstrating the engine in a playable first-person scenario. Use this as a reference for wiring up the engine in your own project.

```bash
pnpm nx run @thegridcn/game:dev      # development server
pnpm nx run @thegridcn/game:build    # production build
```

---

### `apps/editor` — Scene Editor

A React + Vite visual editor for creating and editing scenes without touching JSON directly. Opens a project folder from disk via the File System Access API, shows a live Three.js viewport, and writes changes back to JSON in real time.

```bash
pnpm nx run @thegridcn/editor:dev    # development server → http://localhost:5174
pnpm nx run @thegridcn/editor:build  # production static build
```

**Editor features:**
- Scene graph tree view with drag-and-drop reordering
- Inspector panel for transforms, components, and scene settings
- Live Three.js viewport with hot-reload (change JSON → GameObject reloads instantly)
- Transform gizmo (translate / rotate / scale) using `THREE.TransformControls`
- Auto-save with 1 s debounce via the File System Access API
- Redux Toolkit state with action log (undo/redo is architecturally supported but not yet implemented in v1)

---

### `apps/server` — Multiplayer Server

Primary Colyseus authoritative game server. Legacy Socket.IO server remains at `apps/socketio-server` for compatibility.

```bash
pnpm nx run @thegridcn/server:dev
pnpm nx run @thegridcn/socketio-server:dev
```

---

## Tooling

### Runtime Version Management — `mise`

```toml
# mise.toml
[tools]
node = "22"
pnpm = "10.14.0"
```

```bash
mise trust && mise install   # installs exact versions
```

### Package Manager — pnpm 10

```yaml
# pnpm-workspace.yaml
packages:
  - "apps/*"
  - "packages/*"
```

### Build — TypeScript + Vite

| Package | Build command | Output |
|---|---|---|
| `packages/engine` | `vite build` | `packages/engine/dist/` |
| `apps/game` | `vite build` | `apps/game/dist/` |
| `apps/editor` | `vite build` | `apps/editor/dist/` |
| `apps/server` | `tsc --project tsconfig.json` | `apps/server/dist/` |

### Linting

```bash
pnpm lint            # Nx lint where targets exist
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
| [`docs/09-example-game.md`](docs/09-example-game.md) | Grid War: full design and implementation spec for the reference FPS game in `apps/game` |
| [`docs/10-current-workspace.md`](docs/10-current-workspace.md) | Current pnpm/Nx workspace layout and project boundary rules |

---

## Scripts Reference

Run from the **repo root** unless noted.

```bash
# ── Development ──────────────────────────────────────────────────
pnpm dev:game          # Vite dev server for the example game (port 5173)
pnpm dev:editor        # Vite dev server for the scene editor (port 5174)
pnpm dev:www           # Landing page (port 5172)
pnpm dev:server        # Colyseus server (port 2567)

# ── Build ────────────────────────────────────────────────────────
pnpm build             # Build all Nx projects
pnpm nx run @thegridcn/engine:build
pnpm nx run @thegridcn/game:build
pnpm nx run @thegridcn/editor:build

# ── Test ─────────────────────────────────────────────────────────
pnpm test              # Run Nx test targets

# ── Lint ─────────────────────────────────────────────────────────
pnpm lint              # Run Nx lint targets where configured

# ── Multiplayer servers ──────────────────────────────────────────
pnpm dev:server              # Colyseus (port 2567)
pnpm dev:socketio-server     # Legacy Socket.IO (port 3333)

# ── Utilities ────────────────────────────────────────────────────
pnpm nx show projects        # List Nx projects
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
│   └── ColyseusNetworkManager (Colyseus client)      │
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
└─────────────────────────────────────────────────────┘
          ▲                          ▲
          │ Colyseus (ws)            │ File System
          ▼                          ▼ Access API
   Multiplayer Server          Scene Editor (React)
   (Colyseus/Rapier)          (apps/editor)
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
3. Install dependencies: `mise install && pnpm install`
4. Make changes — follow the patterns described in [`docs/01-architecture.md`](docs/01-architecture.md)
5. Add tests — see [`docs/06-testing.md`](docs/06-testing.md)
6. Ensure all tests pass: `pnpm test`
7. Ensure no lint errors: `pnpm lint`
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

All runtime dependencies (Three.js, Rapier, three-mesh-bvh, Colyseus, React,
Redux, Vite) are also MIT licensed. TypeScript is used only as a build-time
tool and is never bundled into engine output.

Full third-party license texts are reproduced in [`LICENSE`](LICENSE).

---



**Built with Three.js · Rapier · three-mesh-bvh · Colyseus**

[Read the Docs](docs/00-overview.md) · [Engine API](docs/03-engine-api.md) · [Multiplayer](docs/04-multiplayer-socketio.md) · [Editor](docs/05-editor-react-vite.md) · [Example Game](docs/09-example-game.md) · [References](docs/08-references-and-resources.md)
