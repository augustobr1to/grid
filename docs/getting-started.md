# Getting started

This guide gets you from a fresh clone to a running multiplayer match, and shows the
minimal code to embed the engine in your own page.

## Prerequisites

- Node.js >= 22
- pnpm 10 (`corepack enable` pins the version from `package.json`)

## Install & verify

```bash
pnpm install
pnpm build      # builds all 6 projects
pnpm test       # 40 tests (engine + server integration)
pnpm lint
```

## Run the reference game locally

The game needs the authoritative server running:

```bash
# terminal 1 — Colyseus server on ws://localhost:2567
pnpm dev:server

# terminal 2 — game client (Vite)
pnpm dev:game
```

Open the printed Vite URL, pick a team, and play. Open a second tab to see real
multiplayer: both clients receive the same map (server-authoritative seed) and see each
other move and jump.

## Embed the engine

The engine package (`@thegridcn/engine`) externalizes `three` and
`@dimforge/rapier3d-compat` — your app provides them.

```ts
import { Game } from '@thegridcn/engine';

// Renders a scene from `${baseURL}/game.json` into a fullscreen canvas.
const game = new Game('/assets', {
  rendererOptions: {
    setupFullScreenCanvas: true,
    tron: true,   // ACES tone mapping + UnrealBloom "Tron" look
    bloom: true,
  },
  inputOptions: { wsadMovement: true, mouseOptions: { usePointerLock: true } },
});

await game._init();
await game.loadScene('my_scene');

// Always release listeners + GL context + assets when you're done:
window.addEventListener('beforeunload', () => game.dispose());
```

### Connect to a Colyseus room

```ts
import { ColyseusNetworkManager } from '@thegridcn/engine';

const net = new ColyseusNetworkManager({ roomName: 'grid_room' });
const room = await net.connect({ name: 'Player', team: 'blue' });

net.on('stateChanged', (state) => {
  // state.players is a MapSchema<PlayerState>; state.seed is the shared map seed.
});

net.sendInput({
  seq: 1, forward: true, backward: false, left: false, right: false, jump: false,
  yaw: 0, pitch: 0, fire: false, weaponId: 'smg', slot: 'sr',
  origin: [0, 0, 0], direction: [0, 0, 0],
});
```

## API reference

Generate browsable API docs from the TypeScript sources:

```bash
pnpm docs        # outputs HTML to docs/api/
```

## Where to go next

- `docs/01-architecture.md` — system architecture
- `docs/03-engine-api.md` — engine API tour
- `CHANGELOG.md` — release notes and known limitations
- `tasks/v1.0.0-gap-analysis.md` — roadmap beyond 1.0.0
