# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- `Scene` — load GameObjects from SceneJSON, Rapier world integration
- `GameObject` — component attach/detach, hierarchy, physics sync
- `InputManager` — keyboard, mouse (pointer lock), gamepad
- `NetworkManager` — Socket.IO client with latency/clock-offset tracking
- `Interpolator` — snapshot interpolation (slerp/lerp) for remote entities
- Editor `Viewport` component (Three.js + OrbitControls + grid gizmo)
- Editor `SceneTree` component with drag-drop reorder
- Editor `Inspector` component — transform & component property editor
- Editor `Toolbar` component — Play/Stop/Save/Add Object
- Toast notification system (`useToast` + `ToastContainer`) — replaces `alert()`
- File System Access API save-to-disk in editor `handleSave` with download fallback
- `vite-plugin-dts` for `.d.ts` bundling in `packages/engine`
- Unit tests for `Scene`, `GameObject`, `InputManager`, `Interpolator`
