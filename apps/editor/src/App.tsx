import React, { useRef, useEffect, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState, AppDispatch } from './store';
import {
    setSceneJSON,
    updateSceneJSON,
    selectGameObject,
    setProjectPath,
    markClean,
    setGizmoMode,
} from './store';

// ─── App ─────────────────────────────────────────────────────────────────────
export default function App() {
    const dispatch = useDispatch<AppDispatch>();
    const sceneJSON = useSelector((s: RootState) => s.scene.sceneJSON);
    const selectedId = useSelector((s: RootState) => s.scene.selectedGameObjectId);
    const isDirty = useSelector((s: RootState) => s.scene.isDirty);
    const gizmoMode = useSelector((s: RootState) => s.editorUI.gizmoMode);
    const projectPath = useSelector((s: RootState) => s.scene.projectPath);

    // ── Open Project ────────────────────────────────────────────────────────
    const handleOpenProject = useCallback(async () => {
        try {
            const dirHandle = await (window as any).showDirectoryPicker();
            dispatch(setProjectPath(dirHandle.name));

            // Try to load scene JSON
            try {
                const gameHandle = await dirHandle.getFileHandle('game.json');
                const file = await gameHandle.getFile();
                const text = await file.text();
                const gameJSON = JSON.parse(text);

                if (gameJSON.scenes) {
                    const firstSceneKey = Object.keys(gameJSON.scenes)[0];
                    const scenePath = gameJSON.scenes[firstSceneKey];

                    // Navigate path to scene file
                    const parts = scenePath.split('/');
                    let handle: any = dirHandle;
                    for (let i = 0; i < parts.length - 1; i++) {
                        handle = await handle.getDirectoryHandle(parts[i]);
                    }
                    const sceneFileHandle = await handle.getFileHandle(parts[parts.length - 1]);
                    const sceneFile = await sceneFileHandle.getFile();
                    const sceneText = await sceneFile.text();
                    dispatch(setSceneJSON(JSON.parse(sceneText)));
                }
            } catch (e) {
                console.warn('Could not load scene from project:', e);
            }
        } catch {
            // User cancelled
        }
    }, [dispatch]);

    // ── Save ────────────────────────────────────────────────────────────────
    const handleSave = useCallback(() => {
        if (!sceneJSON) return;
        const blob = new Blob([JSON.stringify(sceneJSON, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${sceneJSON.name || 'scene'}.json`;
        a.click();
        URL.revokeObjectURL(url);
        dispatch(markClean());
    }, [sceneJSON, dispatch]);

    return (
        <div className="editor-layout">
            {/* Toolbar */}
            <div className="toolbar">
                <span style={{ fontWeight: 'bold', color: '#4488ff', letterSpacing: '2px', fontSize: '13px' }}>
                    GRID EDITOR
                </span>
                <div style={{ flex: 1 }} />
                <button onClick={handleOpenProject}>📂 Open Project</button>
                <button onClick={handleSave} disabled={!isDirty}>
                    💾 Save {isDirty ? '•' : ''}
                </button>
                <div style={{ borderLeft: '1px solid var(--border)', height: '60%', margin: '0 8px' }} />
                <button
                    onClick={() => dispatch(setGizmoMode('translate'))}
                    style={{ background: gizmoMode === 'translate' ? 'var(--accent)' : undefined }}
                >
                    ↔ Move
                </button>
                <button
                    onClick={() => dispatch(setGizmoMode('rotate'))}
                    style={{ background: gizmoMode === 'rotate' ? 'var(--accent)' : undefined }}
                >
                    ⟳ Rotate
                </button>
                <button
                    onClick={() => dispatch(setGizmoMode('scale'))}
                    style={{ background: gizmoMode === 'scale' ? 'var(--accent)' : undefined }}
                >
                    ⊞ Scale
                </button>
            </div>

            {/* Scene Graph Panel */}
            <div className="panel scene-tree">
                <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-secondary)', letterSpacing: '1px', marginBottom: '8px' }}>
                    Scene Graph
                </div>
                {sceneJSON ? (
                    <>
                        <div className="tree-node" style={{ fontWeight: 'bold' }}>
                            🌐 {sceneJSON.name || 'Scene'}
                        </div>
                        {(sceneJSON.gameObjects || []).map((go: any, i: number) => (
                            <TreeNode
                                key={go.name || `go-${i}`}
                                gameObject={go}
                                index={i}
                                selectedId={selectedId}
                                depth={1}
                                onSelect={(id) => dispatch(selectGameObject(id))}
                            />
                        ))}
                    </>
                ) : (
                    <div style={{ color: 'var(--text-secondary)', fontSize: '12px', padding: '20px 0', textAlign: 'center' }}>
                        Open a project to start editing
                    </div>
                )}
            </div>

            {/* Viewport */}
            <div className="panel viewport">
                <ViewportCanvas sceneJSON={sceneJSON} />
            </div>

            {/* Inspector */}
            <div className="panel inspector">
                <h3>Inspector</h3>
                {selectedId && sceneJSON ? (
                    <InspectorPanel
                        sceneJSON={sceneJSON}
                        selectedId={selectedId}
                        onUpdate={(updated) => dispatch(updateSceneJSON(updated))}
                    />
                ) : (
                    <div style={{ color: 'var(--text-secondary)', fontSize: '12px', padding: '20px 0', textAlign: 'center' }}>
                        Select a GameObject
                    </div>
                )}
            </div>

            {/* Status Bar */}
            <div className="statusbar">
                <span>{projectPath ? `📁 ${projectPath}` : 'No project open'}</span>
                <div style={{ flex: 1 }} />
                <span>{isDirty ? '● Unsaved changes' : '✓ Saved'}</span>
            </div>
        </div>
    );
}

// ─── TreeNode ────────────────────────────────────────────────────────────────
function TreeNode({ gameObject, index, selectedId, depth, onSelect }: {
    gameObject: any;
    index: number;
    selectedId: string | null;
    depth: number;
    onSelect: (id: string) => void;
}) {
    const id = gameObject.name || `go-${index}`;
    return (
        <>
            <div
                className={`tree-node ${selectedId === id ? 'selected' : ''}`}
                style={{ paddingLeft: `${depth * 16}px` }}
                onClick={() => onSelect(id)}
            >
                📦 {gameObject.name || `Object ${index}`}
                {gameObject.type && (
                    <span style={{ color: 'var(--accent)', fontSize: '10px', marginLeft: '4px' }}>
                        [{gameObject.type}]
                    </span>
                )}
            </div>
            {(gameObject.children || []).map((child: any, i: number) => (
                <TreeNode
                    key={child.name || `child-${i}`}
                    gameObject={child}
                    index={i}
                    selectedId={selectedId}
                    depth={depth + 1}
                    onSelect={onSelect}
                />
            ))}
        </>
    );
}

// ─── InspectorPanel ──────────────────────────────────────────────────────────
function InspectorPanel({ sceneJSON, selectedId, onUpdate: _onUpdate }: {
    sceneJSON: any;
    selectedId: string;
    onUpdate: (json: any) => void;
}) {
    const go = findGameObject(sceneJSON.gameObjects || [], selectedId);
    if (!go) return <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Not found</div>;

    return (
        <div>
            <div className="inspector-field">
                <label>Name</label>
                <input type="text" defaultValue={go.name || ''} />
            </div>
            <div className="inspector-field">
                <label>Type</label>
                <input type="text" defaultValue={go.type || ''} readOnly />
            </div>

            <h3 style={{ marginTop: '16px' }}>Position</h3>
            <div className="inspector-field">
                <label>X</label><input type="number" step="0.1" defaultValue={go.position?.x ?? 0} />
                <label>Y</label><input type="number" step="0.1" defaultValue={go.position?.y ?? 0} />
                <label>Z</label><input type="number" step="0.1" defaultValue={go.position?.z ?? 0} />
            </div>

            <h3 style={{ marginTop: '16px' }}>Rotation</h3>
            <div className="inspector-field">
                <label>X</label><input type="number" step="0.01" defaultValue={go.rotation?.x ?? 0} />
                <label>Y</label><input type="number" step="0.01" defaultValue={go.rotation?.y ?? 0} />
                <label>Z</label><input type="number" step="0.01" defaultValue={go.rotation?.z ?? 0} />
            </div>

            <h3 style={{ marginTop: '16px' }}>Scale</h3>
            <div className="inspector-field">
                <label>X</label><input type="number" step="0.1" defaultValue={go.scale?.x ?? 1} />
                <label>Y</label><input type="number" step="0.1" defaultValue={go.scale?.y ?? 1} />
                <label>Z</label><input type="number" step="0.1" defaultValue={go.scale?.z ?? 1} />
            </div>

            {go.components && go.components.length > 0 && (
                <>
                    <h3 style={{ marginTop: '16px' }}>Components ({go.components.length})</h3>
                    {go.components.map((comp: any, i: number) => (
                        <div key={i} style={{ padding: '4px 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
                            <span style={{ color: 'var(--accent)' }}>■</span> {comp.type}
                            {comp.name && <span> ({comp.name})</span>}
                        </div>
                    ))}
                </>
            )}

            {go.tags && go.tags.length > 0 && (
                <>
                    <h3 style={{ marginTop: '16px' }}>Tags</h3>
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                        {go.tags.map((tag: string, i: number) => (
                            <span key={i} style={{
                                background: 'var(--bg-primary)',
                                padding: '2px 6px',
                                borderRadius: '3px',
                                fontSize: '11px',
                                color: 'var(--accent)',
                            }}>
                                {tag}
                            </span>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}

function findGameObject(objects: any[], id: string): any {
    for (const go of objects) {
        if (go.name === id) return go;
        if (go.children) {
            const found = findGameObject(go.children, id);
            if (found) return found;
        }
    }
    return null;
}

// ─── ViewportCanvas ──────────────────────────────────────────────────────────
function ViewportCanvas({ sceneJSON }: { sceneJSON: any | null }) {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        if (!canvasRef.current) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Simple placeholder rendering
        const render = () => {
            const w = canvas.clientWidth;
            const h = canvas.clientHeight;
            canvas.width = w;
            canvas.height = h;

            ctx.fillStyle = '#050510';
            ctx.fillRect(0, 0, w, h);

            // Grid
            ctx.strokeStyle = '#1a1a3e';
            ctx.lineWidth = 1;
            const gridSize = 40;
            for (let x = 0; x < w; x += gridSize) {
                ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
            }
            for (let y = 0; y < h; y += gridSize) {
                ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
            }

            // Center marker
            ctx.strokeStyle = '#4488ff40';
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(w / 2, 0); ctx.lineTo(w / 2, h); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(0, h / 2); ctx.lineTo(w, h / 2); ctx.stroke();

            if (!sceneJSON) {
                ctx.fillStyle = '#4488ff';
                ctx.font = '14px Inter, monospace';
                ctx.textAlign = 'center';
                ctx.fillText('Open a project to preview the scene', w / 2, h / 2);
            } else {
                ctx.fillStyle = '#4488ff';
                ctx.font = '12px Inter, monospace';
                ctx.textAlign = 'center';
                ctx.fillText(`Scene: ${sceneJSON.name || 'Untitled'}`, w / 2, 30);
                ctx.fillStyle = '#666';
                ctx.fillText('3D viewport renders here with @thegridcn/engine', w / 2, h / 2);
            }
        };

        render();
        const handleResize = () => render();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [sceneJSON]);

    return <canvas ref={canvasRef} style={{ width: '100%', height: '100%' }} />;
}
