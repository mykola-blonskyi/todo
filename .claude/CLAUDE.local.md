# Local Project Instructions

## Project Context

Advanced TODO list app at `todo.blonskyi.dev`, a subdomain project of the personal hub
(`blonskyi.dev`, sibling repo `~/workspace/my-projects`). Users authenticate exclusively via the
hub's Google SSO — this repo never implements its own login. Full design in
[docs/architecture.md](../docs/architecture.md), [docs/decisions.md](../docs/decisions.md),
[knowledge/domain-model.md](../knowledge/domain-model.md), and
[knowledge/business-rules.md](../knowledge/business-rules.md).

---

## Constraints

- Auth is entirely delegated to the hub — no local session/JWT-verification implementation in this
  repo (docs/decisions.md ADR-001)
- Backend (NestJS/GraphQL) is internal-only — no public subdomain, no CORS, reachable only from the
  frontend over the private Coolify Docker network (ADR-003)
- No cross-database joins into the hub's Postgres — todolist keeps its own local shadow `User` row,
  never a real FK into the hub's `users` table (ADR-002)
- Calendar sync is one-way (todolist → Google Calendar) and manual only — never bidirectional, never
  automatic on task edits (ADR-005)

---

## Architecture Notes

- Single flattened monorepo: `backend/` (NestJS) + `frontend/` (Next.js), root `pnpm-workspace.yaml`
  (ADR-006) — do not reintroduce nested `.git` directories in either subfolder
- Frontend copies the hub's shadcn theme (light/dark/theme-rose) and is pinned to Tailwind v3 for
  that reason — don't bump Tailwind to v4 without revisiting ADR-007
- GraphQL is code-first (`@nestjs/graphql` decorators), not schema-first
- ORM is Prisma (backend only) — note the hub itself uses Drizzle; that's a deliberate divergence,
  not something to "fix" for consistency

---

## Coding Conventions

- Backend tests: Jest (matches NestJS scaffolding)
- Frontend unit/component tests: Vitest + React Testing Library (copied from the hub's setup)
- E2E: Playwright, both apps — for authenticated flows, mint a session JWT directly rather than
  driving real Google OAuth (same pattern as the hub's ADR-021)
- Locale/theme preferences are per-User fields local to todolist, independent of the hub's own
  per-user locale/theme (they can legitimately differ)

---

## Deployment Notes

- Deploys via Coolify on the same VPS as the hub; two GHCR images
  (`todolist-frontend`, `todolist-backend`), two separate Coolify webhooks
- Postgres is external/shared — not part of this repo's `docker-compose.yml`; requires a
  provisioned `todo_app` role / `todolist` database on the existing instance before first deploy
- CI runs lint/typecheck/prettier/test for both apps unconditionally on every push — no path
  filtering yet (ADR-010)

---

## Known Limitations

- Calendar sync is e2e-test/mocked-API only for now — no real Google Calendar has exercised it yet
  (needs a second real Google account to dogfood, see plans/backlog.md)
- Sharing requires the hub's `project-members` search endpoint, which doesn't exist yet — it's a
  Phase 2 prerequisite in plans/current.md, not yet built on the hub side
- No email/push/real-time notifications — share invites and comments are visible only the next time
  someone opens the relevant page (business-rules.md Rule 7)
