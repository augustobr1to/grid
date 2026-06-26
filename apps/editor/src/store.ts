import { configureStore, createSlice, PayloadAction } from '@reduxjs/toolkit';

// Scene state slice
interface SceneState {
    sceneJSON: any | null;
    selectedGameObjectId: string | null;
    isDirty: boolean;
    projectPath: string | null;
}

const initialSceneState: SceneState = {
    sceneJSON: null,
    selectedGameObjectId: null,
    isDirty: false,
    projectPath: null,
};

const sceneSlice = createSlice({
    name: 'scene',
    initialState: initialSceneState,
    reducers: {
        setSceneJSON(state, action: PayloadAction<any>) {
            state.sceneJSON = action.payload;
            state.isDirty = false;
        },
        updateSceneJSON(state, action: PayloadAction<any>) {
            state.sceneJSON = action.payload;
            state.isDirty = true;
        },
        selectGameObject(state, action: PayloadAction<string | null>) {
            state.selectedGameObjectId = action.payload;
        },
        setProjectPath(state, action: PayloadAction<string | null>) {
            state.projectPath = action.payload;
        },
        markClean(state) {
            state.isDirty = false;
        },
    },
});

// Editor UI state slice
interface EditorUIState {
    gizmoMode: 'translate' | 'rotate' | 'scale';
    showGrid: boolean;
    showStats: boolean;
}

const initialEditorUI: EditorUIState = {
    gizmoMode: 'translate',
    showGrid: true,
    showStats: false,
};

const editorUISlice = createSlice({
    name: 'editorUI',
    initialState: initialEditorUI,
    reducers: {
        setGizmoMode(state, action: PayloadAction<'translate' | 'rotate' | 'scale'>) {
            state.gizmoMode = action.payload;
        },
        toggleGrid(state) {
            state.showGrid = !state.showGrid;
        },
        toggleStats(state) {
            state.showStats = !state.showStats;
        },
    },
});

export const { setSceneJSON, updateSceneJSON, selectGameObject, setProjectPath, markClean } = sceneSlice.actions;
export const { setGizmoMode, toggleGrid, toggleStats } = editorUISlice.actions;

export const store = configureStore({
    reducer: {
        scene: sceneSlice.reducer,
        editorUI: editorUISlice.reducer,
    },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
