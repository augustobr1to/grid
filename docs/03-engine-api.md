# 03 – Engine API Reference

All types are TypeScript. The library is built with `tsc` and ships `.d.ts` files. Consumers work exclusively with the types and classes described here.

---

## `Game`

```typescript
class Game {
  constructor(
    baseURLorDirHandle: string | FileSystemDirectoryHandle,
    options?: GameOptions
  );

  // Async initialisation – MUST be called before loadScene()
  _init(): Promise<void>;

  // Load a named scene (must match a key in game.json "scenes")
  loadScene(sceneName: string): Promise<void>;

  // Register custom GameObject subclasses keyed by type name
  registerGameObjectClasses(map: Record<string, typeof GameObject>): void;

  // Asset loading (delegates to AssetStore)
  loadAsset(path: string): Promise<Asset>;

  // Read-only references
  readonly scene: Scene | null;
  readonly renderer: Renderer;
  readonly inputManager: InputManager;
  readonly assetStore: AssetStore;
}
```

### `GameOptions`
```typescript
interface GameOptions {
  rendererOptions?: RendererOptions;
  assetOptions?:    AssetOptions;
  inputOptions?:    InputOptions;
  disablePhysics?:  boolean;
  networkOptions?:  NetworkOptions;
}

interface RendererOptions {
  width?:               number;
  height?:              number;
  pixelRatio?:          number;
  setupFullScreenCanvas?: boolean;
  canvas?:              HTMLCanvasElement;
  cameraOptions?:       CameraOptions;
  beforeRender?:        (args: { deltaTimeInSec: number; time: number }) => void;
}

interface CameraOptions {
  fov?:    number;  // default 50
  aspect?: number;  // default width/height
  near?:   number;  // default 0.01
  far?:    number;  // default 1000
}

interface AssetOptions {
  dracoLoaderOptions?: DracoLoaderOptions;
}

interface InputOptions {
  wsadMovement?: boolean;  // default true
  mouseOptions?: { usePointerLock?: boolean };
}

interface NetworkOptions {
  serverURL?: string;   // e.g. "http://localhost:3000"
  autoConnect?: boolean;
}
```

---

## `Scene`

```typescript
class Scene {
  constructor(game: Game, jsonAssetPath?: string);

  load(): Promise<void>;
  unload(): void;

  // Scene-graph mutation (available after load())
  addGameObject(options: GameObjectJSON): GameObject;
  removeGameObject(id: string): void;
  findGameObjectById(id: string): GameObject | undefined;
  findGameObjectsByTag(tag: string): GameObject[];
  findGameObjectByName(name: string): GameObject | undefined;

  // Environment
  setFog(fog: FogJSON | THREE.Fog | null): void;
  setBackground(color: string | THREE.Texture): void;
  setGravity(gravity: Vector3Data): void;

  // Audio
  playSound(name: string): void;
  stopSound(name: string): void;

  // Per-frame (called by Renderer loop)
  beforeRender(deltaTimeInSec: number): void;

  // Serialise current in-memory state back to SceneJSON
  toJSON(): SceneJSON;

  // Public properties
  readonly name: string;
  readonly threeJSScene: THREE.Scene;
  readonly rapierWorld: RAPIER.World;
  readonly gameObjects: GameObject[];
  readonly game: Game;
  active: boolean;
}
```

### `SceneJSON`
```typescript
interface SceneJSON {
  background?: string | null;
  fog?:        FogJSON | null;
  gravity?:    Vector3Data;
  lights?:     SceneLightJSON[];
  sounds?:     SceneSoundJSON[];
  gameObjects?: GameObjectJSON[];
}

interface FogJSON {
  color: string;
  near:  number;
  far:   number;
}

interface SceneLightJSON {
  type:       string;   // 'AmbientLight' | 'DirectionalLight' | 'PointLight' | ...
  color?:     string;
  intensity?: number;
  position?:  Vector3Data;
}

interface SceneSoundJSON {
  name:         string;
  assetPath:    string;
  loop?:        boolean;
  autoplay?:    boolean;
  volume?:      number;
  playbackRate?: number;
}
```

---

## `GameObject`

```typescript
class GameObject {
  constructor(parent: Scene | GameObject, options?: GameObjectJSON);

  // Lifecycle
  load(): Promise<void>;
  unload(): void;
  reset(json?: GameObjectJSON): void;

  // Per-frame (override in subclasses)
  beforeRender(deltaTimeInSec: number): void;

  // Hierarchy
  getScene(): Scene;
  addChild(options: GameObjectJSON): GameObject;
  removeChild(id: string): void;

  // Component access
  getComponent<T extends Component>(type: string): T | undefined;
  getComponents<T extends Component>(type: string): T[];
  addComponent(json: ComponentJSON): Component;

  // Serialise
  toJSON(): GameObjectJSON;

  // Static registry
  static registerClassForComponentType(type: string, klass: typeof Component): void;

  // Properties
  readonly id: string;
  readonly type: string | null;
  name: string;
  tags: string[];
  readonly threeJSGroup: THREE.Group;
  readonly parent: Scene | GameObject;
  readonly components: Component[];
  readonly gameObjects: GameObject[];
  loaded: boolean;
}
```

### `GameObjectJSON`
```typescript
interface GameObjectJSON {
  type?:       string;
  name?:       string;
  tags?:       string[];
  userData?:   Record<string, unknown>;
  position?:   Vector3Data;
  rotation?:   EulerValues;
  scale?:      Vector3Data;
  components?: ComponentJSON[];
  children?:   GameObjectJSON[];
}
```

---

## `Component` (abstract)

```typescript
abstract class Component {
  constructor(gameObject: GameObject, jsonData: ComponentJSON);

  load(): Promise<void>;
  beforeRender(args: { deltaTimeInSec: number }): void;

  getName(): string | undefined;
  getType(): string;

  readonly gameObject: GameObject;
  readonly jsonData: ComponentJSON;
}

interface ComponentJSON {
  type: string;
  name?: string;
  [key: string]: unknown;
}
```

---

## Built-in Component Types

### `ModelComponent`
```typescript
interface ModelComponentJSON extends ComponentJSON {
  type: 'model';
  assetPath: string;      // path to .gltf or .glb
  position?: Vector3Data;
  scale?:    Vector3Data;
  rotation?: EulerValues;
}
```
Loads the GLTF, clones the scene graph, and appends it to `gameObject.threeJSGroup`.

### `RigidBodyComponent`
```typescript
interface RigidBodyComponentJSON extends ComponentJSON {
  type: 'rigidBody';
  rigidBodyType: 'dynamic' | 'fixed' | 'kinematicPositionBased' | 'kinematicVelocityBased';
  enabledTranslations?: { x: boolean; y: boolean; z: boolean };
  enabledRotations?:    { x: boolean; y: boolean; z: boolean };
  colliders: ColliderData[];
}
```

### `LightComponent`
```typescript
interface LightComponentJSON extends ComponentJSON {
  type:      'light';
  lightType: 'AmbientLight' | 'DirectionalLight' | 'HemisphereLight' |
             'PointLight' | 'RectAreaLight' | 'SpotLight';
  color?:     string;
  intensity?: number;
  position?:  Vector3Data;
}
```

### `SoundComponent`
```typescript
interface SoundComponentJSON extends ComponentJSON {
  type:          'sound';
  assetPath:     string;
  name:          string;
  loop?:         boolean;
  autoplay?:     boolean;
  volume?:       number;
  playbackRate?: number;
  refDistance?:  number;
  rolloffFactor?: number;
  distanceModel?: 'linear' | 'inverse' | 'exponential';
  maxDistance?:  number;
}
// Extra method exposed at runtime:
// soundComponent.playSound(delayInSec?, detune?)
```

### `UserInterfaceComponent`
```typescript
interface UserInterfaceComponentJSON extends ComponentJSON {
  type:      'userInterface';
  assetPath: string;  // path to a UI-definition JSON
}
```

---

## `Renderer`

```typescript
class Renderer {
  constructor(game: Game, options?: RendererOptions);

  getCanvas(): HTMLCanvasElement;
  getCameraAudioListener(): THREE.AudioListener;

  // Start/stop the animation loop
  start(): void;
  stop(): void;

  // Direct access (read-only in normal usage)
  readonly threeJSCamera: THREE.Camera;
  readonly threeJSRenderer: THREE.WebGLRenderer;
}
```

---

## `AssetStore`

```typescript
class AssetStore {
  constructor(baseURLorDirHandle: string | FileSystemDirectoryHandle, options?: AssetOptions);

  load(path: string): Promise<Asset>;
  get(path: string): Asset | undefined;
  unload(path: string): void;
  unloadAll(): void;
}
```

---

## `InputManager`

```typescript
class InputManager {
  readVerticalAxis(): number;    // -1.0 (forward) to +1.0 (back)
  readHorizontalAxis(): number;  // -1.0 (left) to +1.0 (right)
  isKeyDown(key: string): boolean;
  getMouseDeltaX(): number;
  getMouseDeltaY(): number;
  resetMouseDeltas(): void;
  isGamepadButtonDown(button: number | string): boolean;
  getGamepadAxis(index: number): number;
}
```

---

## `Settings`

```typescript
class Settings {
  static load(): void;
  static get(key: string): unknown;
  static set(key: string, value: unknown): void;
  static reset(): void;
  static on(event: 'CHANGE', listener: () => void): void;
  static off(event: 'CHANGE', listener: () => void): void;
}
```

---

## Shared Type Helpers

```typescript
interface Vector3Data  { x?: number; y?: number; z?: number; }
interface EulerValues  { x?: number; y?: number; z?: number; order?: string; }

interface ColliderData {
  type: ColliderType;
  density?:      number;
  friction?:     number;
  restitution?:  number;
  sensor?:       boolean;
  // shape-specific fields:
  hx?: number; hy?: number; hz?: number;      // cuboid
  radius?: number;                             // ball, capsule
  halfHeight?: number;                         // capsule, cylinder
  vertices?: Float32Array;                     // convexHull, trimesh
  indices?: Uint32Array;                       // trimesh
  // ... (see full spec in RigidBodyComponent JSON section)
}
```

---

## Lifecycle Example

```typescript
import { Game } from '@tge/engine';

const game = new Game('/assets', {
  rendererOptions: { setupFullScreenCanvas: true }
});

await game._init();
await game.loadScene('level1');

// The engine loop is now running via requestAnimationFrame inside Renderer.
```