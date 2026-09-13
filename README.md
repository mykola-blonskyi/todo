# todolist

Advanced TODO list app at [todo.blonskyi.dev](https://todo.blonskyi.dev) — a subdomain project of
the personal hub ([blonskyi.dev](https://blonskyi.dev), repo `my-projects`). Users log in via
[login.blonskyi.dev](https://login.blonskyi.dev) (repo `login`), the shared OpenID Provider for all
`*.blonskyi.dev` projects — this repo is a genuine OIDC client of it, not a consumer of the hub's own
session cookie (ADR-016).

**Status: early implementation.** Design is complete (see `docs/`), infrastructure and the Prisma
schema are in place, and implementation is underway ticket by ticket — see
[Issues](https://github.com/mykola-blonskyi/todo/issues) for the current breakdown and
[plans/current.md](plans/current.md) for the phased plan.

## What it does (once built)

- Create Lists of Tasks, with optional due dates
- Share a List with other hub-authorized users — they can toggle tasks done and comment, but not
  edit the list's content
- Optional, one-way, manual sync of due-dated Tasks to your own Google Calendar
- Six switchable layouts (Workspace, Board, Notebook, Pocket, Terminal, Ledger), twelve colour
  palettes, light/dark/system — all per-user; localized (en/ru/uk/es), matching the hub

## Tech stack

- **Frontend** — Next.js, shadcn/ui, Tailwind CSS, `next-intl`, `next-themes`
- **Backend** — NestJS, GraphQL (code-first), Prisma, PostgreSQL — internal-only (no public API,
  the frontend is the sole entry point, see ADR-003)
- **Auth** — Auth.js (`next-auth`) as a genuine OIDC client of `login.blonskyi.dev` (ADR-016); no
  shared cookie or secret with the hub
- **Monorepo** — single pnpm workspace (`backend/`, `frontend/`)

## Local development

### Prerequisites

- Node.js 22+
- pnpm
- Docker + Docker Compose
- A local checkout of the [`login`](https://github.com/mykola-blonskyi/login) repo (Go 1.24+) —
  since ADR-016 the frontend has no auth of its own to fall back on: every page request needs a
  real session issued by a running `login` instance. There is no dev bypass.

### Setup

```bash
git clone https://github.com/mykola-blonskyi/todo.git
cd todo
pnpm install

# Backend: local Postgres + Prisma
cd backend
cp .env.example .env   # fill in DB_USER/DB_PASSWORD/DB_NAME (any values - throwaway local DB)
docker compose -f docker-compose.dev.yml up -d --wait
pnpm db:migrate
cd ..

cp frontend/.env.example frontend/.env   # see "Local login instance" below for the OIDC values

pnpm --filter backend start:dev    # NestJS on its configured port
pnpm --filter frontend dev         # Next.js on http://localhost:3000
```

### Local `login` instance

Register todolist once against your local IdP, from the `login` repo:

```bash
REGISTER_CLIENT_ID=todolist REGISTER_CLIENT_NAME=Todolist \
REGISTER_CLIENT_SECRET=<generate one> \
REGISTER_REDIRECT_URIS=http://localhost:3000/api/auth/callback/login \
REGISTER_KIND=confidential \
go run ./cmd/login register-client

ISSUER=http://localhost:4000 DATABASE_URL=<login's throwaway Postgres> \
GOOGLE_CLIENT_ID=placeholder GOOGLE_CLIENT_SECRET=placeholder \
OWNER_EMAIL=you@example.com SESSION_SECRET=dev-secret \
KEY_ENCRYPTION_KEY=dev-key-encryption-secret \
go run ./cmd/login serve
```

Then in `frontend/.env` set `OIDC_ISSUER=http://localhost:4000`, `OIDC_CLIENT_SECRET` to the secret
you just registered, and `AUTH_SECRET` to any fresh value (`openssl rand -base64 32`).

Signing in needs an approved `login` user who also has a `client_members` grant for `todolist`. If
Google OAuth isn't usable from your environment, seed a `sessions` row and sign the `login_session`
cookie by hand — see login's own `examples/go-client/README.md`, "Testing without Google".

### Available commands

Run from the repo root with `pnpm --filter backend <script>` / `pnpm --filter frontend <script>`:

| Script | Backend | Frontend |
|---|---|---|
| Dev server | `start:dev` | `dev` |
| Build | `build` | `build` |
| Lint (fix) / check | `lint` / `lint:check` | `lint` |
| Format (write) / check | `format` / `format:check` | `format` / `format:check` |
| Unit tests | `test` | `test` |
| E2E / integration tests | `test:e2e` (real Postgres via Docker) | root `pnpm test:e2e` (Playwright, both apps) |
| Prisma | `db:generate`, `db:migrate`, `db:studio` | — |

## Testing

- **Backend unit**: Jest, colocated `*.spec.ts` files — matches NestJS's own conventions.
- **Backend integration/e2e**: Jest against a real Postgres (`backend/docker-compose.test.yml`),
  hitting the actual GraphQL API — `pretest:e2e`/`posttest:e2e` manage the container automatically,
  no manual setup needed. Mocks only the trusted identity header, never the database.
- **Frontend unit/component**: Vitest + React Testing Library, matching the hub's setup.
- **E2E**: Playwright, driving both apps from the root (`playwright.config.ts` + `e2e/`) — signs in
  by minting a session JWT directly (hub's ADR-021 pattern) rather than driving real Google OAuth,
  wired into CI as the `e2e` job (see `plans/current.md` Phase 7).

## Architecture & design docs

- [docs/architecture.md](docs/architecture.md) — components, data flow, deployment topology
- [docs/decisions.md](docs/decisions.md) — ADRs for every hard-to-reverse design/implementation call
- [knowledge/domain-model.md](knowledge/domain-model.md) — entities and relationships
- [knowledge/business-rules.md](knowledge/business-rules.md) — permission/sharing/sync rules
- [knowledge/glossary.md](knowledge/glossary.md) — canonical terminology
- [plans/current.md](plans/current.md) — phased implementation plan
- [plans/backlog.md](plans/backlog.md) — deferred/future work

## Issue tracking

Specs and implementation tickets live as [GitHub Issues](https://github.com/mykola-blonskyi/todo/issues)
(see `docs/agents/issue-tracker.md`) — specs describe a feature end-to-end; tickets are the
vertical-slice breakdown of each spec, in dependency order.

## Deployment

Planned: Coolify on the same VPS as the hub, two services (frontend public, backend internal-only),
two GHCR images, GitHub Actions building/pushing on merge to `main`. Not live yet — see
`plans/current.md` Phase 7 for what's still needed (Dockerfiles, Coolify registration, deploy
secrets).
