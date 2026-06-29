# Grid — 4-Agent Council Audit (2026-06-29)

Read-only audit by 4 parallel agents over disjoint domains: engine core, networking+voice, frontend apps, build/CI/deps. Branch `main` @ `746e8b5`. Build/tests/lint green at audit time.

## 🔴 CRITICAL — multiplayer broken end-to-end
- [ ] **Map seed client-random** — `apps/game/src/main.js:154`. `Math.random()` per client → divergent collision maps + capture layouts. Server must send seed on join; generate city after.
- [ ] **Server freezes player.y=1.7, ignores jump/gravity** — `apps/server/src/GridRoom.ts:57-111`. Client gravity vs frozen server Y → `reconcile` hard-snaps Y every jump (`main.js:252`). Simulate Y server-side or exclude Y from reconcile.
- [ ] **Reconcile hard-snap, no input replay** — `InputQueue` unused, snap on diff>0.5 → rubber-band. (known/deferred)

## 🟠 HIGH
### Teardown / leaks
- [ ] `Game` has no `dispose()` — input listeners + WebGL ctx + assets leak. `packages/engine/src/Game.ts:14-51`.
- [ ] Voice never disposed, room never left — mic stays hot, PeerJS peer + `<audio>` leak. `apps/game/src/main.js` (+ `beforeunload`).
- [ ] `removeRemotePlayer` doesn't drop peer voice — `main.js:341-348`.
- [ ] game `main.js` no teardown of tracerPool/BVH/city geometry on re-init.
- [ ] No reconnection — dropped socket freezes player, no UI. `ColyseusClient.js` doesn't subscribe to `disconnected`/`error` from `ColyseusNetworkManager.ts:94-101`.
- [ ] `joinRoom` swallows failure → UI stuck on LOADING. `ColyseusClient.js:45-47`.

### Supply chain / version
- [ ] Colyseus client `0.16` vs server `0.17`/schema `4` — cross-major wire risk. Bump client to `^0.17`.
- [ ] Prune dead deps: `ecsy`, `howler` (zero imports), likely `events`, stray `vitest`; clean jest/vite dangling refs.

### Client correctness
- [ ] `m`-key overlay toggles every frame held — edge-detect like `q`. `main.js:388`.
- [ ] Team `'auto'` never resolved client-side → origin spawn, wrong material. `main.js:143,148`. Set from join payload.
- [ ] Editor Inspector stale values on selection switch — uncontrolled inputs, add `key={selectedId}`. `apps/editor/src/App.tsx:141,226-253`.

### Engine
- [ ] Nested rigid bodies mis-positioned (local vs world space) — `GameObject.ts:29-33,75-76` / `RigidBodyComponent`. Use world-space conversion or restrict to root.

## 🟡 MED
- [ ] Type-safety: `no-explicit-any:off` workspace-wide (`eslint.config.mjs:30`); introduce `ISceneHost`/`IGameHost`/`INetworkManager`, kill 24+ engine `any`; migrate game `.js`→`.ts` (13 files).
- [ ] Dead/unimplemented systems: Scoreboard.update never called (`Scoreboard.js:15`); CapturePoint.updateVisual never called (`main.js:300`,`CapturePoint.js:53`); audio SFXManifest has no playback; "RETURN TO LOBBY" btn-lobby no handler (`index.html:585`); editor viewport is 2D placeholder shell (`App.tsx:302-360`); LobbyUI console.log no-ops.
- [ ] CI size gate non-functional: threshold 800kB vs actual 139kB → ~160kB; size step assumes engine dist always built on affected PRs; gate real app bundles. `ci.yml:60,68`, `package.json:55-60`.
- [ ] Server trust/DoS: no input rate-limit; unbounded room creation (`index.ts:19`); peerId unvalidated + rewriteable forces clients to dial arbitrary ids (`GridRoom.ts:32-37`); `isValidInput` no finite check (`:119-131`).
- [ ] Voice on public broker `0.peerjs.com`; no mute/PTT/block; auto-answers any caller. `VoiceChat.js:28,35`.
- [ ] Only latest input/tick kept → fire intents dropped. `GridRoom.ts:61-110`.
- [ ] Snapshot stamped with local `Date.now()` (irregular cadence) → jittery interp; use server tick. `ColyseusClient.js:67`.
- [ ] Duplicate dead root `InputManager.ts`/`Interpolator.ts` modules, divergent from shipped.
- [ ] tsconfig src-vs-dist alias incoherence → tsc tests validate different artifacts than build.
- [ ] Engine misc: scene-level lights not disposed (`Scene.ts:194-208`); ModelComponent clone shares cached geo/mat, unsafe on unloadAll (`ModelComponent.ts:18,48`); `advanceShaderTime` never called → static shaders; two physics-stepping paths; hardcoded y<0 floor in KinematicCC; magic 1.7 eye-height in DynamicCC.
- [ ] `.gitignore` no `.env*` rule.

## 🟢 Clean
pnpm audit zero vulns; no secrets/dist/.env tracked; node22/pnpm10.14 consistent; dependabot + frozen-lockfile + concurrency-cancel.

## Test coverage gap
Only `@thegridcn/engine` has real Jest (4 files, 21 tests). All other `test` targets = `tsc --noEmit` only. No tests for physics helpers, renderer stepping, shipped Interpolator, Colyseus room logic.
