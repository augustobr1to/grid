# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-06-29

First tagged release: a browser 3D game engine (Three.js + Rapier) with an
authoritative Colyseus multiplayer server and PeerJS P2P voice.

### Added
- **Engine**: scene graph (`Game` / `Scene` / `GameObject` / `Component`), Three.js
  renderer with optional "Tron" post-processing (ACES tone mapping + UnrealBloom),
  Rapier physics, kinematic/dynamic character controllers, asset store (GLTF/texture/
  JSON/sound), input manager (keyboard / pointer-lock mouse / gamepad), shader library.
- **Multiplayer**: authoritative Colyseus `GridRoom` — server-driven movement, vertical
  jump/gravity sim, yaw wrapping, per-client reconcile — over a typed shared protocol;
  client snapshot interpolation.
- **Voice**: P2P WebRTC voice via PeerJS, peer ids brokered through Colyseus room state.
- **Game**: "Grid War" reference game (team capture, arsenal, HUD, map overlay).
- `Game.dispose()` for full teardown (renderer, scene, input listeners, assets, room).
- Server input rate-limiting, finite-number input validation, peerId charset checks.
- **Tests**: 40 across engine + server, including Colyseus integration tests that boot a
  real server + SDK client to verify the schema wire path end-to-end.
- API documentation via TypeDoc (`pnpm docs`) and a getting-started guide.

### Fixed
- Map generation is now server-authoritative (one seed broadcast to all clients);
  previously each client built a different collision map, desyncing multiplayer.
- Client reconciliation corrects X/Z only, preserving terrain-aware local Y, removing
  the jump rubber-banding caused by the server's flat-ground Y.
- Rigid bodies on nested GameObjects are seeded from and synced in world space, fixing
  silent mis-positioning of any non-root physics object.
- `EventEmitter.emit` iterates a snapshot so listeners may mutate handlers mid-dispatch.
- Voice/room resources torn down on match end and tab close; leavers' calls/audio freed.
- Connection loss is surfaced to the UI instead of freezing the player silently.
- Map-overlay `m` key edge-detected; team `auto` resolved from the server.
- Aligned Colyseus client/server on a compatible schema version; pruned unused
  dependencies (`ecsy`, `howler`, `events`).
- Migrated transport from Socket.IO to Colyseus (Socket.IO fully removed).
- `size-limit` now measures the engine's own code (peers externalized) with a tight gate.

### Known limitations (tracked for 1.x — see `tasks/v1.0.0-gap-analysis.md`)
- Client reconciliation is hard-snap (no input replay); rubber-bands under high latency.
- The engine package is not yet published to a registry; no server deploy pipeline ships.
- Core host-graph types still use `any` in places (public-API typing refactor pending).
- Voice runs on the public PeerJS broker; no mute / push-to-talk / self-hosted signaling.
- The editor app is a preview shell (2D placeholder viewport), not engine-backed.
- `docs/04-multiplayer-socketio.md` is retained for history but describes the removed
  Socket.IO transport; see the Colyseus server for current behavior.

## [Unreleased]

### Added
- `Scene` — load GameObjects from SceneJSON, Rapier world integration
- `GameObject` — component attach/detach, hierarchy, physics sync
- `InputManager` — keyboard, mouse (pointer lock), gamepad
- `Interpolator` — snapshot interpolation (slerp/lerp) for remote entities
- Editor `Viewport` component (Three.js + OrbitControls + grid gizmo)
- Editor `SceneTree` component with drag-drop reorder
- Editor `Inspector` component — transform & component property editor
- Editor `Toolbar` component — Play/Stop/Save/Add Object
- Toast notification system (`useToast` + `ToastContainer`) — replaces `alert()`
- File System Access API save-to-disk in editor `handleSave` with download fallback
- `vite-plugin-dts` for `.d.ts` bundling in `packages/engine`
- Unit tests for `Scene`, `GameObject`, `InputManager`, `Interpolator`
