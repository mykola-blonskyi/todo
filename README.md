# todolist

Advanced TODO list app at [todo.blonskyi.dev](https://todo.blonskyi.dev) — a subdomain project of
the personal hub ([blonskyi.dev](https://blonskyi.dev), repo `my-projects`). Users log in via
[login.blonskyi.dev](https://login.blonskyi.dev) (repo `login`), the shared OpenID Provider for all
`*.blonskyi.dev` projects — this repo is a genuine OIDC client of it, not a consumer of the hub's own
session cookie (ADR-016).

**Status: live.** The v1 scope is deployed and in use, and the post-v1 phases (recurring templates,
categories, layouts and palettes) have landed on top of it. See
[plans/current.md](plans/current.md) for the phase-level record and Plane for open tickets.

## What it does

- Create Lists of Tasks, with optional due dates
- Share a List with other hub-authorized users — they can toggle tasks done and comment, but not
  edit the list's content
- Optional, one-way, manual sync of due-dated Tasks to your own Google Calendar
- Recurring ListTemplates that spawn dated occurrences on a schedule, and auto-archive the stale
  ones
- Categories on Lists, with per-user filtering
- Six switchable layouts (Workspace, Board, Notebook, Pocket, Terminal, Ledger), twelve colour
  palettes, light/dark/system — all per-user; localized (en/ru/uk/es), matching the hub
- Installable as a PWA, with a themed icon set and a per-layout theme colour

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

pnpm --filter backend start:dev    # NestJS on backend/.env's PORT
pnpm --filter frontend dev         # Next.js on http://localhost:3000
```

All three servers run at once, so the backend needs a port of its own: Next.js holds 3000 and
`login` holds 4000. Give `PORT` in `backend/.env` a free one and point `BACKEND_URL` in
`frontend/.env` at the same value. `backend/.env.example` ships `PORT=4000`, which collides with
`login`.

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
  by minting a session JWT directly (hub's ADR-021 pattern) rather than driving real Google OAuth.
  Runs in CI as the `e2e` job.

## Architecture & design docs

- [docs/architecture.md](docs/architecture.md) — components, data flow, deployment topology
- [docs/decisions.md](docs/decisions.md) — ADRs for every hard-to-reverse design/implementation call
- [knowledge/domain-model.md](knowledge/domain-model.md) — entities and relationships
- [knowledge/business-rules.md](knowledge/business-rules.md) — permission/sharing/sync rules
- [knowledge/glossary.md](knowledge/glossary.md) — canonical terminology
- [plans/current.md](plans/current.md) — phased implementation plan
- [plans/backlog.md](plans/backlog.md) — deferred/future work

## Issue tracking

Specs and implementation tickets live in [Plane](https://plane.blonskyi.dev), workspace `blonskyi`,
project `TODO` (see [docs/agents/issue-tracker.md](docs/agents/issue-tracker.md)) — specs describe a
feature end-to-end; tickets are the vertical-slice breakdown of each spec, in dependency order. The
GitHub Issues this repo used until 2026-08-07 were migrated there and are all closed, and Plane's
numbering does not match the old one. Code review still happens on GitHub pull requests.

## Deployment

Live on [todo.blonskyi.dev](https://todo.blonskyi.dev), via Coolify on the same VPS as the hub. Two
services: `frontend` holds the public domain, `backend` stays internal-only on Coolify's private
network (ADR-003).

Coolify builds both images itself from the root `docker-compose.yml`, so there is no registry and
CI pushes nothing. Every `${VAR:?}` in that file comes from Coolify's per-resource environment
panel, never a committed `.env`.

On a push to `main`, once every lint, format, typecheck and test job is green, the `deploy` job runs
[`scripts/coolify-deploy.sh`](scripts/coolify-deploy.sh). It POSTs the deploy webhook and then polls
`/api/v1/deployments/{uuid}` until the deployment reaches a terminal state, failing the job and
printing the build log if it did not finish. The webhook's own 200 means only that Coolify queued
the work, which is why the job cannot stop there — see
[docs/architecture.md](docs/architecture.md#deployment) and
[reports/investigations/2026-09-14-deploy-reports-success-while-production-stays-stale.md](reports/investigations/2026-09-14-deploy-reports-success-while-production-stays-stale.md).

The `COOLIFY_WEBHOOK_TOKEN` secret needs Coolify's `read` ability as well as `deploy`, or the poll
gets a 403 and the job fails with no way to see the outcome. `read:sensitive` additionally lets it
print the build log of a failure.
