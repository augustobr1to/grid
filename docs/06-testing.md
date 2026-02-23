# 06 – Testing Strategy

## Philosophy

- **Unit tests** cover individual classes and pure functions in isolation with mocks for Three.js, Rapier, and the DOM.
- **Integration tests** cover the interaction between `Game`, `Scene`, and `GameObject` using a real (in-process) engine instance backed by mocked WebGL and WASM.
- **Component tests** (editor) use Vitest + React Testing Library for React component behaviour.
- **E2E tests** are out of scope for CI but can be run manually with a browser + dev server.

---

## Folder Layout

```
tests/                          ← Jest test root (run from repo root)
  setup/
    jestGlobalSetup.ts          ← global async setup (e.g. RAPIER.init())
    jestSetupFile.ts            ← per-test-file setup (jest-environment-jsdom config)
  __mocks__/
    three.ts                    ← manual mock for three.js
    @dimforge/
      rapier3d-compat.ts        ← manual mock for Rapier
  engine/
    Game.test.ts
    Scene.test.ts
    GameObject.test.ts
    Component.test.ts
    assets/
      AssetStore.test.ts
      GLTFAsset.test.ts
      JSONAsset.test.ts
    input/
      InputManager.test.ts
      KeyboardHandler.test.ts
    network/
      NetworkManager.test.ts
      Interpolator.test.ts
    physics/
      PhysicsHelpers.test.ts
    components/
      ModelComponent.test.ts
      RigidBodyComponent.test.ts
      LightComponent.test.ts
      SoundComponent.test.ts

packages/editor/src/**/*.test.tsx   ← Vitest component tests co-located with source
packages/game/src/**/*.test.ts      ← Vitest integration tests for the example game
```

---

## Test Runner Configuration

### Root `jest.config.ts`
```typescript
import type { Config } from 'jest';

const config: Config = {
  preset:            'ts-jest',
  testEnvironment:   'jsdom',
  globalSetup:       './tests/setup/jestGlobalSetup.ts',
  setupFiles: ['./tests/setup/jestSetupFile.ts'],
  roots:             ['<rootDir>/tests'],
  moduleNameMapper: {
    '^three$':                              '<rootDir>/tests/__mocks__/three.ts',
    '^@dimforge/rapier3d-compat$':          '<rootDir>/tests/__mocks__/@dimforge/rapier3d-compat.ts',
    '^@tge/engine$':                        '<rootDir>/packages/engine/src/index.ts',
  },
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: './tsconfig.base.json' }]
  },
  collectCoverageFrom: ['packages/engine/src/**/*.ts'],
  coverageThreshold: {
    global: { lines: 70, functions: 70 }
  }
};

export default config;
```

### `jestGlobalSetup.ts`
```typescript
// Run once before all test suites.
// By default Rapier is mocked, so this is a no-op for unit tests.
// To enable real-Rapier integration tests, set REAL_RAPIER=true in the environment:
//   REAL_RAPIER=true yarn test --testPathPattern=tests/engine/physics
export default async function globalSetup() {
  if (process.env.REAL_RAPIER === 'true') {
    const RAPIER = await import('@dimforge/rapier3d-compat');
    await RAPIER.init();
  }
}
```

---

## Three.js Mock

The Three.js mock replaces the real library with lightweight stubs so tests run in Node.js without a WebGL context:

```typescript
// tests/__mocks__/three.ts
export class WebGLRenderer {
  setPixelRatio = jest.fn();
  setSize       = jest.fn();
  render        = jest.fn();
  setAnimationLoop = jest.fn();
  domElement    = document.createElement('canvas');
  shadowMap     = { enabled: false, type: 0 };
  outputEncoding = 0;
  gammaOutput    = false;
  toneMapping    = 0;
  toneMappingExposure = 1;
  physicallyCorrectLights = false;
}
export class Scene       { name = ''; background = null; fog = null; add = jest.fn(); remove = jest.fn(); }
export class Group       { position = new Vector3(); quaternion = new Quaternion(); scale = new Vector3(1,1,1); add = jest.fn(); clear = jest.fn(); children = []; userData = {}; }
export class PerspectiveCamera { position = new Vector3(); add = jest.fn(); updateProjectionMatrix = jest.fn(); }
export class AudioListener {}
export class Color { constructor(public hex?: string) {} }
export class Fog   { constructor(public color?, public near?, public far?) {} }
export class Vector3 { constructor(public x=0, public y=0, public z=0) {} set = jest.fn(); clone = jest.fn(() => new Vector3()); }
export class Quaternion { constructor(public x=0, public y=0, public z=0, public w=1) {} clone = jest.fn(() => new Quaternion()); }
export class FileLoader  { load = jest.fn((url, onLoad) => onLoad('{}')) }
export class AudioLoader { load = jest.fn() }
export class TextureLoader { load = jest.fn() }
export const sRGBEncoding = 3001;
```

---

## Rapier Mock

```typescript
// tests/__mocks__/@dimforge/rapier3d-compat.ts
const RAPIER = {
  init: jest.fn().mockResolvedValue(undefined),
  World: jest.fn().mockImplementation(() => ({
    step:            jest.fn(),
    createRigidBody: jest.fn().mockReturnValue({
      setTranslation: jest.fn(),
      setRotation:    jest.fn(),
      translation:    jest.fn().mockReturnValue({ x: 0, y: 0, z: 0 }),
      rotation:       jest.fn().mockReturnValue({ x: 0, y: 0, z: 0, w: 1 }),
    }),
    createCollider: jest.fn(),
  })),
  RigidBodyDesc: {
    dynamic:                      jest.fn().mockReturnValue({}),
    fixed:                        jest.fn().mockReturnValue({}),
    kinematicPositionBased:       jest.fn().mockReturnValue({}),
    kinematicVelocityBased:       jest.fn().mockReturnValue({}),
  },
  ColliderDesc: {
    cuboid:    jest.fn().mockReturnValue({ setDensity: jest.fn().mockReturnThis(), setFriction: jest.fn().mockReturnThis() }),
    ball:      jest.fn().mockReturnValue({}),
    capsule:   jest.fn().mockReturnValue({}),
  },
  Vector3: jest.fn().mockImplementation((x, y, z) => ({ x, y, z })),
};

export default RAPIER;
```

---

## Key Test Cases

### `Game.test.ts`
- ✅ Constructor accepts a base URL string.
- ✅ Constructor accepts a `FileSystemDirectoryHandle`.
- ✅ `_init()` throws if called twice.
- ✅ `loadScene()` throws if called before `_init()`.
- ✅ `loadScene()` throws if a second call is made before the first resolves.
- ✅ `registerGameObjectClasses` maps type strings to classes.

### `Scene.test.ts`
- ✅ `load()` constructs a `THREE.Scene`.
- ✅ `load()` initialises a Rapier World with correct gravity.
- ✅ `addGameObject()` returns a `GameObject` and appends it to `gameObjects`.
- ✅ `findGameObjectsByTag()` returns only matching objects.
- ✅ `toJSON()` round-trips through `load()` without data loss.

### `GameObject.test.ts`
- ✅ Constructor throws when parent is neither a `Scene` nor a `GameObject`.
- ✅ `getScene()` traverses parent chain correctly.
- ✅ Type merging: instance options override type-JSON options.
- ✅ Component type is looked up from the static registry.
- ✅ `beforeRender` is called on all components.
- ✅ Nested children are accessible via `gameObjects`.

### `RigidBodyComponent.test.ts`
- ✅ Creates a `RAPIER.RigidBody` during `load()`.
- ✅ Sets initial translation from `threeJSGroup.position`.
- ✅ All four `rigidBodyType` values create the correct `RigidBodyDesc`.

### `NetworkManager.test.ts`
- ✅ `connect()` calls `io()` with the configured server URL.
- ✅ `sendInput()` emits `PLAYER_INPUT` event.
- ✅ Incoming `WORLD_SNAPSHOT` event fires registered listener.
- ✅ `disconnect()` calls `socket.disconnect()`.

---

## CI Commands

```bash
# Install dependencies
yarn install

# Run all unit/integration tests with coverage
yarn test --coverage

# Run tests in watch mode (development)
yarn test --watch

# Run only engine tests
yarn test --testPathPattern=tests/engine

# Run editor component tests (Vitest)
yarn workspace @tge/editor test

# Type-check all packages
yarn workspaces foreach -A run build
```

### CI Workflow (GitHub Actions excerpt)

```yaml
- uses: actions/setup-node@v4
  with:
    node-version: '18.18.2'

- run: corepack enable && corepack prepare yarn@3.6.3 --activate
- run: yarn install --immutable
- run: yarn workspaces foreach -A run build
- run: yarn test --coverage --ci
- run: yarn workspace @tge/editor test --run
```