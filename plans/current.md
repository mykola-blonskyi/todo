# Current Plan

## Goal

Ship a working v1 of the todolist app at `todo.blonskyi.dev`: login via `login.blonskyi.dev`
(ADR-016 — previously the hub directly), List/Task CRUD, sharing with accept/decline, comments,
optional manual one-way Google Calendar sync, themed and localized (ADR-017 replaced "match the
hub" with todolist's own six layouts and twelve palettes), deployed via Coolify on the same VPS as
the hub. Full design rationale in [docs/decisions.md](../docs/decisions.md); domain rules in
[knowledge/business-rules.md](../knowledge/business-rules.md).

**That v1 scope is delivered and live.** Phases 1–7 below are complete apart from the Playwright
e2e job; Phases 8–11 are post-v1 work, tracked the same way.

This file tracks phase-level progress. The ticket-level, dependency-ordered breakdown lives in
Plane (`plane.blonskyi.dev`, workspace `blonskyi`, project `TODO`) — see
[docs/agents/issue-tracker.md](../docs/agents/issue-tracker.md). The GitHub Issues this file used
to link were migrated there on 2026-08-07 and are all closed, and Plane's numbering does **not**
match the old one, so every reference below is a Plane id (`TODO-n`). Code review still happens on
GitHub pull requests.

---

## Phase 1 — Repo & infra foundation

- [x] Flatten nested git repos into one monorepo (ADR-006)
- [x] Root `pnpm-workspace.yaml`, single lockfile, remove `frontend/package-lock.json`
- [x] Frontend: prettier + Vitest/RTL wired in, matching hub conventions (ADR-008) — no real
      component tests yet (`passWithNoTests`), first ones land with Phase 3
- [x] Downgrade frontend to Tailwind v3, copy hub's shadcn theme tokens (ADR-007)
- [x] Provision `todo_app` role / `todo` database on the shared Postgres instance for prod (ADR-002)
      — local dev/test use their own docker-compose Postgres instances
- [x] Prisma schema + first migration for the domain model (TODO-5) — Prisma 6, not 7, see ADR-011

---

## Phase 2 — Hub prerequisites (small changes to the `my-projects` repo)

- [x] Register `todo` slug in the hub's `projects` table
- [x] Add `/api/auth/project-members` search endpoint (ADR-009) — done in `my-projects`
      (`src/app/api/auth/project-members/route.ts`, hub's own ADR-022), tests passing
- [x] Add `todo.blonskyi.dev` Calendar-callback redirect URI to the existing Google OAuth Client
      (ADR-004) — added in Google Cloud Console

---

## Phase 3 — Core List/Task (owner-only)

Tickets: TODO-5 – TODO-10. Complete.

- [x] Frontend middleware: hub validate + next-intl routing (TODO-7 — included a documented
      local-dev bypass since `.blonskyi.dev` doesn't resolve on localhost). The hub-validate half
      was later superseded by ADR-016: `frontend/src/proxy.ts` now resolves todolist's own session
      instead of calling the hub on every request
- [x] Backend: GraphQL module (code-first) + trusted-identity guard + `me` query (TODO-6)
- [x] Backend: List create/myLists/list(id), owner-only (TODO-7)
- [x] Backend: renameList/deleteList, owner-only (TODO-8)
- [x] Backend: createTask/toggleTaskDone resolvers, owner-only, cascade-verified e2e (TODO-9)
- [x] Backend: updateTask/deleteTask/reorderTasks resolvers, owner-only (ADR-003, TODO-10)
- [x] Frontend: Lists overview (create + navigate) and List detail page shell (TODO-7)
- [x] Frontend: rename + delete actions on the List detail page (TODO-8)
- [x] Frontend: Tasks render on the List detail page with add-task form and toggle-done checkbox
      (TODO-9)
- [x] Frontend: Task edit (title/due date), delete, and button-based reorder on the List detail
      page (TODO-10)

---

## Phase 4 — Sharing & collaboration

Tickets: TODO-11 – TODO-15 (backend), TODO-42 – TODO-44 (frontend). Complete.

- [x] Backend: searchShareCandidates, owner-only (TODO-11)
- [x] Backend: inviteToList, idempotent re-invite semantics (TODO-12)
- [x] Backend: pendingInvites/acceptInvite/declineInvite, invitee-only (TODO-13)
- [x] Backend: collaborator permission boundary — requireAccess/requireAccessToTask, toggle-done
      only, no task edit (Rule 2) (TODO-14)
- [x] Backend: removeCollaborator/leaveList, immediate access revocation (TODO-15)
- [x] Frontend: Share search UI + invite button (TODO-42) — still calls the hub's project-members
      endpoint, which ADR-016 leaves as todolist's one remaining hub dependency (docs/TODO.md)
- [x] Frontend: In-app "pending invite" surface on next login, accept/decline (Rule 7) (TODO-43)
- [x] Frontend: Collaborators list on the List detail page, owner "Remove" + collaborator "Leave"
      actions (TODO-44)

---

## Phase 5 — Comments

Tickets: TODO-16. Complete.

- [x] Task-level and list-level comments, both roles (Rule 6) — backend resolvers plus
      `features/comments` (CommentThread, TaskCommentsToggle) wired into all six layouts

---

## Phase 6 — Google Calendar sync

Tickets: TODO-17 – TODO-21, TODO-52, TODO-55, TODO-56. Complete.

- [x] "Connect Google Calendar" OAuth flow, `GoogleCalendarConnection` storage, tokens encrypted at
      rest (ADR-004, Rule 26) (TODO-17)
- [x] Manual per-list sync action, one-way push (ADR-005) — sync targets the List as a whole with a
      Task checklist in the event description, not one event per Task (ADR-015, spec TODO-52,
      implemented in TODO-18). Needs `List.dueDate`, added in TODO-53
- [x] Cascade cleanup on list delete / collaborator removal (Rule 10) (TODO-20, TODO-21).
      Delete-on-complete (old Rule 9) was **cancelled** with TODO-19 — it assumed per-Task sync and
      died with ADR-015; Rule 9 is retired in place
- [x] Disconnect: revoke the grant at Google, delete the tokens, keep the synced events and
      `CalendarSync` rows (Rule 27) (TODO-55)
- [x] Stale-connection handling: flag a Google-side revoke (`invalid_grant` at refresh, or a
      Calendar-API 401), "Reconnect needed" in Settings instead of a permanent "Connected", cleared
      by a successful reconnect (Rule 29) (TODO-56). Detection is lazy — nothing polls Google, so
      the flag appears the first time something actually tries to use the grant
- [x] Keep this whole phase behind a mocked Google API in tests — no real dogfooding until a second
      Google account is available (still true; see Risks)

---

## Phase 7 — CI/CD & deploy

- [x] GitHub Actions: lint/format/typecheck/test both apps on every push (ADR-010) —
      `.github/workflows/ci.yml`
- [ ] E2E job (Playwright, both apps) (ADR-008) — no Playwright config or specs exist yet. The
      original "wait for real pages to drive" reason is long gone; what blocks it now is that
      Actions itself can't run (see Risks), so a new job couldn't be proven green anyway
- [x] Dockerfiles for both apps, `docker-compose.yml`: frontend (public) + backend
      (internal-only) — TODO-35, env vars from Coolify's own per-resource panel, not a committed
      `.env` (see `backend/.env.example`/`frontend/.env.example`)
- [x] `deploy` CI job triggers a single Coolify deploy webhook after every check job passes on a
      push to `main` — Coolify builds both images itself from `docker-compose.yml`, no GHCR.
      `todo.blonskyi.dev` is live and confirmed working (auth, cookie verification, access
      validation, PWA install all verified end to end)

---

## Phase 8 — Recurring templates, categories, installable PWA

Specs/tickets from the templates/categories/PWA grilling session: TODO-22 – TODO-34, plus
TODO-50/51, TODO-57 and TODO-58. Complete.

- [x] Installable PWA: manifest, themed icon set, minimal service worker, viewport theme-color,
      manually verified installing on mobile (TODO-24/TODO-34)
- [x] Recurring ListTemplates: schema, CRUD, occurrence-spawning engine, cron wiring, frontend
      (TODO-22, TODO-25 – TODO-29) — every Occurrence is an independent List (ADR-013)
- [x] `everyNDays` fires in Streaks of consecutive ON days, not single-day pulses (ADR-014, Rule 25)
      (spec TODO-50, implemented in TODO-51)
- [x] Occurrence date shown on template-spawned Lists (TODO-57)
- [x] Auto-archive of stale template-spawned Lists: `archivedAt`/`unarchivedAt`, daily cron,
      Archive filter + owner-only restore, never touches Calendar (Rule 28) (TODO-58)
- [x] List categories + filtering: schema, CRUD, per-user filter, frontend, ListTemplate
      auto-categorization (TODO-23, TODO-30 – TODO-33)

---

## Phase 9 — Layouts & palettes (ADR-017)

- [x] Backend: `UserPalette` / `UserLayout` enums, `system` mode, `updatePalette` / `updateLayout`
      mutations, data migration of `theme-rose`
- [x] Frontend: three-axis preferences (mode / palette / layout), cookie-backed server rendering,
      `src/layouts/*` registry with six full layouts × seven screens, ten new palettes, four locales

Follow-ups, now tracked as tickets of their own:

- [x] Read the persisted mode back on a fresh device (TODO-61) — mode gained a `todolist-mode`
      cookie and a `User.theme` fallback, handed to next-themes as its `defaultTheme` so its
      pre-paint script applies it without a flash
- [ ] Touch drag-and-drop on the Board (TODO-62) — `layouts/board/BoardColumns.tsx` uses HTML5 drag
      events only, so reordering is mouse-only on a phone
- [ ] Per-layout PWA `theme_color` (TODO-63) — `shared/lib/pwa.ts` ships one constant for every
      layout
- [ ] Sign-out leaves the appearance cookies behind (TODO-64) — the next user on a shared browser
      inherits them, and because they are present their own `User` row is never read. Pre-existing
      for palette and layout; TODO-61's review surfaced it

---
