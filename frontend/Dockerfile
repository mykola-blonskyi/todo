# syntax=docker/dockerfile:1
#
# Build context is the monorepo root (see root docker-compose.yml) - `next
# build` auto-detects the pnpm workspace root from the lockfile and traces
# output accordingly (see next.config.ts's `output: 'standalone'`), so
# server.js ends up at .next/standalone/frontend/server.js, not
# .next/standalone/server.js.

ARG NODE_VERSION=22

FROM node:${NODE_VERSION}-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME/bin:$PATH"
RUN corepack enable

FROM base AS build
COPY . /usr/src/app
WORKDIR /usr/src/app
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile
WORKDIR /usr/src/app/frontend
RUN pnpm exec next build

FROM node:${NODE_VERSION}-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

COPY --from=build --chown=node:node /usr/src/app/frontend/.next/standalone ./
COPY --from=build --chown=node:node /usr/src/app/frontend/.next/static ./frontend/.next/static
COPY --from=build --chown=node:node /usr/src/app/frontend/public ./frontend/public

USER node
WORKDIR /app/frontend

EXPOSE 3000

# Coolify env vars this expects: APP_URL, HUB_URL, OIDC_ISSUER,
# OIDC_CLIENT_SECRET, AUTH_SECRET, GOOGLE_CLIENT_ID, BACKEND_URL - see
# frontend/.env.example and docs/decisions.md.
CMD ["node", "server.js"]
