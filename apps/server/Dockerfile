# Grid authoritative Colyseus server.
#
# Builds the server (and its workspace dep @thegridcn/shared) inside the pnpm
# monorepo, then runs the compiled output. Workspace symlinks created by pnpm
# resolve @thegridcn/shared -> packages/shared/dist at runtime.
#
# Build:  docker build -f apps/server/Dockerfile -t grid-server .
# Run:    docker run -p 2567:2567 -e PORT=2567 grid-server
#
# NOTE: image is correct but not size-optimized (carries the full workspace);
# a multi-stage `pnpm deploy --prod` slim image is a follow-up.

FROM node:22-alpine AS build
WORKDIR /repo
RUN corepack enable

# Dependency layer — copy manifests first so installs cache across code changes.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml nx.json tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/server/package.json apps/server/
RUN pnpm install --frozen-lockfile

# Source + build (nx builds @thegridcn/shared before @thegridcn/server).
COPY packages/shared packages/shared
COPY apps/server apps/server
RUN pnpm --filter @thegridcn/server... build

ENV NODE_ENV=production
ENV PORT=2567
EXPOSE 2567
WORKDIR /repo/apps/server
# Healthcheck hits the Express /health route the server exposes.
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s \
  CMD wget -qO- "http://127.0.0.1:${PORT}/health" || exit 1
CMD ["node", "dist/index.js"]
