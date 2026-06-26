## ✅ Completed

### High — correctness
- [x] Implement `Scene.ts` — load GameObjects from SceneJSON, wire Rapier world
- [x] Implement `GameObject.ts` — component attach/detach, transform sync
- [x] Implement `InputManager.ts` — keyboard, mouse (pointer lock), gamepad
- [x] Implement `NetworkManager.ts` — Socket.IO client wrapper
- [x] Implement `Interpolator.ts` — snapshot interpolation for remote players
- [x] Write unit tests for all of the above (target 70 % line coverage)

### High — editor
- [x] Implement `Viewport` component (Three.js canvas + gizmos)
- [x] Implement `SceneTree` component (drag-drop reorder)
- [x] Implement `Inspector` component (property editor)
- [x] Implement `Toolbar` component
- [x] File System Access API save-to-disk in `handleSave`

### Medium — DX
- [x] `packages/engine` — add `vite-plugin-dts` for `.d.ts` bundling
- [x] Add `CHANGELOG.md` and semantic versioning

### Low — polish
- [x] Add `husky` + `lint-staged` for pre-commit hooks
- [x] Add `size-limit` to track bundle size regressions
- [x] Toast notification system in editor (replace `alert()` in legacy JSX)

## 🔲 Remaining

No open tasks.
