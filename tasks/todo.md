# Fix plan — council CRITICAL + HIGH (branch fix/council-critical-high)

## CRITICAL trio (multiplayer correctness)
- [x] 1. Server-authoritative map seed: add `seed` to GridRoomState; server picks in onCreate; client builds city from server seed (restructure onPlayClicked → buildWorld after roomJoined).
- [x] 2. Server vertical sim: track per-player vy, jump+gravity on flat floor (REST_Y=1.7, GRAVITY=20, JUMP=8) so remote players see jumps.
- [x] 3. Reconcile XZ-only on client: preserve local Y → kills jump rubber-band.

## HIGH
- [x] 4. Engine `Game.dispose()` — renderer.dispose + scene.unload + inputManager.dispose + assetStore.unloadAll.
- [x] 5. Voice/room teardown: beforeunload + POST_MATCH dispose; VoiceChat.dropPeer; call from removeRemotePlayer (track playerId→peerId).
- [x] 6. m-key edge-detect (mWasDown).
- [x] 7. Team `auto` resolved from server-confirmed own team (via roomJoined payload).
- [x] 8. Reconnection signal: ColyseusClient surfaces disconnect/error to UI callbacks.
- [x] 9. Colyseus client 0.16 → 0.17 (match server).
- [x] 10. Prune dead deps ecsy/howler/events + jest/vite config refs.
- [x] 11. Server hardening: finite-number check on input origin/direction; peerId charset/length validation.

## Verify
- [x] build all green (6 projects), tests 21/21, lint clean
- [x] present diff for review (do NOT merge to main without OK)

## Deferred (large refactors, noted not done)
- Engine `any`→ISceneHost/INetworkManager interfaces; re-enable no-explicit-any
- game `.js`→`.ts` migration (13 files)
- Full client input-replay reconciliation (InputQueue)
- Colyseus room jest test harness
- Dead UI systems (scoreboard wiring, capture visuals, audio, return-to-lobby, editor 3D viewport)
