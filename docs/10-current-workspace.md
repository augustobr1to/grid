# Current Workspace Layout

This document supersedes older path/package-manager sections in `docs/00` through `docs/09`.

## Rule

| Kind | Location | Reason |
|---|---|---|
| Deployable browser app | `apps/*` | Has `dev`, `build`, `preview`, server port, deployment artifact |
| Deployable Node server | `apps/*` | Runs as process, has runtime config and build output |
| Reusable library | `packages/*` | Imported by apps, versionable/publishable, no direct deployment |

## Active Projects

| Project | Path | Role |
|---|---|---|
| `@thegridcn/www` | `apps/www` | React/Vite landing page |
| `@thegridcn/server` | `apps/server` | Primary Colyseus authoritative server |
| `@thegridcn/socketio-server` | `apps/socketio-server` | Legacy Socket.IO authoritative server |
| `@thegridcn/editor` | `apps/editor` | React/Vite scene editor |
| `@thegridcn/game` | `apps/game` | Browser game example |
| `@thegridcn/engine` | `packages/engine` | Reusable 3D engine library |
| `@thegridcn/shared` | `packages/shared` | Shared multiplayer protocol types |

## Commands

```bash
pnpm install
pnpm nx show projects
pnpm build
pnpm test
pnpm dev:www
pnpm dev:server
pnpm dev:socketio-server
pnpm dev:editor
pnpm dev:game
```

## Workspace Globs

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

`packages/engine` and `packages/shared` stay outside `apps/*` by design. They are not deployables.
