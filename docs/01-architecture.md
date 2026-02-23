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
│  │  Input   │ polls events    │  │   └─ SoundComp.   │   │
│  │  Manager │◀──────────────  │                      │   │
│  └──────────┘                 │  └─ GameObjects[]    │   │
│  ┌──────────┐                 └─────────────────────┘    │
│  │  Network │ Socket.IO                                   │
│  │  Manager │◀──────────────────────────────────────────▶│
│  └──────────┘                                            │
│                                                         │
│  ┌─────────────────────────────────────────────────────┐ │
│  │  BVH Layer (three-mesh-bvh) — accelerates:          │ │
│  │  · capsule sweep (player vs. level mesh)            │ │
│  │  · raycasting (weapon hitscan, interaction)         │ │
│  └─────────────────────────────────────────────────────┘ │
│                                                         │
│  ┌─── ECSY ECS World — MANDATED for v1.0.0 ───────────┐ │
│  │  Games MUST use ECSY to organise per-frame logic:   │ │
│  │  PhysicsSystem, MovementSystem, AudioSystem, etc.   │ │
│  │  The engine re-exports ECSY. See § ECS Pattern.     │ │
│  └─────────────────────────────────────────────────────┘ │
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
  └─ SoundComponent       – loads audio, creates THREE.PositionalAudio
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
2. **Scene.beforeRender(deltaTimeInSec)** – iterates all `GameObjects` recursively, calling `gameObject.beforeRender(delta)` on each, which in turn calls `component.beforeRender(delta)` for each component. Games that use ECSY should call `ecsWorld.execute(delta)` inside a `beforeRender` callback or a custom `Renderer.beforeRender` hook.
3. **Physics step (fixed timestep)** – physics uses a fixed timestep of `1/60` seconds to ensure deterministic simulation. A time accumulator decouples the physics rate from the render rate:
   ```typescript
   const FIXED_DT = 1 / 60;
   accumulator += deltaTimeInSec;
   while (accumulator >= FIXED_DT) {
     scene.rapierWorld.step();  // no argument = uses world.timestep
     accumulator -= FIXED_DT;
   }
   ```
   This is critical for server-authority multiplayer: both the client and server must agree on the physics timestep.
4. **Physics sync** – for every `RigidBodyComponent`, the new Rapier translation/rotation is written back to the corresponding `THREE.Group`.
5. **renderer.threeJSRenderer.render(scene, camera)** – renders the frame.
6. **NetworkManager tick** (if connected) – sends the local player input snapshot to the server.

---

## Rendering

- Uses `THREE.WebGLRenderer` with `antialias: true`.
- Shadow maps are **disabled by default** for performance (`renderer.shadowMap.enabled = false`); enable explicitly if your game requires them.
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

Collider shapes supported: `ball`, `capsule`, `cuboid`, `cylinder`, `cone`, `trimesh`, `heightfield`, `convexHull`, and their `round*` variants (`roundCuboid`, `roundCylinder`, `roundCone`, `roundConvexHull`). See [`docs/03-engine-api.md` § ColliderType](03-engine-api.md) for the full type union.

After each `rapierWorld.step()`, the engine reads `rigidBody.translation()` and `rigidBody.rotation()` (quaternion) and writes them to the corresponding `THREE.Group`.

---

## Collision: Rapier vs three-mesh-bvh

The engine ships **two** collision systems that serve different purposes. Choosing the wrong one leads to either poor performance or missing physics features.

### Decision Tree

```
Does the object move under physics forces?
│
├─ NO ──→ Use three-mesh-bvh
│         (terrain, walls, static props)
│         Query: raycast, shapecast, closestPoint
│
└─ YES ──→ Does it need force/constraint resolution?
           │
           ├─ YES ──→ Rapier rigid body + collider
           │          (characters, vehicles, debris)
           │
           └─ NO, just detection ──→ Rapier sensor collider
                                     (pickups, trigger zones)
```

### When to use Rapier exclusively (BVH not needed)

- **Character controller** — slopes, steps, jump, gravity
- **Rigid body objects** — crates, barrels, vehicles
- **Projectile physics** — grenades, cannonballs with arc
- **Joints and constraints** — doors, chains, ragdolls
- **Sensor volumes** — trigger zones, area-of-effect detection

### When to use three-mesh-bvh

- **Static level geometry** — terrain, walls, floors, buildings
- **Hitscan weapons** — fast raycasts against complex meshes (sub-ms even on 100K+ triangle levels)
- **Capsule sweeps** — player movement collision against static world
- **Closest-point queries** — interaction prompts, proximity detection against static surfaces

### Both systems together

In practice, an FPS game uses **both** every frame:

| System | Responsibility | Examples |
|---|---|---|
| `three-mesh-bvh` | Geometric queries against **static** level mesh | Player capsule sweep, weapon raycasts, ground detection |
| Rapier | **Dynamic** physics simulation + sensors/triggers | Character controller gravity, prop physics, trigger zones, server-authority simulation |

### BVH Lifecycle

BVH trees are built **once** per level mesh after loading (`geometry.computeBoundsTree()`) and disposed on scene unload (`geometry.disposeBoundsTree()`). They must never be rebuilt mid-match — all static geometry must be finalized before the BVH build.

---

## Player Movement Pipeline

For first-person character controllers, the per-frame movement pipeline is:

1. **Read input** → compute desired velocity from `InputManager` (WASD + gravity).
2. **BVH capsule sweep** → sweep the player capsule against the level mesh via `boundsTree.capsuleIntersects()`. Resolve penetrations by pushing the capsule out along the collision normal.
3. **Ground detection** → if the collision normal points mostly upward (`normal.y > 0.5`), the player is on ground; zero out downward velocity.
4. **Set Rapier kinematic body** → write the resolved position to the Rapier `kinematicPositionBased` rigid body via `body.setNextKinematicTranslation()`. This keeps Rapier's broadphase in sync for sensor/trigger detection and server-authority simulation.
5. **Sync THREE.Group** → camera/model position is set from the Rapier body translation (happens automatically in step 4 of the engine loop).

```
Input → BVH sweep → resolve → Rapier kinematic set → physics step → THREE.Group sync
```

> **Note:** Remote players (interpolated from server snapshots) skip steps 1–3. Their `THREE.Group` position is set directly from the interpolated snapshot.

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

Controllers read from `InputManager` each frame, compute desired velocity, and run the [Player Movement Pipeline](#player-movement-pipeline) to resolve collisions via BVH before syncing with Rapier.

---

## Tags and UserData

`GameObject` supports two free-form metadata mechanisms:

- **`tags: string[]`** — query labels for game-level logic. The engine defines no built-in tags; all tags are game-specific (e.g. `"destructible"`, `"interactable"`, `"spawn_point"`). Use `scene.findGameObjectsByTag(tag)` to query them.
- **`userData: Record<string, unknown>`** — an opaque key-value bag for per-instance game-specific data. The engine passes `userData` through without interpreting it. Common uses: health, team ID, damage multiplier, dialogue trigger text.

Semantically, `tags` answer "what kind of thing is this?" while `userData` answers "what are its specifics?".

---

## ECS Pattern

The engine re-exports [ECSY](https://ecsy.io) and [ecsy-three](https://github.com/ecsyjs/ecsy-three) as convenience dependencies. Games **must** use ECSY (v1.0.0 mandate) to structure their per-frame gameplay logic as Systems and Components. The engine's core loop (`Game` → `Scene` → `GameObject` → `Component.beforeRender()`) does **not** internally depend on ECSY — ECSY is the game-layer pattern on top of it.

To integrate ECSY, create an `ecsy.World` in your game's bootstrap code and call `world.execute(delta)` from a `Renderer.beforeRender` hook or from a root `GameObject.beforeRender()` override.

> **Archival note:** ECSY is archived (no longer actively developed by Mozilla) but is stable and complete. **While archived, ECSY is strictly mandated for v1.0.0** to match the architecture diagrams and prototype examples. The ECS *pattern* it provides is portable — if ECSY becomes unmaintained, future major versions might migrate to [bitECS](https://github.com/NateTheGreatt/bitECS) or a custom implementation with minimal architecture changes.

---

## Scene Transition Lifecycle

When `Game.loadScene(name)` is called while a scene is already loaded, the engine performs the following teardown-and-load sequence:

1. **Stop animation loop** — `Renderer.stop()` pauses `setAnimationLoop`.
2. **Unload all GameObjects** — recursively calls `gameObject.unload()` on every object in the scene tree. Each component's resources are released (models removed from scene graph, audio stopped).
3. **Remove all Rapier rigid bodies** — iterates all `RigidBodyComponent` instances and calls `rapierWorld.removeRigidBody(body)`. Then calls `rapierWorld.free()` to release the WASM world memory.
4. **Dispose Three.js resources** — calls `.dispose()` on all geometries, materials, and textures that were loaded for this scene. BVH trees are disposed via `geometry.disposeBoundsTree()`.
5. **Clear Three.js scene** — removes all children from `threeJSScene`.
6. **NetworkManager** — stays connected (if active). The game is responsible for emitting `LEAVE_ROOM` or handling room transitions.
7. **Load new scene** — creates a fresh `Scene` instance, initialises new `RAPIER.World`, loads the new scene JSON, and recursively loads all GameObjects.
8. **Resume animation loop** — `Renderer.start()` resumes `setAnimationLoop`.

> If the game uses ECSY, it should reset the ECSY `World` (remove all entities and re-register systems) between scenes.

---

## Settings

`Settings` is a static class that serialises a key-value settings object to `localStorage`. It uses a debounced save to avoid excessive writes. It fires `CHANGE` events so UI can react. Game-specific keys are defined via `_getInitialSettings()` (override in your game subclass or replace the implementation).