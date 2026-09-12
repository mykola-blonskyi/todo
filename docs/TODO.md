# TODO

See [plans/current.md](../plans/current.md) for the phased implementation plan this list feeds, and
Plane (`plane.blonskyi.dev`, project `TODO` — see
[docs/agents/issue-tracker.md](agents/issue-tracker.md)) for the actual ticket-level,
dependency-ordered breakdown — this file tracks coarser-grained, cross-cutting items, not individual
tickets. The GitHub Issues this file used to link were migrated to Plane on 2026-08-07 and their
numbers no longer match; anything below referencing a ticket uses its Plane id (`TODO-n`).

## Backlog

- [ ] `searchShareCandidates`/`searchTemplateCandidates` still depend on the hub's
      `/api/auth/project-members` endpoint (`backend/src/hub/hub-client.service.ts`), forwarding the
      caller's cookie header — deliberately left as-is by ADR-016 (converting todolist to the
      `login` IdP), since login has no directory/search endpoint yet. This now depends on the user
      separately holding a live hub session (`.blonskyi.dev` cookie) from having visited the hub
      directly — no longer guaranteed just by using todolist, since todolist's own session no longer
      comes from the hub. (Only the hub's own cookie is passed through in `graphqlFetch`;
      todolist's is not the hub's to receive and it couldn't validate it anyway.) Needs a login-side
      equivalent of the hub's ADR-009 endpoint (or the `client_members` table exposed some other
      way) before this dependency can be fully removed.
- [ ] Real-time updates (WebSocket subscriptions) instead of refresh-to-see-changes
- [ ] Telegram bot notification channel (business-rules.md Rule 7 names this as a possible future
      addition, not built now)
- [ ] Path-based CI filtering (ADR-010 — deferred, not blocking)
- [ ] Public GraphQL subdomain, if a second API consumer ever materializes (ADR-003 — deferred)
- [ ] Bidirectional Calendar sync (ADR-005 — explicitly rejected for v1, revisit only with real
      demand)

---

## Planned

- [ ] Playwright e2e job in CI (ADR-008) — nothing exists yet, and GitHub Actions is billing-blocked
      on this repo, so a new job couldn't be proven green anyway
- [ ] Phase 9 layout follow-ups, now ticketed: per-layout PWA `theme_color` (TODO-63). Touch
      drag-and-drop on the Board (TODO-62) and reading the persisted mode back on a fresh device
      (TODO-61) are done
- [ ] Real-device pass for the Board's touch drag (TODO-62 shipped verified only under Chrome
      touch emulation, never on an actual iOS Safari or low-end Android)
- [ ] Sign-out leaves the appearance cookies behind, so the next user on a shared browser inherits
      them and their own `User` row is never read (TODO-64)

---

## In Progress

- [ ]

---

## Review

- [ ]

---

## Done

- [x] Reading the persisted mode back on a fresh device (TODO-61): mode gained a `todolist-mode`
      cookie and a `User.theme` fallback, handed to next-themes as its `defaultTheme` so the
      pre-paint script applies it without a flash, while a choice already in this device's
      localStorage still wins. Closes the write-side/read-side asymmetry ADR-017 had left open

- [x] Sharing flow frontend: share search + invite UI (TODO-42), pending invites with accept/decline
      (TODO-43), collaborators list with owner-remove and collaborator-leave (TODO-44) — completes
      the sharing phase whose backend landed with TODO-11–TODO-15

- [x] Comment flow: task-level and list-level comments, both roles (Rule 6) — backend resolvers plus
      `features/comments` wired into all six layouts (TODO-16)

- [x] Google Calendar connect (OAuth, encrypted tokens at rest) and manual one-way sync (TODO-17,
      TODO-18). Sync is List-level with a Task checklist in the event description, not per-Task
      (ADR-015) — which is why delete-on-complete was cancelled (TODO-19) and Rule 9 retired in
      place; cleanup now happens only via Rule 10's List-deletion/collaborator-removal cascade
      (TODO-20, TODO-21)

- [x] Auto-archive of stale template-spawned Lists: `List.archivedAt`/`unarchivedAt`, a daily
      `ListArchiveCron`, an Archive filter + owner-only restore in all six layouts, Rule 28
      (TODO-58) — bounds ADR-013's unbounded Occurrence history in the view without ever deleting a
      List, so Rule 10 never fires and no Google Calendar event is touched

- [x] Six user-switchable layouts (Workspace, Board, Notebook, Pocket, Terminal, Ledger) covering
      every screen, twelve colour palettes, light/dark/system mode — three independent preferences
      (cookie + `User` row), see ADR-017; `docs/design/` holds the mockup gallery and palette CSS

- [x] Design/requirements grilling session — see docs/decisions.md ADR-001 through ADR-010
- [x] Flattened nested backend/frontend git repos into single monorepo (ADR-006)
- [x] Root pnpm workspace (single lockfile); frontend prettier + Vitest/RTL wired in (ADR-008)
- [x] GitHub Actions CI: lint/format/typecheck/test both apps, backend integration tests, on every
      push (ADR-010)
- [x] Hub repo: added `GET /api/auth/project-members?project=<slug>&q=<term>` endpoint (ADR-009,
      hub's own ADR-022) — merged
- [x] Hub repo / Google Cloud Console: added the Calendar-callback redirect URI (ADR-004)
- [x] Prisma schema for the full domain model + Postgres connection (TODO-5) — Prisma 6, see
      ADR-011
- [x] Published 4 specs and 17 implementation tickets to the issue tracker (GitHub Issues at the
      time; migrated to Plane on 2026-08-07, where they are TODO-1–TODO-21)
- [x] GraphQL module (code-first) + trusted-identity guard + `me` query (TODO-6)
- [x] Downgraded frontend to Tailwind v3, copied hub's shadcn theme tokens (ADR-007)
- [x] Frontend middleware: hub validate + next-intl locale routing, with a documented local-dev
      bypass (TODO-7)
- [x] Backend List create/myLists/list(id) + frontend Lists overview and detail page (TODO-7)
- [x] Backend renameList/deleteList + frontend rename/delete UI, owner-only (TODO-8)
- [x] Backend createTask/toggleTaskDone + frontend Task list/add/toggle UI, owner-only, cascade
      verified e2e (TODO-9)
- [x] Backend updateTask/deleteTask/reorderTasks + frontend Task edit/delete/reorder UI,
      owner-only (TODO-10) — Phase 3 complete
- [x] Backend sharing & collaboration: searchShareCandidates, inviteToList, pendingInvites/
      acceptInvite/declineInvite, collaborator permission boundary (requireAccess/
      requireAccessToTask), removeCollaborator/leaveList (TODO-11–TODO-15) — frontend landed
      later, see above
- [x] Dockerfiles for backend/frontend + root `docker-compose.yml` for Coolify (TODO-35) — no
      Postgres service (shared VPS instance, ADR-002), backend stays internal-only (ADR-003)
- [x] Installable PWA: manifest, themed icon set, minimal service worker, viewport theme-color,
      manually verified installing on mobile (TODO-24/TODO-34)
- [x] Hub repo: registered `todo` project slug in the `projects` table
- [x] Provisioned `todo_app` Postgres role + `todo` database on the shared VPS instance for prod
      (ADR-002)
- [x] Registered `todo` in Coolify (Docker Compose resource, env vars, "Connect to Predefined
      Network", `COOLIFY_WEBHOOK_URL`/`COOLIFY_WEBHOOK_TOKEN` repo secrets) — `todo.blonskyi.dev` is
      live, gated deploy confirmed working end to end (TODO-35)
- [x] Google Calendar disconnect: `disconnectGoogleCalendar` mutation (best-effort revoke at
      Google, tokens deleted regardless), Settings disconnect button, Rule 27 — synced events and
      `CalendarSync` rows survive a disconnect (TODO-55). Also corrected the Privacy Policy's
      retired "list completed removes the event" claim (ADR-015) in all four locales
- [x] Bulk select + delete on the Lists overview: `deleteLists(ids)` mutation returning
      `{ deletedIds, failedIds }` — sequential, per-item ownership check, deliberately not one
      transaction (each delete runs Rule 10's best-effort Calendar cleanup, so N external HTTP
      calls would sit inside it). Shared headless `useSelection` hook + `SelectionActionBar`
      (reusable for Categories), a "Select" toggle per layout's header, checkboxes on owned Lists
      only (a collaborator can only *leave*, Rule 2), "Select all" scoped to the active category
      filter, and the catalogue's first ICU plurals in all four locales (TODO-59)
- [x] Bulk select + delete on the Categories page: `deleteCategories(ids)`, same sequential,
      per-item, non-transactional shape as `deleteLists` — both now return one shared
      `BulkDeleteResult` type instead of a near-duplicate per mutation. Reuses the TODO-59 selection
      kit as it was built to be, so the checkbox lands in the shared `CategoryRow` alone rather than
      in each of the six layouts. The counted confirm copy spells out that the Lists filed under a
      Category survive and merely become uncategorized (Rule 23) — a plain "delete 3 categories?"
      reads like deleting their Lists (TODO-60)
