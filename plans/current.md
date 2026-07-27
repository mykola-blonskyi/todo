# Current Plan

## Goal

Ship a working v1 of the todolist app at `todo.blonskyi.dev`: hub-authenticated login, List/Task
CRUD, sharing with accept/decline, comments, optional manual one-way Google Calendar sync, themed
and localized to match the hub, deployed via the same Coolify/GHCR pipeline as the hub. Full design
rationale in [docs/decisions.md](../docs/decisions.md); domain rules in
[knowledge/business-rules.md](../knowledge/business-rules.md).

---

## Phase 1 — Repo & infra foundation

- [x] Flatten nested git repos into one monorepo (ADR-006)
- [ ] Root `pnpm-workspace.yaml`, single lockfile, remove `frontend/package-lock.json`
- [ ] Downgrade frontend to Tailwind v3, copy hub's shadcn theme tokens (ADR-007)
- [ ] Provision `todo_app` role / `todolist` database on the shared Postgres instance (ADR-002)
- [ ] Prisma schema + first migration for the domain model

---

## Phase 2 — Hub prerequisites (small changes to the `my-projects` repo)

- [ ] Register `todolist` slug in the hub's `projects` table
- [x] Add `/api/auth/project-members` search endpoint (ADR-009) — done in `my-projects`
      (`src/app/api/auth/project-members/route.ts`, hub's own ADR-022), tests passing
- [x] Add `todo.blonskyi.dev` Calendar-callback redirect URI to the existing Google OAuth Client
      (ADR-004) — added in Google Cloud Console

---

## Phase 3 — Core List/Task (owner-only)

- [ ] Frontend middleware: hub validate + next-intl routing (copy hub's pattern)
- [ ] Backend: internal-only NestJS GraphQL API, code-first, List/Task CRUD (ADR-003)
- [ ] Frontend: list view, task view, create/edit/delete (owner-only actions)

---

## Phase 4 — Sharing & collaboration

- [ ] Share search UI (calls hub's project-members endpoint)
- [ ] ListShare invite/accept/decline flow
- [ ] Collaborator permissions: toggle-done only, no task edit (Rule 2)
- [ ] In-app "pending invite" surface on next login (Rule 7)

---

## Phase 5 — Comments

- [ ] Task-level and list-level comments, both roles (Rule 6)

---

## Phase 6 — Google Calendar sync

- [ ] "Connect Google Calendar" OAuth flow, `GoogleCalendarConnection` storage (ADR-004)
- [ ] Manual per-list sync action, one-way push (ADR-005)
- [ ] Delete-on-complete + cascade cleanup on list delete / collaborator removal (Rules 9–10)
- [ ] Keep this whole phase behind mocked Google API in tests — no real dogfooding until a second
      Google account is available

---

## Phase 7 — CI/CD & deploy

- [ ] GitHub Actions: lint/typecheck/prettier/test both apps on every push (ADR-010)
- [ ] Build + push two GHCR images, two Coolify webhooks on merge to `main`
- [ ] `docker-compose.yml`: frontend (public) + backend (internal-only)

---

## Risks

- Calendar sync correctness is only verified against a mocked Google API until real dogfooding
  happens — real-world Google API quirks (rate limits, token expiry) may surface late
- Two test runners (Jest + Vitest) in one repo is a deliberate exception (ADR-008) but adds a small
  ongoing maintenance surface (two configs to keep working in CI)
- Hub prerequisites (Phase 2) block Phase 4 (sharing) — sequence accordingly, don't start sharing UI
  before the `project-members` endpoint exists
