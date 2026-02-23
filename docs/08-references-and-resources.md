# 08 – Library References & Internet Resources

> **Grid Engine** — an AI-built JavaScript game engine for **3D First-Person games**, powered by Three.js + Rapier.
>
> **Purpose of this document:** A single comprehensive reference for every library used in the project. For each library you will find: what it is, why it is in the engine, official documentation links, the best community content on the internet, and a quick-reference API / code cheatsheet. Read this before writing any new engine code.

---

## Table of Contents

1. [Three.js](#1-threejs)
2. [three-mesh-bvh](#2-three-mesh-bvh)
3. [Rapier Physics (`@dimforge/rapier3d-compat`)](#3-rapier-physics)
4. [Howler.js + Three.js Audio](#4-howlerjs--threejs-audio)
5. [ECSY + ecsy-three](#5-ecsy--ecsy-three)
6. [Socket.IO (Client + Server)](#6-socketio)
7. [React 18](#7-react-18)
8. [Redux Toolkit + React-Redux](#8-redux-toolkit--react-redux)
9. [Vite](#9-vite)
10. [TypeScript](#10-typescript)
11. [Jest + ts-jest](#11-jest--ts-jest)
12. [Vitest](#12-vitest)
13. [Yarn Berry (v3)](#13-yarn-berry-v3)
14. [mise](#14-mise)
15. [React Router DOM](#15-react-router-dom)
16. [Supplementary Reading – WebGL, FPS & Game Architecture](#16-supplementary-reading)

---

## 1. Three.js

### Role in Grid Engine
Three.js is the **entire rendering layer**. Every mesh, light, camera, texture, GLTF model, shadow, and animation in the engine is managed through Three.js objects. The `Renderer` class wraps `THREE.WebGLRenderer`; every `GameObject` maps to a `THREE.Group`.

**Version:** `^0.168.0`

### Official Documentation

| Resource | URL |
|---|---|
| API Reference | https://threejs.org/docs/ |
| Manual & Tutorials | https://threejs.org/manual/ |
| Live Examples (600+) | https://threejs.org/examples/ |
| Migration Guide | https://github.com/mrdoob/three.js/wiki/Migration-Guide |
| GitHub | https://github.com/mrdoob/three.js |
| npm | https://www.npmjs.com/package/three |
| Changelog / Releases | https://github.com/mrdoob/three.js/releases |
| Three.js Forum (Discourse) | https://discourse.threejs.org |

### Best Internet Learning Resources

| Resource | Type | Level | URL |
|---|---|---|---|
| **Discover Three.js** (Lewy Blue) | Free book | Beginner → Intermediate | https://discoverthreejs.com |
| **Three.js Journey** (Bruno Simon) | Paid video course | Beginner → Advanced | https://threejs-journey.com |
| **The ThreeJS Primer** (Nik Lever) | Free PDF e-book | Beginner → Intermediate | https://niklever.com/files/the-threejs-primer.pdf |
| Three.js Manual – Tips & Tricks | Official guide | Intermediate | https://threejs.org/manual/#en/tips |
| WebGL Fundamentals | Deep-dive | Intermediate → Advanced | https://webglfundamentals.org |
| WebGL2 Fundamentals | Deep-dive | Intermediate → Advanced | https://webgl2fundamentals.org |
| The Book of Shaders | Interactive GLSL | Intermediate | https://thebookofshaders.com |
| Three.js Resources (curated directory) | Link list | All levels | https://threejsresources.com |

### Discover Three.js – Must-Read Chapters

| Chapter | URL |
|---|---|
| Your First Scene | https://discoverthreejs.com/book/first-steps/first-scene/ |
| The World App (project structure) | https://discoverthreejs.com/book/first-steps/world-app/ |
| The Animation Loop | https://discoverthreejs.com/book/first-steps/animation-loop/ |
| Physically Based Rendering | https://discoverthreejs.com/book/first-steps/physically-based-rendering/ |
| Textures | https://discoverthreejs.com/book/first-steps/textures-intro/ |
| Loading Models (GLTF) | https://discoverthreejs.com/book/first-steps/load-models/ |

### Key API Cheatsheet

```typescript
import * as THREE from 'three';
import { GLTFLoader }  from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import { OrbitControls }       from 'three/examples/jsm/controls/OrbitControls.js';
import { TransformControls }   from 'three/examples/jsm/controls/TransformControls.js';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';

// ── Scene & Renderer ─────────────────────────────────────────────
const scene    = new THREE.Scene();
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // cap at 2× for perf
renderer.outputColorSpace = THREE.SRGBColorSpace;             // r152+ (replaces outputEncoding)
renderer.shadowMap.enabled = true;
renderer.shadowMap.type    = THREE.PCFSoftShadowMap;
renderer.useLegacyLights   = false;                           // r155+ (replaces physicallyCorrectLights)
document.body.appendChild(renderer.domElement);

// ── First-Person Camera ──────────────────────────────────────────
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.01, 1000);
camera.position.set(0, 1.7, 0);   // ~eye height

// ── PointerLock (FPS mouse look) ─────────────────────────────────
const controls = new PointerLockControls(camera, renderer.domElement);
document.addEventListener('click', () => controls.lock());
scene.add(controls.getObject());

// ── Lights ──────────────────────────────────────────────────────
const ambient     = new THREE.AmbientLight(0xffffff, 0.4);
const directional = new THREE.DirectionalLight(0xffffff, 1.0);
directional.position.set(5, 10, 5);
directional.castShadow           = true;
directional.shadow.mapSize.width  = 2048;
directional.shadow.mapSize.height = 2048;
scene.add(ambient, directional);

// ── GLTF / GLB Loader (+ optional Draco compression) ────────────
const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath('/draco/');   // local copy from three/examples/jsm/libs/draco/

const gltfLoader = new GLTFLoader();
gltfLoader.setDRACOLoader(dracoLoader);

const gltf = await gltfLoader.loadAsync('/models/level.glb');
scene.add(gltf.scene);

// Clone skinned meshes correctly (required for GLTF with animations)
const cloned = clone(gltf.scene);

// ── Animation Mixer ──────────────────────────────────────────────
const mixer  = new THREE.AnimationMixer(gltf.scene);
const action = mixer.clipAction(gltf.animations[0]);
action.play();
// each frame: mixer.update(delta)

// ── Render Loop ──────────────────────────────────────────────────
const clock = new THREE.Clock();
renderer.setAnimationLoop(() => {
  const delta = clock.getDelta();
  mixer.update(delta);
  renderer.render(scene, camera);
});

// ── Memory cleanup ───────────────────────────────────────────────
geometry.dispose();
material.dispose();
texture.dispose();
renderer.dispose();
```

### First-Person Game – Important Three.js Features

| Feature | Class / Module | Docs |
|---|---|---|
| FPS mouse look | `PointerLockControls` | https://threejs.org/docs/#examples/en/controls/PointerLockControls |
| Editor orbit camera | `OrbitControls` | https://threejs.org/docs/#examples/en/controls/OrbitControls |
| Editor gizmo | `TransformControls` | https://threejs.org/docs/#examples/en/controls/TransformControls |
| GLTF loading | `GLTFLoader` | https://threejs.org/docs/#examples/en/loaders/GLTFLoader |
| Draco compressed mesh | `DRACOLoader` | https://threejs.org/docs/#examples/en/loaders/DRACOLoader |
| Skinned mesh clone | `SkeletonUtils.clone` | https://threejs.org/docs/#examples/en/utils/SkeletonUtils |
| Positional sound | `THREE.PositionalAudio` | https://threejs.org/docs/#api/en/audio/PositionalAudio |
| Raycasting | `THREE.Raycaster` | https://threejs.org/docs/#api/en/core/Raycaster |
| Frustum culling | automatic via `Mesh.frustumCulled` | https://threejs.org/docs/#api/en/core/Object3D.frustumCulled |

### Performance Best Practices (FPS Games)

| Topic | Recommendation |
|---|---|
| Repeated objects | `THREE.InstancedMesh` – draw thousands in one call |
| Static geometry | `mesh.matrixAutoUpdate = false` |
| Pixel ratio | `renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))` |
| Texture compression | Use KTX2/Basis textures; enable mipmapping |
| Shadows | Limit shadow-casting lights; use `shadow.mapSize = 1024` unless needed larger |
| Memory | Always `.dispose()` geometry, material, texture when removed from scene |
| Draw calls | Merge static geometry with `BufferGeometryUtils.mergeGeometries()` |
| Transparency | Sort transparent objects; minimise overdraw |
| Occlusion | Implement frustum culling per chunk for large open worlds |

---

## 2. three-mesh-bvh

### Role in Grid Engine
`three-mesh-bvh` supercharges collision detection for **first-person movement** by building a Bounding Volume Hierarchy (BVH) over scene meshes. This enables:
- Sub-millisecond raycasts against high-poly terrain/levels
- Capsule-cast character controllers that slide on surfaces and climb steps
- Walkable surface detection via face-normal angle queries
- Bullet / projectile hit detection

Without BVH, raycasting against a complex level mesh is O(n) per triangle — unusable at 60 fps. With BVH it becomes O(log n).

**Version:** `^0.7.0` (install: `npm i three-mesh-bvh`)

### Official Documentation

| Resource | URL |
|---|---|
| GitHub (primary reference) | https://github.com/gkjohnson/three-mesh-bvh |
| README / API reference | https://github.com/gkjohnson/three-mesh-bvh/blob/master/README.md |
| npm | https://www.npmjs.com/package/three-mesh-bvh |
| **Live: First-Person Demo** | https://gkjohnson.github.io/three-mesh-bvh/example/bundle/firstperson.html |
| **Live: Capsule Collision Demo** | https://gkjohnson.github.io/three-mesh-bvh/example/bundle/characterMovement.html |
| Live: All Examples | https://gkjohnson.github.io/three-mesh-bvh/ |

### Best Internet Content

| Resource | URL |
|---|---|
| DEV.to – "Collision detection in Three.js using BVH" | https://dev.to/bandinopla/collision-detection-in-threejs-made-easy-using-bvh-41g5 |
| Three.js Forum – introductory thread | https://discourse.threejs.org/t/three-mesh-bvh-a-plugin-for-fast-geometry-raycasting-and-spatial-queries/26394 |
| gkjohnson capsule collision source | https://github.com/gkjohnson/three-mesh-bvh/blob/master/example/characterMovement.js |

### How It Works

```
Mesh (BufferGeometry)
  └── boundsTree: MeshBVH    ← a tree of Axis-Aligned Bounding Boxes
        ├── node (AABB)
        │     ├── node (AABB)
        │     │     └── leaf (triangle indices)
        │     └── node ...
        └── ...

Query (ray, sphere, capsule, OBB)
  → walks tree → tests only nodes that overlap the query
  → O(log n) instead of O(n triangles)
```

### Setup – Inject Into Three.js Prototype (do once at app start)

```typescript
import * as THREE from 'three';
import {
  computeBoundsTree,
  disposeBoundsTree,
  acceleratedRaycast,
  MeshBVH,
  MeshBVHHelper,
} from 'three-mesh-bvh';

// Patch Three.js so every BufferGeometry gets .computeBoundsTree()
// and every Mesh.raycast() uses BVH automatically
THREE.BufferGeometry.prototype.computeBoundsTree = computeBoundsTree;
THREE.BufferGeometry.prototype.disposeBoundsTree = disposeBoundsTree;
THREE.Mesh.prototype.raycast = acceleratedRaycast;
```

### Building a BVH for a Level Mesh

```typescript
// After loading your level GLTF:
levelMesh.geometry.computeBoundsTree({
  // optional tuning:
  maxLeafTris: 20,    // fewer = faster queries, larger tree
  strategy: 0,        // 0 = CENTER, 1 = AVERAGE, 2 = SAH (best quality)
});

// When the mesh is unloaded:
levelMesh.geometry.disposeBoundsTree();
```

### Accelerated Raycast (weapon fire, interaction)

```typescript
const raycaster = new THREE.Raycaster();
raycaster.firstHitOnly = true;   // IMPORTANT: stop at first hit for perf

raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);  // centre screen

const hits = raycaster.intersectObject(levelMesh, true);
if (hits.length > 0) {
  const { point, face, object } = hits[0];
  console.log('Hit at', point, 'normal', face?.normal);
}
```

### First-Person Capsule Character Controller

This is the **core pattern for FPS movement** in Grid Engine. A capsule collider represents the player; each frame the capsule is swept against the level BVH and any penetration is resolved.

```typescript
import { Capsule } from 'three/examples/jsm/math/Capsule.js';
import { MeshBVH } from 'three-mesh-bvh';

// Player capsule (start, end, radius)
const playerCapsule = new Capsule(
  new THREE.Vector3(0, 0.35, 0),   // bottom sphere centre
  new THREE.Vector3(0, 1.35, 0),   // top sphere centre
  0.35                              // radius
);

let playerVelocity = new THREE.Vector3();
let onGround = false;
const GRAVITY = -30;

function updatePlayer(deltaTime: number) {
  // Apply gravity
  if (!onGround) playerVelocity.y += GRAVITY * deltaTime;

  // Move capsule
  playerCapsule.translate(playerVelocity.clone().multiplyScalar(deltaTime));

  // Resolve collisions against level BVH
  onGround = resolveCollision(playerCapsule, levelMesh);

  // Sync camera to capsule top
  camera.position.copy(playerCapsule.end);
}

function resolveCollision(capsule: Capsule, mesh: THREE.Mesh): boolean {
  const result = mesh.geometry.boundsTree.capsuleIntersects(
    mesh,          // mesh (provides matrixWorld)
    capsule
  );

  if (!result) return false;

  const { depth, normal } = result;

  // Push player out of collision along normal
  if (depth >= 1e-10) {
    capsule.translate(normal.clone().multiplyScalar(depth));
  }

  // If normal points mostly upward → player is on ground
  const isGround = normal.dot(new THREE.Vector3(0, 1, 0)) > 0.5;
  if (isGround) playerVelocity.y = Math.max(0, playerVelocity.y);

  return isGround;
}
```

### Walkable Surface Detection

```typescript
// Cast a ray downward from player feet to check ground angle
const downRay = new THREE.Ray(
  playerCapsule.start.clone(),    // from feet
  new THREE.Vector3(0, -1, 0)
);

const hit = levelMesh.geometry.boundsTree.raycastFirst(downRay, levelMesh.matrixWorld);

if (hit && hit.face) {
  const slope = hit.face.normal.dot(new THREE.Vector3(0, 1, 0));
  const maxSlopeAngle = 45 * (Math.PI / 180);
  const isWalkable = slope > Math.cos(maxSlopeAngle);
}
```

### BVH Visualisation (debug)

```typescript
import { MeshBVHHelper } from 'three-mesh-bvh';

const bvhHelper = new MeshBVHHelper(levelMesh, 10); // depth 10
scene.add(bvhHelper);
bvhHelper.update();
// call bvhHelper.update() after any mesh transform change
```

### API Quick Reference

| Method | Description |
|---|---|
| `geometry.computeBoundsTree(opts?)` | Build BVH. Call once after geometry is created. |
| `geometry.disposeBoundsTree()` | Free BVH memory. Call when mesh is removed. |
| `raycaster.intersectObject(mesh)` | Accelerated ray → mesh intersect (uses patch). |
| `boundsTree.raycastFirst(ray, matrixWorld)` | Lowest-level single-hit raycast. |
| `boundsTree.capsuleIntersects(mesh, capsule)` | Returns `{depth, normal}` or `null`. |
| `boundsTree.intersectsSphere(mesh, sphere)` | Sphere overlap test. |
| `boundsTree.shapecast(callbacks)` | Fully custom shape query for advanced use. |
| `MeshBVHHelper(mesh, depth)` | Debug wireframe visualisation of the tree. |

---

## 3. Rapier Physics

### Role in Grid Engine
Rapier handles **rigid-body physics** simulation: falling objects, dynamic props, explosions, and the physics-driven character controller. It runs inside a WebAssembly module at near-native speed.

**Note:** Three-mesh-bvh handles _geometric_ collision (player vs. level mesh surface). Rapier handles _dynamic physics_ (rigid bodies, joints, constraints). They are complementary; a first-person engine uses both.

**Version:** `^0.11.2`

### Official Documentation

| Resource | URL |
|---|---|
| Main site + User Guide | https://rapier.rs |
| JavaScript 3D API docs | https://rapier.rs/javascript3d/index.html |
| JavaScript 3D live demos | https://rapier.rs/demos3d/index.html |
| GitHub (Rust source) | https://github.com/dimforge/rapier |
| npm (-compat package) | https://www.npmjs.com/package/@dimforge/rapier3d-compat |
| Discord community | https://discord.gg/vFy7F3k |
| Three.js + Rapier demo project | https://github.com/viridia/demo-rapier-three |
| Three.js forum integration thread | https://discourse.threejs.org/t/new-version-of-rapier-physics-three-js-demo-app/48755 |

### Init and World Setup

```typescript
import RAPIER from '@dimforge/rapier3d-compat';

await RAPIER.init();   // load WASM binary – call once at engine start

const world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
```

### Rigid Bodies & Colliders

```typescript
// ── Create a dynamic prop (crate, barrel, etc.) ─────────────────
const bodyDesc = RAPIER.RigidBodyDesc.dynamic()
  .setTranslation(2, 5, -3);
const body = world.createRigidBody(bodyDesc);

const collider = RAPIER.ColliderDesc.cuboid(0.5, 0.5, 0.5)
  .setFriction(0.8)
  .setDensity(1.0);
world.createCollider(collider, body);

// ── Static level geometry ────────────────────────────────────────
const ground = world.createRigidBody(RAPIER.RigidBodyDesc.fixed());
world.createCollider(RAPIER.ColliderDesc.cuboid(50, 0.1, 50), ground);

// ── Kinematic character body ─────────────────────────────────────
const playerBody = world.createRigidBody(
  RAPIER.RigidBodyDesc.kinematicPositionBased()
    .setTranslation(0, 2, 0)
);
world.createCollider(RAPIER.ColliderDesc.capsule(0.5, 0.35), playerBody);
```

### Physics Step & Sync to Three.js

```typescript
// Each frame (after input has been processed):
world.step();

// Sync every dynamic body to its Three.js Group
const translation = body.translation();
const rotation    = body.rotation();
threeJSGroup.position.set(translation.x, translation.y, translation.z);
threeJSGroup.quaternion.set(rotation.x, rotation.y, rotation.z, rotation.w);
```

### Forces, Impulses, Velocity

```typescript
body.applyImpulse({ x: 0, y: 12, z: 0 }, true);             // jump
body.applyForce({ x: 5, y: 0, z: 0 }, true);                // push
body.setLinvel({ x: 5, y: body.linvel().y, z: 0 }, true);   // direct velocity set
body.setAngvel({ x: 0, y: 1, z: 0 }, true);                 // spin
```

### Rapier Kinematic Character Controller

```typescript
// Built-in character controller (handles slopes, steps, gravity)
const controller = world.createCharacterController(0.01); // 1cm skin
controller.setUp({ x: 0, y: 1, z: 0 });
controller.setMaxSlopeClimbAngle(45 * Math.PI / 180);
controller.setMinSlopeSlideAngle(30 * Math.PI / 180);
controller.enableSnapToGround(0.5);
controller.setApplyImpulsesToDynamicBodies(true);
controller.setSlideEnabled(true);

// Each frame:
const desiredMovement = { x: inputX, y: gravityDelta, z: inputZ };
controller.computeColliderMovement(playerCollider, desiredMovement);
const corrected = controller.computedMovement();

const pos = playerBody.translation();
playerBody.setNextKinematicTranslation({
  x: pos.x + corrected.x,
  y: pos.y + corrected.y,
  z: pos.z + corrected.z,
});
```

### Raycasting & Sensor Detection

```typescript
// Raycast (weapon hit-scan)
const ray = new RAPIER.Ray({ x: 0, y: 0, z: 0 }, { x: 0, y: -1, z: 0 });
const hit = world.castRay(ray, 100, true);
if (hit) {
  const point = ray.pointAt(hit.toi);
  const collider = world.getCollider(hit.colliderHandle);
}

// Sensor (trigger zone)
const sensor = RAPIER.ColliderDesc.cuboid(2, 2, 2).setSensor(true);
const sensorBody  = world.createRigidBody(RAPIER.RigidBodyDesc.fixed());
world.createCollider(sensor, sensorBody);

const eventQueue = new RAPIER.EventQueue(true);
world.step(eventQueue);
eventQueue.drainCollisionEvents((h1, h2, started) => {
  if (started) console.log('Entered trigger zone');
});
```

### Rigid Body Type Reference

| Type | Gravity | Move via code | Affect others |
|---|---|---|---|
| `dynamic` | ✅ | impulse / force | ✅ |
| `fixed` | ❌ | ❌ | ✅ (collisions) |
| `kinematicPositionBased` | ❌ | set translation | ✅ |
| `kinematicVelocityBased` | ❌ | set velocity | ✅ |

---

## 4. Howler.js + Three.js Audio

### Why Two Audio Systems?

Grid Engine uses **both** audio systems for different responsibilities:

| System | Responsibility |
|---|---|
| **Howler.js** | Background music, UI sounds, ambient loops, audio sprites, cross-browser reliability |
| **Three.js `PositionalAudio`** | In-world 3D spatial sounds attached to GameObjects (footsteps, gunshots, explosions) |

### 4a. Howler.js

**Version:** `^2.2.0`

#### Official Documentation

| Resource | URL |
|---|---|
| Official site + demo | https://howlerjs.com |
| GitHub | https://github.com/goldfire/howler.js |
| API reference | https://github.com/goldfire/howler.js#documentation |
| 3D audio example | https://github.com/goldfire/howler.js/tree/master/examples/3d |
| npm | https://www.npmjs.com/package/howler |

#### Howler.js Cheatsheet

```typescript
import { Howl, Howler } from 'howler';

// ── Background music ─────────────────────────────────────────────
const music = new Howl({
  src: ['audio/theme.webm', 'audio/theme.mp3'],  // webm first for perf
  loop:   true,
  volume: 0.4,
  html5:  true,   // enable streaming for large audio files
});
music.play();
music.fade(0.4, 0, 2000);  // fade out over 2 seconds

// ── Sound effects (sprite sheet – one file, many sounds) ─────────
const sfx = new Howl({
  src: ['audio/sfx.webm', 'audio/sfx.mp3'],
  sprite: {
    shoot:     [0,    300],   // [offsetMs, durationMs]
    reload:    [400,  700],
    footstep:  [1200, 150],
    hit:       [1500, 200],
  },
  volume: 0.8,
});

const shootId = sfx.play('shoot');
sfx.rate(1.5, shootId);   // pitch up

// ── Global controls ──────────────────────────────────────────────
Howler.mute(true);            // global mute
Howler.volume(0.7);           // global volume
Howler.stop();                // stop all sounds
Howler.unload();              // free all audio buffers

// ── 3D / Positional Howl (supplemental, basic stereo panning) ───
const steps = new Howl({
  src: ['audio/footstep.mp3'],
  panningModel: 'HRTF',
  distanceModel: 'inverse',
  refDistance:  1,
  rolloffFactor: 1,
});
steps.pos(5, 0, -3);    // sound source position
Howler.pos(0, 0, 0);    // listener position (update to camera pos each frame)
Howler.orientation(
  forward.x, forward.y, forward.z,   // camera forward vector
  0, 1, 0                             // up vector
);
```

#### Howler.js Pattern for FPS Audio Manager

```typescript
class AudioManager {
  private sfx: Howl;
  private music: Howl | null = null;

  constructor() {
    this.sfx = new Howl({
      src: ['audio/sfx.webm', 'audio/sfx.mp3'],
      sprite: {
        gunshot:   [0,    400],
        reload:    [500,  800],
        footstep:  [1400, 120],
        jump:      [1600, 200],
        land:      [1900, 300],
      },
    });
  }

  playSFX(name: string) { this.sfx.play(name); }

  playMusic(src: string) {
    this.music?.stop();
    this.music = new Howl({ src: [src], loop: true, html5: true });
    this.music.play();
  }

  updateListenerPosition(pos: THREE.Vector3, forward: THREE.Vector3) {
    Howler.pos(pos.x, pos.y, pos.z);
    Howler.orientation(forward.x, forward.y, forward.z, 0, 1, 0);
  }
}
```

---

### 4b. Three.js PositionalAudio (In-World 3D Sound)

Use this for sounds **attached to GameObjects** in the scene — they automatically attenuate with distance and pan left/right as the camera moves.

#### Official Docs

| Resource | URL |
|---|---|
| `THREE.Audio` | https://threejs.org/docs/#api/en/audio/Audio |
| `THREE.PositionalAudio` | https://threejs.org/docs/#api/en/audio/PositionalAudio |
| `THREE.AudioListener` | https://threejs.org/docs/#api/en/audio/AudioListener |
| `THREE.AudioLoader` | https://threejs.org/docs/#api/en/loaders/AudioLoader |
| Three.js audio example | https://threejs.org/examples/#webaudio_positional_audio |

#### Three.js 3D Audio Cheatsheet

```typescript
import * as THREE from 'three';

// ── Setup (once at engine init) ──────────────────────────────────
const listener = new THREE.AudioListener();
camera.add(listener);   // listener follows camera (player's ears)

// ── Attach a positional sound to a GameObject ────────────────────
const positionalAudio = new THREE.PositionalAudio(listener);

const audioLoader = new THREE.AudioLoader();
const buffer = await audioLoader.loadAsync('/audio/generator_hum.mp3');

positionalAudio.setBuffer(buffer);
positionalAudio.setRefDistance(2);          // full volume within 2 units
positionalAudio.setMaxDistance(20);         // inaudible beyond 20 units
positionalAudio.setDistanceModel('inverse');// 'linear' | 'inverse' | 'exponential'
positionalAudio.setRolloffFactor(1);
positionalAudio.setLoop(true);
positionalAudio.autoplay = true;

// Add to the GameObject's THREE.Group so it moves with the object
gameObject.threeJSGroup.add(positionalAudio);

// ── Directional cone (e.g., speaker facing one direction) ────────
positionalAudio.setDirectionalCone(
  120,  // inner cone angle (degrees)
  240,  // outer cone angle (degrees)
  0.3   // outer cone volume gain
);

// ── Play / stop manually ─────────────────────────────────────────
positionalAudio.play();
positionalAudio.pause();
positionalAudio.stop();

// ── Dynamic properties (e.g., engine pitch tied to speed) ────────
positionalAudio.setPlaybackRate(engineRPM / 1000);
positionalAudio.setVolume(0.8);
```

#### Howler vs Three.js Audio Decision Guide

```
Is the sound attached to a world object (GameObject / entity)?
  YES → THREE.PositionalAudio  (true 3D, moves with object)
  NO  → Is it music or a UI click / menu sound?
          YES → Howler.js  (easy sprites, fade, cross-browser)
          NO  → Is it a non-positional ambient sound or cutscene?
                  YES → Howler.js
```

---

## 5. ECSY + ecsy-three

### Role in Grid Engine
ECSY provides the **Entity-Component-System architecture** backbone. It separates data (Components) from logic (Systems) and enables efficient iteration over thousands of entities per frame. `ecsy-three` provides pre-built glue between ECSY entities and Three.js Object3D instances.

**Note:** ECSY (the core) is **archived** — no longer actively developed by Mozilla — but it is **stable, complete, and production-worthy**. **While archived, ECSY is strictly mandated for v1.0.0** to match the architecture diagrams. The architecture it describes is the pattern the engine follows. Alternative for future versions: consider **bitecs** (https://github.com/NateTheGreatt/bitECS) for higher performance via SharedArrayBuffer typed arrays.

**Versions:** `ecsy ^0.4.2` · `ecsy-three ^0.0.13`

### Official Documentation

| Resource | URL |
|---|---|
| ECSY GitHub (archived, stable) | https://github.com/ecsyjs/ecsy |
| ECSY docs site | https://ecsy.io/docs/ |
| ecsy-three GitHub | https://github.com/ecsyjs/ecsy-three |
| ecsy-three npm | https://www.npmjs.com/package/ecsy-three |
| CodeSandbox – ecsy examples | https://codesandbox.io/examples/package/ecsy |
| CodeSandbox – ecsy-three examples | https://codesandbox.io/examples/package/ecsy-three |
| Alternative: bitECS (high-perf) | https://github.com/NateTheGreatt/bitECS |

### ECS Architecture Primer

```
World
  ├── Entities (just IDs / containers)
  │     ├── Entity 1  →  [Position, Velocity, Health]
  │     ├── Entity 2  →  [Position, Object3D, RigidBody]
  │     └── Entity 3  →  [Object3D, Sound, AI]
  │
  └── Systems (logic, run in order every frame)
        ├── PhysicsSystem      (reads: RigidBody, Position → writes: Position)
        ├── MovementSystem     (reads: Velocity, Position  → writes: Position)
        ├── RenderSyncSystem   (reads: Position, Object3D  → writes: Object3D.position)
        └── AudioSystem        (reads: Position, Sound)
```

### Core ECSY Cheatsheet

```typescript
import { World, System, Component, Types, TagComponent } from 'ecsy';

// ── Components (pure data) ────────────────────────────────────────
class Position extends Component {}
Position.schema = {
  x: { type: Types.Number, default: 0 },
  y: { type: Types.Number, default: 0 },
  z: { type: Types.Number, default: 0 },
};

class Velocity extends Component {}
Velocity.schema = {
  x: { type: Types.Number, default: 0 },
  y: { type: Types.Number, default: 0 },
  z: { type: Types.Number, default: 0 },
};

class PlayerTag extends TagComponent {}  // zero-data marker component

// ── System (logic) ────────────────────────────────────────────────
class MovementSystem extends System {
  execute(delta: number) {
    this.queries.moving.results.forEach(entity => {
      const pos = entity.getMutableComponent(Position)!;
      const vel = entity.getComponent(Velocity)!;
      pos.x += vel.x * delta;
      pos.y += vel.y * delta;
      pos.z += vel.z * delta;
    });
  }
}

MovementSystem.queries = {
  moving: { components: [Position, Velocity] },
};

// ── World setup ───────────────────────────────────────────────────
const world = new World();
world
  .registerComponent(Position)
  .registerComponent(Velocity)
  .registerComponent(PlayerTag)
  .registerSystem(MovementSystem);

// ── Entity creation ───────────────────────────────────────────────
const player = world
  .createEntity()
  .addComponent(Position, { x: 0, y: 1.7, z: 0 })
  .addComponent(Velocity, { x: 0, y: 0, z: 0 })
  .addComponent(PlayerTag);

// ── Game loop integration ─────────────────────────────────────────
function tick(delta: number) {
  world.execute(delta, performance.now());
}
```

### ecsy-three Integration

```typescript
import { ECSYThreeWorld, Object3DComponent, initialize } from 'ecsy-three';
import * as THREE from 'three';

const { world, scene, camera, renderer } = initialize();

// Create entity with a Three.js Mesh
const box = world
  .createEntity()
  .addObject3DComponent(
    new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshStandardMaterial({ color: 0xff0000 })
    ),
    scene   // parent entity
  );

// System that rotates all Object3D entities
class RotateSystem extends System {
  execute(delta: number) {
    this.queries.objects.results.forEach(entity => {
      const obj = entity.getObject3D<THREE.Mesh>();
      obj.rotation.y += delta;
    });
  }
}
RotateSystem.queries = {
  objects: { components: [Object3DComponent] },
};

world.registerSystem(RotateSystem);
```

### FPS-Specific ECS Component Design

```typescript
// Components for a first-person shooter
class Transform extends Component {}
Transform.schema = {
  position: { type: Types.Ref, default: () => new THREE.Vector3() },
  quaternion:{ type: Types.Ref, default: () => new THREE.Quaternion() },
};

class RigidBodyRef extends Component {}
RigidBodyRef.schema = {
  body: { type: Types.Ref },      // RAPIER.RigidBody reference
};

class Health extends Component {}
Health.schema = {
  current: { type: Types.Number, default: 100 },
  max:     { type: Types.Number, default: 100 },
};

class WeaponState extends Component {}
WeaponState.schema = {
  ammo:       { type: Types.Number, default: 30 },
  isReloading:{ type: Types.Boolean, default: false },
  fireRate:   { type: Types.Number, default: 0.1 },
  lastFired:  { type: Types.Number, default: 0 },
};

class AIAgent extends Component {}
AIAgent.schema = {
  state:     { type: Types.String, default: 'idle' },
  targetId:  { type: Types.Number, default: -1 },
  alertRange:{ type: Types.Number, default: 15 },
};

// Marker tags (no data)
class PlayerTag     extends TagComponent {}
class EnemyTag      extends TagComponent {}
class DeadTag       extends TagComponent {}
class PickupTag     extends TagComponent {}
```

### ECS Performance Tips

| Tip | Why |
|---|---|
| Use `TagComponent` for state flags | Zero memory, fast archetype queries |
| Pre-allocate component pools | Avoids GC pressure during gameplay |
| Keep components flat (no nested objects) | Cache-friendly iteration |
| Batch entity creation | Cheaper than one-at-a-time |
| Remove components instead of setting flags | ECS queries depend on component presence |

---

## 6. Socket.IO

### Role in Grid Engine
Socket.IO provides the transport layer for the **authoritative multiplayer server**. The client sends player inputs; the server runs physics and broadcasts world state snapshots.

**Versions:** `socket.io-client ^4.7.0` (engine) · `socket.io ^4.7.0` (server)

### Official Documentation

| Resource | URL |
|---|---|
| Getting Started | https://socket.io/docs/v4/ |
| Server API | https://socket.io/docs/v4/server-api/ |
| Client API | https://socket.io/docs/v4/client-api/ |
| Rooms guide | https://socket.io/docs/v4/rooms/ |
| Emit cheatsheet | https://socket.io/docs/v4/emit-cheatsheet/ |
| Scaling (multiple nodes) | https://socket.io/docs/v4/using-multiple-nodes/ |
| GitHub | https://github.com/socketio/socket.io |
| Best FPS multiplayer reference | https://www.gabrielgambetta.com/client-server-game-architecture.html |

### Server + Client Cheatsheet

```typescript
// ── SERVER ──────────────────────────────────────────────────────
import { createServer } from 'http';
import { Server }       from 'socket.io';

const io = new Server(createServer(), { cors: { origin: '*' } });

io.on('connection', socket => {
  socket.on('JOIN_ROOM',    data => socket.join(data.roomId));
  socket.on('PLAYER_INPUT', data => processInput(socket.id, data));
  socket.on('disconnect',   ()   => removePlayer(socket.id));
});

// Broadcast snapshot at 20 Hz
setInterval(() => {
  world.step();                         // Rapier server-side step
  io.to('room-1').emit('WORLD_SNAPSHOT', buildSnapshot());
}, 50);

// ── CLIENT ──────────────────────────────────────────────────────
import { io } from 'socket.io-client';

const socket = io('http://localhost:3333', { autoConnect: false });
socket.connect();
socket.emit('JOIN_ROOM', { roomId: 'room-1' });
socket.on('WORLD_SNAPSHOT', snapshot => interpolator.push(snapshot));
socket.on('RECONCILE',      payload  => reconcile(payload));
```

---

## 7. React 18

### Role in Grid Engine
Powers the **editor UI** (`packages/editor`).

**Version:** `^18.2.0`

### Official Documentation

| Resource | URL |
|---|---|
| Official docs | https://react.dev |
| API reference | https://react.dev/reference/react |
| Hooks reference | https://react.dev/reference/react/hooks |
| React 18 upgrade guide | https://react.dev/blog/2022/03/29/react-v18 |

### Key Patterns

```tsx
import { createRoot } from 'react-dom/client';
import { useRef, useEffect, useCallback, memo } from 'react';

// React 18 mount
createRoot(document.getElementById('app')!).render(<App />);

// Canvas ref for Three.js/engine viewport
const canvasRef = useRef<HTMLCanvasElement>(null);
useEffect(() => {
  const game = new Game(canvasRef.current!);
  game._init();
  return () => game.renderer.stop();
}, []);

// Stable callbacks
const onSelect = useCallback((id: string) => dispatch(select(id)), [dispatch]);

// Memo for heavy scene-graph lists
const SceneNode = memo(({ node }: { node: GameObjectJSON }) => <div>{node.name}</div>);
```

---

## 8. Redux Toolkit + React-Redux

### Role in Grid Engine
State management for the **editor** – holds `SceneJSON`, selection state, undo history, and editor preferences.

**Versions:** `@reduxjs/toolkit ^2.0.0` · `react-redux ^9.0.0`

### Official Documentation

| Resource | URL |
|---|---|
| RTK Getting Started | https://redux-toolkit.js.org/introduction/getting-started |
| RTK Usage Guide | https://redux-toolkit.js.org/usage/usage-guide |
| RTK API Reference | https://redux-toolkit.js.org/api/configureStore |
| RTK Tutorials | https://redux-toolkit.js.org/tutorials/overview |
| React-Redux docs | https://react-redux.js.org |

### Cheatsheet

```typescript
import { configureStore, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { useDispatch, useSelector } from 'react-redux';

const sceneSlice = createSlice({
  name: 'scene',
  initialState: { scene: null as SceneJSON | null, isDirty: false },
  reducers: {
    loadScene: (state, action: PayloadAction<SceneJSON>) => {
      state.scene   = action.payload;
      state.isDirty = false;
    },
    updateGameObject: (state, action: PayloadAction<{ id: string; patch: Partial<GameObjectJSON> }>) => {
      const go = state.scene?.gameObjects?.find(g => g.name === action.payload.id);
      if (go) Object.assign(go, action.payload.patch);
      state.isDirty = true;
    },
  },
});

export const store = configureStore({ reducer: { scene: sceneSlice.reducer } });
export type RootState = ReturnType<typeof store.getState>;
export const useAppSelector = <T>(sel: (s: RootState) => T) => useSelector<RootState, T>(sel);
export const useAppDispatch = () => useDispatch<typeof store.dispatch>();
```

---

## 9. Vite

### Role in Grid Engine
Build tool for `packages/game` and `packages/editor`. Provides instant HMR in development and optimised Rollup bundles for production.

**Version:** `^5.0.0`

### Official Documentation

| Resource | URL |
|---|---|
| Getting Started | https://vitejs.dev/guide/ |
| Configuration Reference | https://vitejs.dev/config/ |
| Building for Production | https://vitejs.dev/guide/build |
| Plugin API | https://vitejs.dev/guide/api-plugin |
| GitHub | https://github.com/vitejs/vite |
| Community Cheatsheet 2025 | https://github.com/MianAliKhalid/ultimate-vite-cheatsheet-2025 |

### WASM + Rapier Config

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['@dimforge/rapier3d-compat'],  // MUST exclude WASM packages
  },
  server: {
    headers: {
      'Cross-Origin-Opener-Policy':   'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
  build: { target: 'es2020', sourcemap: true },
});
```

---

## 10. TypeScript

**Version:** `^5.2.2`

### Official Documentation

| Resource | URL |
|---|---|
| Official Handbook | https://www.typescriptlang.org/docs/handbook/intro.html |
| tsconfig Reference | https://www.typescriptlang.org/tsconfig |
| TypeScript Playground | https://www.typescriptlang.org/play |
| Release notes | https://www.typescriptlang.org/docs/handbook/release-notes/overview.html |

### Base tsconfig

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2020", "DOM"],
    "strict": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  }
}
```

---

## 11. Jest + ts-jest

### Role in Grid Engine
Test runner for all engine unit and integration tests in the `tests/` root folder.

**Versions:** `jest ^29.7.0` · `ts-jest ^29.1.0`

### Official Documentation

| Resource | URL |
|---|---|
| Jest docs | https://jestjs.io/docs/getting-started |
| Jest configuration | https://jestjs.io/docs/configuration |
| Mock functions | https://jestjs.io/docs/mock-function-api |
| ts-jest docs | https://kulshekhar.github.io/ts-jest/ |

### Config Pattern

```typescript
// jest.config.ts
import type { Config } from 'jest';
export default {
  preset:          'ts-jest',
  testEnvironment: 'jsdom',
  roots:           ['<rootDir>/tests'],
  moduleNameMapper: {
    '^@tge/engine$': '<rootDir>/packages/engine/src/index.ts',
    '^three$':       '<rootDir>/tests/__mocks__/three.ts',
    '^@dimforge/rapier3d-compat$': '<rootDir>/tests/__mocks__/rapier.ts',
  },
} satisfies Config;
```

---

## 12. Vitest

### Role in Grid Engine
Test runner for `packages/editor` (React component tests) and `packages/game`.

**Version:** `^1.0.0`

### Official Documentation

| Resource | URL |
|---|---|
| Getting Started | https://vitest.dev/guide/ |
| Configuration | https://vitest.dev/config/ |
| API reference | https://vitest.dev/api/ |

---

## 13. Yarn Berry (v3)

**Version:** `3.6.3` | **nodeLinker:** `node-modules`

### Official Documentation

| Resource | URL |
|---|---|
| Yarn docs | https://yarnpkg.com/getting-started |
| Workspaces | https://yarnpkg.com/features/workspaces |
| `foreach` command | https://yarnpkg.com/cli/workspaces/foreach |
| `.yarnrc.yml` reference | https://yarnpkg.com/configuration/yarnrc |

### Key Commands

```bash
yarn install                              # install all workspaces
yarn workspace @tge/engine add three      # add dep to specific workspace
yarn workspaces foreach -A run build      # run build in all workspaces
yarn workspaces foreach -Ap run build     # same but in parallel
yarn workspace @tge/editor dev            # start editor dev server
yarn up three                             # upgrade package everywhere
```

---

## 14. mise

**Node:** `18.18.2` | **Yarn:** `3.6.3`

### Official Documentation

| Resource | URL |
|---|---|
| mise docs | https://mise.jdx.dev |
| Getting Started | https://mise.jdx.dev/getting-started.html |
| `mise.toml` reference | https://mise.jdx.dev/configuration.html |
| GitHub | https://github.com/jdx/mise |

```bash
brew install mise     # macOS
mise trust && mise install
node --version        # v18.18.2
yarn --version        # 3.6.3
```

---

## 15. React Router DOM

**Version:** `^6.22.0`

### Official Documentation

| Resource | URL |
|---|---|
| React Router v6 docs | https://reactrouter.com/en/main |
| Tutorial | https://reactrouter.com/en/main/start/tutorial |

```tsx
import { HashRouter, Routes, Route, useNavigate, useSearchParams } from 'react-router-dom';

<HashRouter>
  <Routes>
    <Route path="/"       element={<Welcome />} />
    <Route path="/editor" element={<Editor />} />
  </Routes>
</HashRouter>
```

---

## 16. Supplementary Reading – WebGL, FPS & Game Architecture

### WebGL & Rendering Fundamentals

| Resource | Description | URL |
|---|---|---|
| **WebGL Fundamentals** | Bottom-up WebGL — the foundation Three.js builds on | https://webglfundamentals.org |
| **WebGL2 Fundamentals** | WebGL2 specifics (what Three.js r125+ uses) | https://webgl2fundamentals.org |
| **learnopengl.com** | OpenGL concepts (lighting, shadows, PBR) that map to Three.js | https://learnopengl.com |
| **The Book of Shaders** | Interactive GLSL fragment shader guide | https://thebookofshaders.com |
| **Shadertoy** | Community shader playground | https://www.shadertoy.com |
| Three.js Manual – Performance Tips | Official optimisation guide | https://threejs.org/manual/#en/tips |
| **Discover Three.js** | Best structured free Three.js book | https://discoverthreejs.com |

### 3D Asset Pipeline

| Resource | Description | URL |
|---|---|---|
| **glTF 2.0 Spec** | The format for all 3D models in Grid Engine | https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html |
| **Khronos glTF Sample Assets** | Free reference models for testing loaders | https://github.com/KhronosGroup/glTF-Sample-Assets |
| **Blender** | Free 3D DCC tool; native glTF export | https://www.blender.org |
| **glTF Transform** | CLI for optimising, compressing, inspecting glTF | https://gltf-transform.dev |
| **gltf.report** | Online glTF validation and size analysis | https://gltf.report |
| **Google Draco** | Mesh compression used by DRACOLoader | https://github.com/google/draco |
| **KTX2 / Basis Textures** | GPU-compressed textures for Three.js | https://github.com/KhronosGroup/KTX-Software |

### FPS Game Design & Character Control

| Resource | Description | URL |
|---|---|---|
| **three-mesh-bvh FPS Demo** | Author's own FPS capsule controller built on BVH | https://gkjohnson.github.io/three-mesh-bvh/example/bundle/firstperson.html |
| **three-mesh-bvh Character Movement source** | Canonical capsule collision source code | https://github.com/gkjohnson/three-mesh-bvh/blob/master/example/characterMovement.js |
| **PointerLockControls** | Three.js official FPS mouse-look control | https://threejs.org/docs/#examples/en/controls/PointerLockControls |
| DEV.to – BVH Collision in Three.js | Practical walk-through for FPS collision | https://dev.to/bandinopla/collision-detection-in-threejs-made-easy-using-bvh-41g5 |
| Rapier kinematic character controller | Official Rapier FPS-style controller guide | https://rapier.rs/docs/user_guides/javascript/character_controller |

### Multiplayer Architecture

| Resource | Description | URL |
|---|---|---|
| **Fast-Paced Multiplayer** (Gabriel Gambetta) | The definitive article series on prediction, reconciliation, interpolation | https://www.gabrielgambetta.com/client-server-game-architecture.html |
| **Gaffer on Games** | Low-level networking: UDP, reliability layers, snapshots | https://gafferongames.com |
| **Attacking Pixels – Socket.IO Multiplayer** | Socket.IO + Three.js multiplayer tutorial | https://attackingpixels.com/react-three-fibre-muliplayer-game-node-server-websockets-2/ |
| Socket.IO Emit Cheatsheet | All broadcast / room patterns in one page | https://socket.io/docs/v4/emit-cheatsheet/ |

### Game Architecture Patterns

| Resource | Description | URL |
|---|---|---|
| **Game Programming Patterns** (free online book) | Component, Event Queue, Game Loop, Spatial Partition | https://gameprogrammingpatterns.com |
| **bitECS** (high-perf ECS alternative to ECSY) | Uses SharedArrayBuffer typed arrays for near-WASM perf | https://github.com/NateTheGreatt/bitECS |
| ECSY architecture guide | Mozilla's original ECS architecture docs | https://ecsy.io/docs/#/manual/Architecture |

### Physics Deep-Dives

| Resource | Description | URL |
|---|---|---|
| Rapier User Guide (JS) | Complete guide to all Rapier features | https://rapier.rs/docs/user_guides/javascript/getting_started_js |
| Rapier JS 3D live demos | Interactive examples of every feature | https://rapier.rs/demos3d/index.html |
| Three.js + Rapier demo (viridia) | Open-source reference project | https://github.com/viridia/demo-rapier-three |

---

## Dependency Version Summary

| Package | Version | Category |
|---|---|---|
| `three` | `^0.168.0` | Rendering |
| `three-mesh-bvh` | `^0.7.0` | FPS collision / raycast |
| `@dimforge/rapier3d-compat` | `^0.11.2` | Physics (rigid bodies) |
| `howler` | `^2.2.0` | Music / UI audio |
| `ecsy` | `^0.4.2` | ECS architecture |
| `ecsy-three` | `^0.0.13` | ECS + Three.js glue |
| `socket.io-client` | `^4.7.0` | Multiplayer (client) |
| `socket.io` | `^4.7.0` | Multiplayer (server) |
| `react` | `^18.2.0` | Editor UI |
| `react-dom` | `^18.2.0` | Editor UI |
| `react-redux` | `^9.0.0` | Editor state |
| `@reduxjs/toolkit` | `^2.0.0` | Editor state |
| `react-router-dom` | `^6.22.0` | Editor routing |
| `vite` | `^5.0.0` | Build (game + editor) |
| `@vitejs/plugin-react` | `^4.0.0` | Build |
| `typescript` | `^5.2.2` | Language |
| `jest` | `^29.7.0` | Testing (engine) |
| `ts-jest` | `^29.1.0` | Testing (engine) |
| `vitest` | `^1.0.0` | Testing (editor + game) |
| `yarn` | `3.6.3` | Package manager |
| `node` | `18.18.2` | Runtime |