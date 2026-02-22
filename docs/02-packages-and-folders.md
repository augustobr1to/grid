# 02 – Packages and Folder Structure

## Monorepo Layout

```
<repo-root>/
├── .gitignore
├── .yarnrc.yml
├── mise.toml
├── package.json                  ← root workspace manifest
├── tsconfig.base.json            ← shared TS config
│
├── docs/                         ← these markdown specs
│
├── tests/                        ← cross-package integration tests
│   ├── setup/
│   │   └── jestGlobalSetup.ts
│   ├── engine/
│   │   ├── Game.test.ts
│   │   ├── Scene.test.ts
│   │   └── GameObject.test.ts
│   └── multiplayer/
│       └── NetworkManager.test.ts
│
├── public/                       ← static assets served by packages/game dev server
│   └── index.html
│
└── packages/
    ├── engine/                   ← publishable library
    │   ├── package.json
    │   ├── tsconfig.json
    │   ├── src/
    │   │   ├── index.ts          ← public API barrel
    │   │   ├── Game.ts
    │   │   ├── Scene.ts
    │   │   ├── GameObject.ts
    │   │   ├── Component.ts
    │   │   ├── Renderer.ts
    │   │   ├── Settings.ts
    │   │   ├── Logger.ts
    │   │   ├── Util.ts
    │   │   ├── assets/
    │   │   │   ├── Asset.ts
    │   │   │   ├── AssetStore.ts
    │   │   │   ├── GLTFAsset.ts
    │   │   │   ├── JSONAsset.ts
    │   │   │   ├── SoundAsset.ts
    │   │   │   ├── TextureAsset.ts
    │   │   │   └── CubeTextureAsset.ts
    │   │   ├── components/
    │   │   │   ├── ModelComponent.ts
    │   │   │   ├── RigidBodyComponent.ts
    │   │   │   ├── LightComponent.ts
    │   │   │   ├── SoundComponent.ts
    │   │   │   └── UserInterfaceComponent.ts
    │   │   ├── input/
    │   │   │   ├── InputManager.ts
    │   │   │   ├── KeyboardHandler.ts
    │   │   │   ├── MouseHandler.ts
    │   │   │   └── GamepadHandler.ts
    │   │   ├── network/
    │   │   │   ├── NetworkManager.ts    ← Socket.IO client wrapper
    │   │   │   ├── Snapshot.ts          ← snapshot types & serialisation
    │   │   │   └── Interpolator.ts      ← client-side state interpolation
    │   │   ├── physics/
    │   │   │   └── PhysicsHelpers.ts
    │   │   ├── ui/
    │   │   │   └── UIHelpers.ts
    │   │   ├── util/
    │   │   │   ├── CharacterController.ts
    │   │   │   ├── DynamicCharacterController.ts
    │   │   │   ├── KinematicCharacterController.ts
    │   │   │   ├── EventEmitter.ts
    │   │   │   └── ThreeJSHelpers.ts
    │   │   └── types.d.ts
    │   └── dist/                 ← tsc output (git-ignored)
    │
    ├── game/                     ← example game (Vite app)
    │   ├── package.json
    │   ├── tsconfig.json
    │   ├── vite.config.ts
    │   ├── index.html
    │   ├── public/               ← game assets (models, textures, audio, JSON)
    │   │   ├── game.json
    │   │   ├── scenes/
    │   │   ├── types/
    │   │   └── assets/
    │   └── src/
    │       ├── main.ts           ← creates Game, calls _init(), loadScene()
    │       └── controllers/      ← game-specific character controller subclasses
    │
    └── editor/                   ← React + Vite scene editor
        ├── package.json
        ├── tsconfig.json
        ├── vite.config.ts
        ├── index.html
        └── src/
            ├── main.tsx          ← React entry point
            ├── App.tsx
            ├── store/            ← Redux Toolkit slices
            │   ├── index.ts
            │   ├── sceneSlice.ts
            │   └── editorSlice.ts
            ├── components/
            │   ├── SceneGraph/
            │   ├── Inspector/
            │   ├── Viewport/
            │   ├── Toolbar/
            │   └── shared/
            └── hooks/
                ├── useEngine.ts
                └── useFileSystem.ts
```

---

## Root `package.json`

```json
{
  "name": "three-game-engine-monorepo",
  "private": true,
  "packageManager": "yarn@3.6.3",
  "engines": { "node": "18.18.2" },
  "workspaces": ["packages/*"],
  "scripts": {
    "build":      "yarn workspaces foreach -A run build",
    "test":       "jest --config jest.config.ts",
    "lint":       "yarn workspaces foreach -A run lint",
    "dev:game":   "yarn workspace @tge/game dev",
    "dev:editor": "yarn workspace @tge/editor dev"
  },
  "devDependencies": {
    "typescript": "^5.2.2",
    "jest": "^29.7.0",
    "ts-jest": "^29.1.0",
    "@types/jest": "^29.5.0",
    "babel-jest": "^29.7.0"
  }
}
```

---

## `packages/engine/package.json`

```json
{
  "name": "@tge/engine",
  "version": "1.0.0",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "files": ["dist"],
  "scripts": {
    "build": "tsc --project tsconfig.json",
    "lint":  "eslint src/**"
  },
  "dependencies": {
    "@dimforge/rapier3d-compat": "^0.11.2",
    "events": "^3.3.0",
    "socket.io-client": "^4.7.0",
    "three": "^0.168.0",
    "three-mesh-ui": "^6.5.4"
  },
  "devDependencies": {
    "typescript": "^5.2.2"
  }
}
```

---

## `packages/game/package.json`

```json
{
  "name": "@tge/game",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev":   "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "@tge/engine": "workspace:*"
  },
  "devDependencies": {
    "vite": "^5.0.0",
    "typescript": "^5.2.2",
    "vitest": "^1.0.0"
  }
}
```

---

## `packages/editor/package.json`

```json
{
  "name": "@tge/editor",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev":   "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "@tge/engine": "workspace:*",
    "@reduxjs/toolkit": "^2.0.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-redux": "^9.0.0",
    "react-router-dom": "^6.22.0",
    "react-icons": "^5.0.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "vite": "^5.0.0",
    "@vitejs/plugin-react": "^4.0.0",
    "typescript": "^5.2.2",
    "vitest": "^1.0.0"
  }
}
```

---

## Tooling Config Files

### `.yarnrc.yml`
```yaml
nodeLinker: node-modules
```

### `mise.toml`
```toml
[tools]
node = "18.18.2"
yarn = "3.6.3"
```

### `.gitignore`
```
node_modules
dist
.DS_Store
*.local
```

### `tsconfig.base.json`
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2020", "DOM"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  }
}
```

Each workspace `tsconfig.json` extends this base and overrides `outDir`, `rootDir`, and `paths` as needed.

---

## Public API Surface (`packages/engine/src/index.ts`)

The barrel export defines the contract between the engine library and consumers:

```typescript
// Core
export { default as Game }       from './Game';
export { default as Scene }      from './Scene';
export { default as GameObject } from './GameObject';
export { default as Component }  from './Component';

// Character controllers
export { default as CharacterController }          from './util/CharacterController';
export { default as KinematicCharacterController } from './util/KinematicCharacterController';
export { default as DynamicCharacterController }   from './util/DynamicCharacterController';

// Multiplayer
export { default as NetworkManager } from './network/NetworkManager';

// Re-exported underlying libraries (consumers should not install these separately)
export * as THREE      from 'three';
export { default as RAPIER }    from '@dimforge/rapier3d-compat';
export * as ThreeMeshUI from 'three-mesh-ui';

// Type-only exports
export type { GameOptions, SceneJSON, GameObjectJSON, ComponentJSON } from './types';
```