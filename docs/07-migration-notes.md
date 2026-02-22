# 07 – Migration Notes

This document records every deliberate departure from the reference repository (`WesUnwin/three-game-engine @ main`). It is intended for maintainers doing a diff between the original and the new codebase.

---

## 1. VR / WebXR – Completely Removed

### What was removed

| File / Symbol | Reason |
|---|---|
| `src/VR/VRMode.ts` | Entire class deleted |
| `src/VR/VRControllers.ts` (if present) | Deleted |
| `Renderer._initVR()` method | Deleted |
| `Renderer.vrMode` property | Deleted |
| `RendererOptions.enableVR` option | Deleted |
| `RendererOptions.enableVR` type declaration | Deleted from `types.d.ts` |
| Any `if (options.enableVR)` branch | Removed |
| Scene editor VR toggle UI | Removed |
| Any examples referencing VR | Removed |

### Migration action for downstream consumers

If you had code that called `game.renderer.vrMode.enter()` or checked `renderer.vrMode.isImmersiveVRSupported()`, you must remove that code. There is no replacement – the engine is browser-canvas-only.

---

## 2. Repository Structure – Monorepo Conversion

### Original structure (flat)

```
/src          ← engine source
/tests        ← flat test files
/scene_editor ← Webpack + React app
/examples     ← standalone webpack examples
/web_site     ← project website source
/docs         ← GitHub Pages docs
```

### New structure (Yarn workspaces monorepo)

```
/packages/engine   ← replaces /src
/packages/game     ← replaces /examples/first_person_kinematic_character_controller
/packages/editor   ← replaces /scene_editor
/tests             ← reorganised (see §5 below)
/server            ← new (multiplayer server)
/docs              ← now contains design docs instead of GitHub Pages
```

### Key changes

- **Root `package.json`** now uses `"workspaces": ["packages/*"]` and pins `packageManager` to `yarn@3.6.3`.
- **`.yarnrc.yml`** added with `nodeLinker: node-modules` to keep compatibility with WASM packages.
- **`mise.toml`** added to pin Node and Yarn versions.
- The `web_site/` folder is **removed**. Project documentation lives in `docs/` as Markdown.
- The `examples/cordova/` and `examples/electron/` examples are **removed** (out of scope; no mobile/native build targets).

---

## 3. Build Tooling – Webpack → Vite

### Original

- `scene_editor` used Webpack 5 + `babel-loader` for JSX/TS.
- Examples used Webpack 5.
- Engine built with `tsc` only.

### New

| Package | Tool | Why |
|---|---|---|
| `packages/engine` | `tsc` only (unchanged) | Library – no bundler needed |
| `packages/game` | Vite 5 | Fast HMR; native ESM |
| `packages/editor` | Vite 5 + `@vitejs/plugin-react` | Fast HMR; no Babel config needed |
| `server/` | `tsx` (dev), `tsc` (prod) | Node.js TypeScript runner |

**Babel is removed.** All `@babel/*` devDependencies, `babel.config.js`, and `babel-loader` references are gone. Vite uses esbuild for transpilation; `ts-jest` handles test transpilation.

---

## 4. Editor – Webpack React → React + Vite

### Original

- Located at `scene_editor/`.
- Entry point: `scene_editor/index.js` (plain `.js`, not TypeScript).
- Served by a custom `sceneEditorServer.js` (Webpack DevServer wrapped in a Node script).
- Build: `npx webpack --config ./scene_editor/prodWebpackConfig.js`.
- No strict TypeScript.

### New

- Located at `packages/editor/`.
- Entry point: `packages/editor/src/main.tsx` (TypeScript + JSX).
- Served by `vite` (`yarn workspace @tge/editor dev`).
- Build: `yarn workspace @tge/editor build` → produces `packages/editor/dist/`.
- Full TypeScript strict mode.
- State management upgraded from ad-hoc props to **Redux Toolkit**.
- Component tests added using **Vitest** + **React Testing Library**.

### Preserved features

- File System Access API integration (open project folder).
- Three.js viewport with live preview.
- Inspector panel for GameObject properties.
- Scene graph tree view.

---

## 5. Tests – Reorganised

### Original

```
tests/
  Game.test.js
  GameObject.test.js
  Scene.test.js

__mocks__/
  (various)

jestGlobalSetup.js   ← root level
jest.config.js       ← root level, plain JS
babel.config.js      ← required for Jest to understand TypeScript
```

### New

```
tests/
  setup/
    jestGlobalSetup.ts
    jestSetupFile.ts
  __mocks__/
    three.ts
    @dimforge/rapier3d-compat.ts
  engine/
    Game.test.ts
    Scene.test.ts
    GameObject.test.ts
    Component.test.ts
    assets/  ...
    input/   ...
    network/ ...
    physics/ ...
    components/ ...

jest.config.ts    ← root level, TypeScript
```

**Changes:**
- All test files converted from `.js` → `.ts`.
- Tests moved into logical sub-folders mirroring `packages/engine/src/`.
- `babel.config.js` removed; `ts-jest` used instead.
- `jestGlobalSetup.js` converted to `jestGlobalSetup.ts`.
- New test files added for: `AssetStore`, `InputManager`, `NetworkManager`, `Interpolator`, `RigidBodyComponent`.

---

## 6. Multiplayer – New Addition

The original repository has no networking layer. The following are entirely new:

| New file / folder | Description |
|---|---|
| `packages/engine/src/network/NetworkManager.ts` | Socket.IO client wrapper |
| `packages/engine/src/network/Snapshot.ts` | Shared snapshot types |
| `packages/engine/src/network/Interpolator.ts` | Client-side snapshot interpolation |
| `server/` | Authoritative game server (Express + Socket.IO + Rapier) |
| `GameOptions.networkOptions` | New option field in engine types |
| `tests/engine/network/` | Network unit tests |

`socket.io-client` added as a prod dependency of `packages/engine`. `socket.io` added as a prod dependency of `server/`.

---

## 7. `Settings.ts` – Game-Specific Defaults Removed

The original `Settings._getInitialSettings()` contained hardcoded VR bow-game settings (`max_arrows`, `bow_in_right_hand`, `draw_distance_min`, etc.). These are game-specific constants that do not belong in a generic engine library.

**New behaviour:** `_getInitialSettings()` returns `{}`. Games are expected to call `Settings.set(key, value)` to populate their own defaults on first run, or to subclass / replace `Settings` entirely.

---

## 8. `Renderer.ts` – Minor Clean-up

- `this.threeJSRenderer.gammaOutput = true` removed (deprecated in Three.js r152+; `outputColorSpace` is used instead).
- `this.threeJSRenderer.outputEncoding = THREE.sRGBEncoding` replaced with `this.threeJSRenderer.outputColorSpace = THREE.SRGBColorSpace`.
- `this.threeJSRenderer.physicallyCorrectLights` replaced with `this.threeJSRenderer.useLegacyLights = false` (renamed in r155).

---

## 9. Dependency Versions Bumped

| Package | Old | New | Notes |
|---|---|---|---|
| `three` | `^0.168.0` | `^0.168.0` | Unchanged |
| `@dimforge/rapier3d-compat` | `^0.11.2` | `^0.11.2` | Unchanged |
| `three-mesh-ui` | `^6.5.4` | `^6.5.4` | Unchanged |
| `react` | `^18.2.0` (devDep) | `^18.2.0` (dep of editor) | Moved to correct package |
| `webpack` | `^5.88.2` | **removed** | Replaced by Vite |
| `babel-*` | various | **removed** | Replaced by ts-jest + esbuild |
| `socket.io-client` | not present | `^4.7.0` | New |
| `socket.io` | not present | `^4.7.0` | New (server) |
| `vite` | not present | `^5.0.0` | New |