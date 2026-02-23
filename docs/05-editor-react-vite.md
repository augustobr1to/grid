# 05 – Scene Editor (React + Vite)

## Overview

The editor is a standalone `packages/editor` Vite + React application. It opens a game project folder from disk using the **File System Access API** (`showDirectoryPicker()`), reads the JSON data files, presents a 3D viewport and inspector UI, and writes changes back to the JSON files in real time.

It is a **developer tool only** – it is never deployed or shipped as part of a game build.

---

## Architecture

```
packages/editor/src/
  main.tsx              ← React root, Provider setup
  App.tsx               ← Layout: Toolbar | SceneGraph | Viewport | Inspector
  store/
    index.ts            ← configureStore
    sceneSlice.ts       ← SceneJSON in Redux; all mutations here
    editorSlice.ts      ← editor UI state (selected node, active tool, etc.)
  components/
    Toolbar/
      Toolbar.tsx       ← Open folder, Save, Play-in-editor buttons
    SceneGraph/
      SceneGraph.tsx    ← Tree view of GameObjects
      SceneGraphNode.tsx
    Viewport/
      Viewport.tsx      ← <canvas> managed by a headless engine instance
      ViewportControls.tsx  ← orbit camera controls overlay
      Gizmo.tsx         ← TransformControls-style gizmo (translate/rotate/scale)
    Inspector/
      Inspector.tsx     ← Context-sensitive property panel
      GameObjectInspector.tsx
      ComponentInspector.tsx
      ComponentList.tsx
      AddComponentButton.tsx
      fields/
        Vector3Field.tsx
        ColorField.tsx
        NumberField.tsx
        SelectField.tsx
        AssetPathField.tsx
  hooks/
    useEngine.ts        ← Manages headless engine instance inside the Viewport
    useFileSystem.ts    ← Wraps showDirectoryPicker, readFile, writeFile
    useAutoSave.ts      ← Debounced auto-save on Redux state changes
```

---

## State Management (Redux Toolkit)

### `sceneSlice`

Holds the complete `SceneJSON` for the currently-open scene. All mutations go through Redux actions so undo/redo is implementable.

```typescript
interface SceneEditorState {
  projectDirHandle:   FileSystemDirectoryHandle | null;
  currentScenePath:   string | null;
  scene:              SceneJSON | null;
  isDirty:            boolean;
  gameObjectTypes:    Record<string, GameObjectJSON>;  // loaded type definitions
}

// Actions
const sceneSlice = createSlice({
  name: 'scene',
  initialState,
  reducers: {
    loadScene(state, action: PayloadAction<SceneJSON>):         void;
    updateGameObject(state, action: PayloadAction<{ id: string; patch: Partial<GameObjectJSON> }>): void;
    addGameObject(state, action: PayloadAction<GameObjectJSON>): void;
    removeGameObject(state, action: PayloadAction<string>):     void;
    reorderGameObjects(state, action: PayloadAction<string[]>): void;
    updateSceneSettings(state, action: PayloadAction<Partial<SceneJSON>>): void;
    markClean(state):  void;
  }
});
```

### `editorSlice`

```typescript
interface EditorState {
  selectedGameObjectId: string | null;
  selectedComponentIndex: number | null;
  activeGizmoMode: 'translate' | 'rotate' | 'scale';
  snapToGrid: boolean;
  gridSize: number;
}
```

---

## Viewport

The Viewport component creates a `<canvas>` element and initialises a headless `Game` instance pointed at the project `FileSystemDirectoryHandle`. The engine runs its normal loop but the Renderer is told not to set up a full-screen canvas – instead, it renders into the editor-owned `<canvas>`.

```typescript
// hooks/useEngine.ts

function useEngine(canvasRef: RefObject<HTMLCanvasElement>, dirHandle: FileSystemDirectoryHandle | null) {
  const [engine, setEngine] = useState<Game | null>(null);

  useEffect(() => {
    if (!canvasRef.current || !dirHandle) return;

    const game = new Game(dirHandle, {
      rendererOptions: { canvas: canvasRef.current }
    });

    game._init().then(() => {
      setEngine(game);
    });

    return () => { game.renderer.stop(); };
  }, [dirHandle]);

  return engine;
}
```

Changes made in the inspector dispatch Redux actions which also call `asset.setData(newJSON)` on the relevant JSONAsset in the AssetStore. Because `JSONAsset` fires a `change` event, the `GameObject` listening to its type asset automatically calls `reset()` and `load()` – providing **live hot-reload** in the viewport without restarting the engine.

---

## Scene Graph Panel

- Renders a recursive tree of `SceneGraphNode` components from `sceneState.scene.gameObjects`.
- Each node shows: type icon, name, visibility toggle.
- Clicking a node sets `editorState.selectedGameObjectId`.
- Drag-and-drop reordering dispatches `reorderGameObjects`.
- Right-click context menu: Duplicate, Delete, Add Child.

---

## Inspector Panel

The Inspector panel renders different sub-panels based on the selected entity:

1. **No selection** → Scene-level settings (background, fog, gravity, lights).
2. **GameObject selected** → `GameObjectInspector` showing: name, type, position/rotation/scale, tags, then a `ComponentList`.
3. **Component selected** (within a GameObject) → `ComponentInspector` showing component-type-specific fields.

### Field Components

Each field component is a controlled input that dispatches a Redux `updateGameObject` action on change:

| Component | Used for |
|---|---|
| `Vector3Field` | position, scale, rotation, gravity |
| `ColorField` | background, fog color, light color |
| `NumberField` | intensity, volume, fov, etc. |
| `SelectField` | rigidBodyType, lightType, distanceModel |
| `AssetPathField` | assetPath fields (shows file picker) |

---

## Gizmo (Transform Controls)

Use `THREE.TransformControls` from `three/examples/jsm/controls/TransformControls.js`. The gizmo is attached to the selected `GameObject`'s `threeJSGroup`.

```typescript
// On mount
const gizmo = new THREE.TransformControls(camera, canvas);
scene.add(gizmo);
gizmo.attach(selectedObject.threeJSGroup);

// On gizmo change
gizmo.addEventListener('change', () => {
  dispatch(updateGameObject({
    id: selectedId,
    patch: {
      position: { x, y, z },
      rotation: { x, y, z, order }
    }
  }));
});
```

The active gizmo mode (translate / rotate / scale) is toggled by toolbar buttons that update `editorSlice.activeGizmoMode`.

---

## File System Workflow

### Opening a project

```typescript
// hooks/useFileSystem.ts
async function openProject(): Promise<FileSystemDirectoryHandle> {
  const handle = await window.showDirectoryPicker({ mode: 'readwrite' });
  return handle;
}
```

The returned handle is stored in Redux `sceneState.projectDirHandle` and passed to the `Game` constructor in `useEngine`.

### Saving a scene

When `isDirty === true`, `useAutoSave` fires a debounced (1 s) save:

```typescript
async function saveScene(dirHandle, scenePath, sceneJSON) {
  const fileHandle = await getFileHandle(dirHandle, scenePath, { create: true });
  const writable   = await fileHandle.createWritable();
  await writable.write(JSON.stringify(sceneJSON, null, 2));
  await writable.close();
}
```

### Validation

Before saving, the scene JSON is validated against the `SceneJSON` schema (using a small hand-written validator or `zod`). Validation errors are displayed as inline field error messages; the save is blocked until errors are resolved.

---

## UI Flow / Route Map

```
/                     → Welcome screen: "Open Project" button
/editor               → Main editor layout (requires projectDirHandle)
  ├── ?scene=<path>   → Load a specific scene file
  └── (no scene)      → Show scene list from game.json
```

Navigation is managed by `react-router-dom` with a `<HashRouter>` (no server needed for the Vite dev build).

---

## `vite.config.ts` (editor)

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['@dimforge/rapier3d-compat']  // WASM – must not be pre-bundled
  },
  server: {
    port: 5174,
    headers: {
      'Cross-Origin-Opener-Policy':   'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
  build: { target: 'es2020', sourcemap: true },
});
```

---

## Build Output

`yarn workspace @tge/editor build` produces `packages/editor/dist/` which can be served statically from any web server or `file://` origin. It does not require a backend.