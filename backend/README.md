# backend

NestJS + GraphQL (code-first) API for the todolist app. Internal-only — no public subdomain; the
frontend is the sole caller, over a private Docker network in production (see
[docs/decisions.md](../docs/decisions.md) ADR-003).

## Local development

### Prerequisites

- Node.js 22+, pnpm (installed at the repo root — see the top-level [README](../README.md))
- Docker + Docker Compose

### Setup

```bash
cp .env.example .env
# fill in DB_USER/DB_PASSWORD/DB_NAME (any values - throwaway local DB), then:
#   DATABASE_URL=postgresql://<DB_USER>:<DB_PASSWORD>@localhost:5437/<DB_NAME>

docker compose -f docker-compose.dev.yml up -d --wait   # local Postgres on :5437
pnpm db:migrate                                          # apply Prisma migrations
pnpm start:dev                                            # watch mode
```

> Port 5437, not 5432/5434/5435: those are taken by a native Postgres and the sibling hub repo's
> own dev/test containers (see the hub's `docs/onboarding.md`). Port 5436 is reserved for this
> repo's own `docker-compose.test.yml`.

### Available commands

```bash
pnpm start            # production mode (after pnpm build)
pnpm start:dev         # development, watch mode
pnpm build             # compile to dist/

pnpm lint              # ESLint, --fix
pnpm lint:check        # ESLint, no fix (CI)
pnpm format            # Prettier, write
pnpm format:check      # Prettier, check only (CI)

pnpm test              # unit tests (Jest, colocated *.spec.ts)
pnpm test:e2e          # integration tests against a real Postgres (docker-compose.test.yml)

pnpm db:generate       # regenerate the Prisma client after a schema change
pnpm db:migrate        # create + apply a migration (prisma migrate dev)
pnpm db:studio         # Prisma Studio (local DB UI)
```

## Testing

`pnpm test:e2e` boots the real NestJS app and hits it via `supertest`/GraphQL, against a real
Postgres — `pretest:e2e`/`posttest:e2e` hooks start and stop `docker-compose.test.yml`
automatically. Tables are truncated between tests (`test/setup/jest-setup.ts`); migrations run once
per test run (`test/setup/global-setup.ts`). Only the trusted `x-user-id` identity header is ever
mocked — never the database — matching the hub's own integration-test philosophy (see the hub's
ADR-008).

## Prisma

Pinned to **Prisma 6** (`prisma-client-js` generator), not the current-latest Prisma 7 — its new
ESM/WASM client architecture doesn't run under this project's Jest/CommonJS setup without a much
bigger toolchain change than was warranted. See [docs/decisions.md](../docs/decisions.md) ADR-011
before touching the Prisma version.

Schema: [prisma/schema.prisma](prisma/schema.prisma), matching
[knowledge/domain-model.md](../knowledge/domain-model.md) entity-for-entity.

## Further docs

See the [repo root README](../README.md) and [docs/](../docs/) for architecture, ADRs, and the
phased implementation plan.
