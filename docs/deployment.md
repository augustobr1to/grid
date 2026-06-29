# Deployment

Grid has two deployable pieces: the **authoritative Colyseus server** (stateful,
long-lived, one process per region/shard) and the **static game client** (built to
plain files, served from any CDN/static host).

## Server (apps/server)

The server is a Node process that speaks WebSocket (Colyseus) plus an Express
`/health` route. It is the source of truth — players connect to it directly.

### Container

```bash
# Build (run from the repo root — the Dockerfile needs workspace context):
docker build -f apps/server/Dockerfile -t grid-server .

# Run:
docker run -p 2567:2567 -e PORT=2567 grid-server
```

The image builds `@thegridcn/shared` and `@thegridcn/server` via the pnpm
workspace, then runs `node dist/index.js`. A `HEALTHCHECK` polls `/health`.

> The image carries the full workspace and is not size-optimized; a multi-stage
> `pnpm deploy --prod` slim build is a tracked follow-up.

### Environment

| Var    | Default | Purpose                              |
| ------ | ------- | ------------------------------------ |
| `PORT` | `2567`  | Port the WebSocket + Express bind to |

### Managed hosting

The server is stateful (rooms hold authoritative state), so it must run as a
persistent process — not a serverless function. [Colyseus Cloud](https://cloud.colyseus.io)
is the first-party option; any container host (Fly.io, Render, ECS, a VM) works
provided WebSockets and sticky sessions are supported.

## Client (apps/game)

Static build — host the `dist/` output anywhere.

```bash
pnpm --filter @thegridcn/game build      # outputs apps/game/dist
```

Point the client at the deployed server with a build-time env var (see
`.env.example`):

```bash
VITE_COLYSEUS_URL=wss://your-server.example.com pnpm --filter @thegridcn/game build
```

If unset, the client connects to `ws(s)://<current-host>:2567`, which is correct
for local development but not for a split client/server deployment.

## Scaling notes (post-1.0)

- No matchmaking/room-cap policy ships yet; cap rooms via the Colyseus matchmaker
  before exposing publicly.
- Voice currently uses the public PeerJS broker; self-host a PeerServer for
  production so signaling stays on your infrastructure.
