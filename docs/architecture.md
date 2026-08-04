# Architecture

## Overview

Advanced TODO list app at `todo.blonskyi.dev`, a subdomain project of the personal hub
(`blonskyi.dev`, repo `my-projects`). Users log in exclusively via the hub's Google SSO; todolist
never runs its own login flow. Users create Lists of Tasks, can share a List with other hub-approved
users, and can optionally push individual Tasks to their own Google Calendar.

This repo is a single flattened monorepo (`backend/` = NestJS GraphQL API, `frontend/` = Next.js
app) — see [ADR-006](decisions.md) for why the two were merged from separately-scaffolded repos.

---

## Goals

- Reuse the hub's existing SSO and per-project access control rather than re-implementing auth
- Let a List owner share it with specific collaborators, who can mark tasks done and comment, but
  not edit the list's content
- Optional, explicit, one-way sync of individual tasks to each user's own Google Calendar
- Consistent look and feel with the hub: same shadcn theme set, same four locales
- Fully self-hosted on the existing VPS via Coolify, alongside the hub and its shared Postgres

---

## System Components

### Frontend

Responsibilities:
- All user-facing pages (lists, tasks, sharing, comments, settings, calendar connect)
- Acts as a BFF: the only public entry point, calls the backend GraphQL API server-side
- Subdomain auth middleware (hub validate check) + `next-intl` locale routing, same pattern as the
  hub's own middleware
- Google Calendar OAuth callback route (`/api/google/calendar/callback`) — REST, not GraphQL, since
  it's a third-party redirect target

Stack: Next.js 16, TypeScript, shadcn/ui, Tailwind CSS v3 (matched to the hub's version so shadcn
components/theme tokens can be copied directly — see [ADR-007](decisions.md)), `next-themes`
(light/dark/theme-rose, same as hub), `next-intl` (en/ru/uk/es, URL-based, same as hub)

Dependencies: hub's `/api/auth/validate` and `/api/auth/project-members` endpoints, the internal
backend API, PostgreSQL (via the backend only — frontend never talks to Postgres directly)

---

### Backend

Responsibilities:
- GraphQL API (code-first) for all List/Task/Comment/ListShare/CalendarSync operations
- Google Calendar API calls (push events, delete events) using each user's stored
  GoogleCalendarConnection
- Owns the `todo` Postgres database via Prisma

Stack: NestJS, `@nestjs/graphql` (code-first driver), Prisma ORM, PostgreSQL

Dependencies: PostgreSQL (`todo` database, dedicated `todo_app` role — see [ADR-002](decisions.md)),
Google Calendar API

**Not publicly reachable.** No subdomain, no public DNS entry, no CORS config. Only the frontend
container can reach it, over Coolify's private `coolify` Docker network — see
[ADR-003](decisions.md).

---

### Integrations

External systems:

- **Hub (`blonskyi.dev`)** — identity and per-project access control. Todolist calls
  `/api/auth/validate` (login/access gate) and `/api/auth/project-members` (share-target search).
  No auth logic is duplicated locally.
- **Google OAuth (Calendar scope)** — separate consent flow from hub login, reusing the hub's
  existing OAuth Client with an additional registered redirect URI — see [ADR-004](decisions.md).
- **Google Calendar API** — one-way event push/delete per user, triggered manually, never read from.
- **Coolify** — self-hosted PaaS, same VPS as the hub: Docker container orchestration, Traefik
  reverse proxy, SSL, deploy webhooks.
- **GitHub Actions → GHCR** — CI/CD: lint/typecheck/test both apps on every push; on merge to
  `main`, build and push two images, trigger two Coolify webhooks.

---

## Data Flow

### Login / access flow
```
User → todo.blonskyi.dev → frontend middleware
→ read JWT from .blonskyi.dev cookie (or none → redirect to hub login)
→ GET {API_URL}/api/auth/validate?project=todo
→ allowed:false → redirect to hub login
→ allowed:true → upsert local shadow User row from claims → serve page
```

### Share flow
```
Owner searches "share with…" → frontend calls backend GraphQL
→ backend calls hub GET /api/auth/project-members?project=todo&q=<term>
→ owner picks a result → backend creates ListShare(status: pending)
→ invitee's next login/visit → sees pending ListShare → accepts/declines
→ accepted → invitee is now a Collaborator (Rule 3, Rule 4 in business-rules.md)
```

### Calendar sync flow (one task, one user, manual trigger)
```
User clicks "Sync to Google Calendar" on a List (with a valid GoogleCalendarConnection)
→ backend: for each Task with a dueDate and no existing CalendarSync row for this user
→ Google Calendar API: insert event → store CalendarSync(userId, taskId, googleEventId)
→ (later) Task marked done → backend deletes the event for every CalendarSync row on that Task,
  best-effort, then deletes the rows (Rule 9)
```

---

## Deployment

- **VPS**: same server as the hub, Docker + Coolify
- **Build**: Coolify builds both images itself from the root `docker-compose.yml` (Docker Compose
  build pack) — no GHCR, no separately-pushed images
- **Network**: no custom `networks:` block in `docker-compose.yml` — Coolify manages its own
  per-stack network, with "Connect to Predefined Network" enabled on this resource so the backend
  can reach the shared Postgres instance at host `postgres`
- **Domains**: only the `frontend` service gets a public domain (`todo.blonskyi.dev`); `backend`
  gets none, staying internal-only (ADR-003)
- **Database**: same shared Postgres instance as the hub, dedicated `todo_app` role / `todo`
  database — not part of this repo's `docker-compose.yml` (external, already running)
- **Deploy trigger**: a single Coolify deploy webhook, called by the `deploy` job in
  `.github/workflows/ci.yml` only after every lint/format/typecheck/test job passes on `main`

See `docker-compose.yml`, `backend/Dockerfile`, and `frontend/Dockerfile` at the repo root for the
actual configuration — this section intentionally doesn't duplicate it.

---

## Security

Authentication:
- Delegated entirely to the hub — no local password/session implementation
- Frontend validates the shared `.blonskyi.dev` cookie via the hub's `/api/auth/validate` on every
  request (same middleware pattern as `boilerplates/subdomain-app.md` in the hub repo)
- Backend trusts requests only from the frontend, over the private Docker network — it does not
  independently re-verify the JWT (see [ADR-003](decisions.md))

Authorization:
- List-level: Owner vs Collaborator, enforced in backend resolvers per
  [business-rules.md](../knowledge/business-rules.md) Rules 2–3
- Project-level: hub's `project_access`, enforced before any request reaches todolist at all (Rule 1)

Secrets Management:
- Environment variables only, never committed; Google Calendar refresh/access tokens encrypted at
  rest in the `GoogleCalendarConnection` table

---

## Observability

Logging:
- Next.js/Nest default stdout logs, captured by Coolify — same as the hub

Metrics:
- None beyond Cloudflare's edge dashboard, matching the hub's stance at this project's scale

Tracing:
- Not configured — personal project scale doesn't warrant it (same rationale as the hub)
