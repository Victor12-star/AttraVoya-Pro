# syntax=docker/dockerfile:1.7

ARG NODE_VERSION=24.20.0
ARG PNPM_VERSION=11.22.0

FROM node:${NODE_VERSION}-bookworm-slim AS operating-system

RUN apt-get update \
  && apt-get install --yes --no-install-recommends ca-certificates openssl \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

FROM operating-system AS build

ARG PNPM_VERSION
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
ENV PNPM_HOME=/pnpm
ENV PATH=${PNPM_HOME}:${PATH}

WORKDIR /workspace

RUN corepack enable \
  && corepack prepare "pnpm@${PNPM_VERSION}" --activate

COPY . .

RUN --mount=type=cache,id=attravoya-pnpm-store,target=/pnpm/store \
  pnpm install --frozen-lockfile

RUN pnpm --filter @attravoya/database generate \
  && pnpm --filter @attravoya/server build \
  && pnpm --filter @attravoya/server --prod deploy --legacy /opt/attravoya-server

# pnpm deploy installs only production dependencies. Generate once more against
# that isolated dependency tree so the JavaScript Prisma Client is deployable.
# Prisma is intentionally pinned as a development dependency of the database
# package, so invoke that package-local CLI rather than assuming a root binary.
RUN cd /opt/attravoya-server \
  && /workspace/packages/database/node_modules/.bin/prisma generate \
    --schema=/opt/attravoya-server/node_modules/@attravoya/database/prisma/schema.prisma

FROM operating-system AS runtime

ENV API_HOST=0.0.0.0
ENV NODE_ENV=production
ENV API_PORT=5000

LABEL org.opencontainers.image.title="AttraVoya Pro API" \
  org.opencontainers.image.description="AttraVoya Pro Fastify REST API"

COPY --from=build --chown=node:node /opt/attravoya-server ./

USER node

EXPOSE 5000

# Liveness proves only that this API process can answer. Deployment platforms
# should use /api/v1/health/ready separately before routing application traffic.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e 'fetch("http://127.0.0.1:" + process.env.API_PORT + "/api/v1/health/live", { signal: AbortSignal.timeout(4000) }).then((response) => { if (!response.ok) process.exit(1); }).catch(() => process.exit(1));'

CMD ["node", "src/server.js"]
