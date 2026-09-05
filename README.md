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
- Themed (light/dark/rose) and localized (en/ru/uk/es), matching the hub

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

pnpm --filter backend start:dev    # NestJS on its configured port
pnpm --filter frontend dev         # Next.js on http://localhost:3000
```

### Available commands

Run from the repo root with `pnpm --filter backend <script>` / `pnpm --filter frontend <script>`:

| Script | Backend | Frontend |
|---|---|---|
| Dev server | `start:dev` | `dev` |
| Build | `build` | `build` |
| Lint (fix) / check | `lint` / `lint:check` | `lint` |
| Format (write) / check | `format` / `format:check` | `format` / `format:check` |
| Unit tests | `test` | `test` |
| E2E / integration tests | `test:e2e` (real Postgres via Docker) | — (Playwright, not wired up yet) |
| Prisma | `db:generate`, `db:migrate`, `db:studio` | — |

## Testing

- **Backend unit**: Jest, colocated `*.spec.ts` files — matches NestJS's own conventions.
- **Backend integration/e2e**: Jest against a real Postgres (`backend/docker-compose.test.yml`),
  hitting the actual GraphQL API — `pretest:e2e`/`posttest:e2e` manage the container automatically,
  no manual setup needed. Mocks only the trusted identity header, never the database.
- **Frontend unit/component**: Vitest + React Testing Library, matching the hub's setup.
- **Frontend e2e**: Playwright, planned for once there's real UI to drive (see `plans/current.md`
  Phase 7).

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
