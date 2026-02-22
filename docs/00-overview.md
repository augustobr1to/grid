# 00 – Project Overview

## Purpose

This project is a lightweight, TypeScript-first **3D game engine** for the web browser. It composes three well-maintained open-source libraries into a single coherent developer workflow:

| Library | Role |
|---|---|
| [Three.js](https://threejs.org) | 3D rendering via WebGL |
| [@dimforge/rapier3d-compat](https://rapier.rs) | High-performance physics simulation (WASM) |
| [three-mesh-ui](https://github.com/felixmariotto/three-mesh-ui) | In-world 3D UI panels |

The engine is delivered as a **Yarn workspaces monorepo** containing three packages: the engine library itself (`packages/engine`), a playable example game (`packages/game`), and a visual scene/scenario editor (`packages/editor`).

---

## Goals

1. Provide a minimal, composable API where a **Scene** holds **GameObjects** and each GameObject is the source of truth for both rendering (Three.js `Group`) and physics (Rapier `RigidBody` + colliders).
2. Ship a TypeScript-first library with strict types exported alongside the compiled JavaScript so consumers get full IDE intellisense.
3. Support a **data-driven** workflow: scenes and game-object types are described in plain JSON files that the engine loads at runtime. This same JSON is what the editor reads and writes.
4. Include a first-class **multiplayer** layer via Socket.IO (authoritative server model).
5. Provide a **React + Vite** visual scene editor as a workspace package.
6. Run cleanly on **Node 18.18.2** managed by `mise`.

---

## Non-Goals (explicitly excluded)

- **No VR / WebXR support.** All `enableVR`, `VRMode`, WebXR session management, hand-tracking, and controller code is intentionally omitted. Do not re-introduce any WebXR APIs.
- No Cordova / mobile native packaging.
- No Electron desktop packaging.
- No server-side rendering (the engine targets the browser canvas only).
- No built-in level editor shipped as a deployable web page (the editor is a dev-time tool only).

---

## Guiding Principles

- **Composition over inheritance** – GameObjects gain capabilities through *Components*, not deep class hierarchies.
- **Data-driven scenes** – the full state of a scene is expressible as a plain JSON document; no scene logic belongs only in code.
- **Zero lock-in to underlying libs** – Three.js, Rapier, and three-mesh-ui are re-exported from `packages/engine` so consumers never need to install them separately, but they are not hidden.
- **TypeScript everywhere** – the library builds with `tsc` and ships `.d.ts` files; the editor is also full TypeScript.
- **Fail loudly** – invalid configurations throw descriptive errors at load time rather than producing silent visual bugs.

---

## Dependency Matrix

| Package | Prod dep | Version constraint |
|---|---|---|
| `three` | engine | `^0.168.0` |
| `@dimforge/rapier3d-compat` | engine | `^0.11.2` |
| `three-mesh-ui` | engine | `^6.5.4` |
| `socket.io-client` | engine | `^4.x` |
| `socket.io` | server | `^4.x` |
| `react` | editor | `^18.x` |
| `react-dom` | editor | `^18.x` |
| `vite` | editor, game | `^5.x` |
| `typescript` | all workspaces (dev) | `^5.2` |
| `jest` | root (dev) | `^29.x` |
| `vitest` | editor, game (dev) | `^1.x` |

---

## Runtime requirements

```
Node  = 18.18.2   (managed via mise)
Yarn  = 3.6.3     (Berry, node-modules linker)
```