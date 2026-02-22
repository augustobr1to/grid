# 01 – Architecture

## High-Level Diagram

```
┌─────────────────────────────────────────────────────────┐
│  Browser Tab                                            │
│                                                         │
│  ┌──────────┐   loadScene()   ┌──────────────────────┐  │
│  │  Game    │───────────────▶ │  Scene               │  │
│  │  (root)  │                 │  ├─ ThreeJS Scene     │  │
│  └──────────┘                 │  ├─ Rapier World      │  │
│       │                       │  └─ GameObjects[]     │  │
│       │ owns                  └──────────────────────┘  │
│  ┌──────────┐                        │ each             │
│  │ Renderer │◀───render(scene)────── │                  │
│  │ (THREE)  │                 ┌──────▼──────────────┐   │
│  └──────────┘                 │  GameObject          │   │
│  ┌──────────┐                 │  ├─ threeJSGroup     │   │
│  │  Asset   │ loads assets    │  ├─ Components[]     │   │
│  │  Store   │◀───────────────▶│  │   ├─ ModelComp.  │   │
│  └──────────┘                 │  │   ├─ RigidBody    │   │
│  ┌──────────┐                 │  │   ├─ LightComp.   │   │
│  │  Input   │ polls events    │  │   ├─ SoundComp.   │   │
│  │  Manager │◀──────────────  │  │   └─ UIComp.      │   │
│  └──────────┘                 │  └─ GameObjects[]    │   │
│  ┌──────────┐                 └─────────────────────┘    │
│  │  Network │ Socket.IO                                   │
│  │  Manager │◀──────────────────────────────────────────▶│
│  └──────────┘                                            │
└─────────────────────────────────────────────────────────┘
```

---

## Core Classes

### `Game`
The singleton entry point. Consumers instantiate exactly one `Game` per browser tab.

**Responsibilities:**
- Accept a base URL string (for HTTP asset loading) or a `FileSystemDirectoryHandle` (for local file access via the File System Access API).
- Load `game.json` which declares the initial scene name and a map of named game-object types to their JSON asset paths.
- Maintain a cache of loaded `GameObjectType` JSON assets (re-used by all instances of that type).
- Own the `Renderer`, `AssetStore`, and `InputManager`.
- Expose `loadScene(name: string): Promise<void>` which tears down the current scene and loads the named one.
- Expose `registerGameObjectClasses(map)` so application code can bind custom `GameObject` subclasses to type strings.

**game.json schema:**
```json
{
  "initialScene": "level1",
  "scenes": {
    "level1": "scenes/level1.json",
    "menu":   "scenes/menu.json"
  },
  "gameObjectTypes": {
    "player":  "types/player.json",
    "crate":   "types/crate.json"
  }
}
```

---

### `Scene`
A Scene owns a `THREE.Scene` and a `RAPIER.World`.

**Load sequence (async):**
1. Load the scene's JSON asset from the `AssetStore`.
2. Construct `THREE.Scene`, apply background colour / fog.
3. Create `THREE.Light` objects from the `lights` array in JSON.
4. Load audio files declared in the `sounds` array.
5. Call `RAPIER.init()` (idempotent singleton init).
6. Create `RAPIER.World` with the gravity vector from JSON (default `{x:0, y:-9.8, z:0}`).
7. Recursively create and `load()` all `GameObjects` from the `gameObjects` array.

**scene JSON schema:**
```json
{
  "background": "#87CEEB",
  "fog": { "color": "#ffffff", "near": 10, "far": 200 },
  "gravity": { "x": 0, "y": -9.8, "z": 0 },
  "lights": [
    { "type": "AmbientLight", "color": "#ffffff", "intensity": 0.4 },
    { "type": "DirectionalLight", "position": { "x": 5, "y": 10, "z": 5 } }
  ],
  "sounds": [
    { "name": "ambient", "assetPath": "audio/ambient.mp3", "loop": true, "autoplay": true, "volume": 0.3 }
  ],
  "gameObjects": [ ]
}
```

---

### `GameObject`
A `GameObject` is the fundamental entity in a scene. It maps to:
- A `THREE.Group` in the Three.js scene graph (position, rotation, scale live here).
- Zero or one `RAPIER.RigidBody` (contributed by a `RigidBodyComponent`).

**Key behaviours:**
- Constructed with a parent (`Scene | GameObject`) enabling a **tree hierarchy**.
- Has an optional `type` string. If set, the engine looks up the corresponding type JSON asset, merges it with the instance's own JSON, and sets up components from the merged result.
- Hot-reload: if a type JSON asset changes on disk (editor workflow), the `GameObject` is automatically reset and reloaded.
- Exposes `getScene()` which traverses up the parent chain.
- Exposes `beforeRender(deltaTimeInSec)` which is called each frame; this delegates to all components and custom subclass overrides.

**gameObject JSON schema:**
```json
{
  "name": "crate1",
  "type": "crate",
  "position": { "x": 2, "y": 1, "z": -5 },
  "rotation": { "x": 0, "y": 0.785, "z": 0, "order": "XYZ" },
  "scale": { "x": 1, "y": 1, "z": 1 },
  "tags": ["destructible"],
  "userData": {},
  "components": [],
  "children": []
}
```

---

### `Component` (abstract base)
Components are JSON-declared behaviours attached to a `GameObject`.

```
abstract Component
  ├─ ModelComponent       – loads a GLTF/GLB model and adds it to the ThreeJS group
  ├─ RigidBodyComponent   – creates a Rapier RigidBody + colliders
  ├─ LightComponent       – creates a THREE.Light and adds it to the group
  ├─ SoundComponent       – loads audio, creates THREE.PositionalAudio
  └─ UserInterfaceComponent – creates three-mesh-ui panels
```

Each component implements:
- `load(): Promise<void>` – called once when the parent `GameObject` loads.
- `beforeRender({ deltaTimeInSec: number }): void` – called every frame (no-op in base class).

Custom components can be registered:
```typescript
GameObject.registerClassForComponentType('healthBar', HealthBarComponent);
```

---

## Engine Loop

The render loop is managed by `Renderer` using `THREE.WebGLRenderer.setAnimationLoop`. On each tick:

1. **InputManager.beforeRender()** – reads gamepad state.
2. **Scene.beforeRender(deltaTimeInSec)** – iterates all `GameObjects` recursively, calling `gameObject.beforeRender(delta)` on each, which in turn calls `component.beforeRender(delta)` for each component.
3. **Physics step** – `scene.rapierWorld.step()` advances the physics simulation by `deltaTimeInSec`.
4. **Physics sync** – for every `RigidBodyComponent`, the new Rapier translation/rotation is written back to the corresponding `THREE.Group`.
5. **ThreeMeshUI.update()** – updates any active UI panels.
6. **renderer.threeJSRenderer.render(scene, camera)** – renders the frame.
7. **NetworkManager tick** (if connected) – sends the local player snapshot to the server.

---

## Rendering

- Uses `THREE.WebGLRenderer` with `antialias: true`, shadow maps enabled.
- Camera is a `THREE.PerspectiveCamera` (fov=50, near=0.01, far=1000 by default).
- An `THREE.AudioListener` is attached to the camera for positional audio.
- The renderer canvas can be attached to any `<canvas>` element or a full-screen canvas can be auto-created.
- **No VR/WebXR renderer path** – the `enableVR` option and `VRMode` class do not exist.

---

## Physics Integration

Rapier is a WASM-based physics engine. Its wasm binary is initialized **once** via `RAPIER.init()` before the first scene loads. Each `Scene` owns its own `RAPIER.World` so physics state is fully isolated between scenes.

**RigidBodyComponent** creates a `RAPIER.RigidBody` at load time and positions it at the `THREE.Group`'s initial world position. Supported rigid body types:
- `dynamic` – affected by forces and gravity.
- `fixed` – static immovable collider.
- `kinematicPositionBased` – moved programmatically; physics reacts.
- `kinematicVelocityBased` – moved via velocity; physics reacts.

Collider shapes supported: `ball`, `capsule`, `cuboid`, `cylinder`, `cone`, `trimesh`, `heightfield`, `convexHull`, and their `round*` variants.

After each `rapierWorld.step()`, the engine reads `rigidBody.translation()` and `rigidBody.rotation()` (quaternion) and writes them to the corresponding `THREE.Group`.

---

## Asset Pipeline

`AssetStore` is a path-keyed cache. Calling `assetStore.load('path/to/file.ext')` will:
1. Check cache; return existing asset if already loaded.
2. Instantiate the correct `Asset` subclass based on file extension.
3. Call `asset.load()` which uses the appropriate Three.js loader.
4. Cache and return the asset.

| Extension | Asset class | Three.js loader used |
|---|---|---|
| `.gltf`, `.glb` | `GLTFAsset` | `GLTFLoader` (+ optional `DRACOLoader`) |
| `.png`, `.jpg`, `.bmp` | `TextureAsset` | `THREE.TextureLoader` |
| `.wav`, `.mp3`, `.ogg` | `SoundAsset` | `THREE.AudioLoader` |
| `.json` | `JSONAsset` | `THREE.FileLoader` |

Assets may also be loaded from a `FileSystemDirectoryHandle` (used by the editor's local file workflow) – in this case `URL.createObjectURL()` is used to bridge the File API to the URL-based Three.js loaders.

---

## Input System

`InputManager` aggregates:
- `KeyboardHandler` – listens to `window` keydown/keyup; exposes `isKeyDown(key)`.
- `MouseHandler` – optionally requests pointer lock; tracks `movementX`/`movementY` deltas.
- `GamepadHandler` – wraps `navigator.getGamepads()`; exposes axes and button state; called each frame via `beforeRender()`.

Consumers query the manager via `inputManager.readVerticalAxis()`, `readHorizontalAxis()`, `isKeyDown(key)`, etc. Character controllers consume these values to drive movement.

---

## Event System

The engine uses a custom lightweight `EventEmitter` (not Node's built-in – it must work in the browser). It follows the standard `on/off/once/emit` API. `Asset` and `Settings` classes use it to broadcast `change` events. The multiplayer `NetworkManager` also uses it to emit `playerJoined`, `playerLeft`, `stateSnapshot` events.

---

## Character Controllers

Two concrete controller classes extend an abstract `CharacterController` base:

| Class | Rapier character type | Use case |
|---|---|---|
| `KinematicCharacterController` | `KinematicPositionBased` | FPS/TPS characters with gravity handling |
| `DynamicCharacterController` | `Dynamic` | Physics-driven characters (ragdoll-like) |

Controllers read from `InputManager` each frame, compute desired velocity, and apply it to the Rapier rigid body.

---

## Settings

`Settings` is a static class that serialises a key-value settings object to `localStorage`. It uses a debounced save to avoid excessive writes. It fires `CHANGE` events so UI can react. Game-specific keys are defined via `_getInitialSettings()` (override in your game subclass or replace the implementation).