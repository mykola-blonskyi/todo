# syntax=docker/dockerfile:1
#
# Build context is the monorepo root (see root docker-compose.yml) - a pnpm
# workspace install needs the root lockfile/pnpm-workspace.yaml plus every
# package.json, not just backend/'s own files.

ARG NODE_VERSION=22

FROM node:${NODE_VERSION}-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME/bin:$PATH"
RUN corepack enable

FROM base AS build
# The Prisma CLI needs OpenSSL to detect the right query-engine binary target
# on Debian - see Prisma's own Docker guidance.
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
COPY . /usr/src/app
WORKDIR /usr/src/app
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile
RUN pnpm --filter backend exec prisma generate
RUN pnpm --filter backend build
RUN pnpm deploy --filter=backend --prod /prod/backend
# `dist/` is gitignored, so `pnpm deploy` (which respects VCS ignore rules,
# like `npm pack`) leaves it out even though it was just built - copy it in
# explicitly.
RUN cp -r backend/dist /prod/backend/dist

FROM base AS runner
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build --chown=node:node /prod/backend ./
USER node

EXPOSE 4000

# Applies pending migrations, then starts the server - see docs/decisions.md
# for the Coolify env vars this expects (DATABASE_URL, HUB_URL, PROJECT_SLUG,
# PORT).
CMD ["sh", "-c", "node_modules/.bin/prisma migrate deploy && node dist/main"]
