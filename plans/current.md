# Current Plan

## Goal

Ship a working v1 of the todolist app at `todo.blonskyi.dev`: hub-authenticated login, List/Task
CRUD, sharing with accept/decline, comments, optional manual one-way Google Calendar sync, themed
and localized to match the hub, deployed via the same Coolify/GHCR pipeline as the hub. Full design
rationale in [docs/decisions.md](../docs/decisions.md); domain rules in
[knowledge/business-rules.md](../knowledge/business-rules.md).

This file tracks phase-level progress. The actual ticket-level, dependency-ordered breakdown lives
as [GitHub Issues](https://github.com/mykola-blonskyi/todo/issues) (4 specs, #3–#6; 17
implementation tickets, #8–#24) — each phase below links its ticket range.

---

## Phase 1 — Repo & infra foundation

- [x] Flatten nested git repos into one monorepo (ADR-006)
- [x] Root `pnpm-workspace.yaml`, single lockfile, remove `frontend/package-lock.json`
- [x] Frontend: prettier + Vitest/RTL wired in, matching hub conventions (ADR-008) — no real
      component tests yet (`passWithNoTests`), first ones land with Phase 3
- [x] Downgrade frontend to Tailwind v3, copy hub's shadcn theme tokens (ADR-007)
- [ ] Provision `todo_app` role / `todolist` database on the shared Postgres instance (ADR-002) —
      still needed for prod; local dev/test use their own docker-compose Postgres instances
- [x] Prisma schema + first migration for the domain model (issue #8) — Prisma 6, not 7, see ADR-011

---

## Phase 2 — Hub prerequisites (small changes to the `my-projects` repo)

- [ ] Register `todolist` slug in the hub's `projects` table
- [x] Add `/api/auth/project-members` search endpoint (ADR-009) — done in `my-projects`
      (`src/app/api/auth/project-members/route.ts`, hub's own ADR-022), tests passing
- [x] Add `todo.blonskyi.dev` Calendar-callback redirect URI to the existing Google OAuth Client
      (ADR-004) — added in Google Cloud Console

---

## Phase 3 — Core List/Task (owner-only)

Ticket breakdown: [issues #9–#13](https://github.com/mykola-blonskyi/todo/issues?q=is%3Aissue+9..13)
— all done. Phase 3 is complete; Phase 4 (sharing) is next, gated on Phase 2's
`project-members` endpoint (already done).

- [x] Frontend middleware: hub validate + next-intl routing (issue #10 - includes a documented
      local-dev bypass since `.blonskyi.dev` doesn't resolve on localhost)
- [x] Backend: GraphQL module (code-first) + trusted-identity guard + `me` query (issue #9)
- [x] Backend: List create/myLists/list(id), owner-only (issue #10)
- [x] Backend: renameList/deleteList, owner-only (issue #11)
- [x] Backend: createTask/toggleTaskDone resolvers, owner-only, cascade-verified e2e (issue #12)
- [x] Backend: updateTask/deleteTask/reorderTasks resolvers, owner-only (ADR-003, issue #13)
- [x] Frontend: Lists overview (create + navigate) and List detail page shell (issue #10)
- [x] Frontend: rename + delete actions on the List detail page (issue #11)
- [x] Frontend: Tasks render on the List detail page with add-task form and toggle-done checkbox
      (issue #12)
- [x] Frontend: Task edit (title/due date), delete, and button-based reorder on the List detail
      page (issue #13)

---

## Phase 4 — Sharing & collaboration

Ticket breakdown: [issues #14–#18](https://github.com/mykola-blonskyi/todo/issues?q=is%3Aissue+14..18)
— backend done; frontend still open.

- [x] Backend: searchShareCandidates, owner-only (issue #14)
- [x] Backend: inviteToList, idempotent re-invite semantics (issue #15)
- [x] Backend: pendingInvites/acceptInvite/declineInvite, invitee-only (issue #16)
- [x] Backend: collaborator permission boundary — requireAccess/requireAccessToTask, toggle-done
      only, no task edit (Rule 2) (issue #17)
- [x] Backend: removeCollaborator/leaveList, immediate access revocation (issue #18)
- [ ] Frontend: Share search UI + invite button (calls hub's project-members endpoint)
- [ ] Frontend: In-app "pending invite" surface on next login, accept/decline (Rule 7)
- [ ] Frontend: Collaborators list on the List detail page, owner "Remove" + collaborator "Leave"
      actions

---

## Phase 5 — Comments

Ticket breakdown: issue #19

- [ ] Task-level and list-level comments, both roles (Rule 6)

---

## Phase 6 — Google Calendar sync

Ticket breakdown: issues #20–#24

- [ ] "Connect Google Calendar" OAuth flow, `GoogleCalendarConnection` storage (ADR-004)
- [ ] Manual per-list sync action, one-way push (ADR-005)
- [ ] Delete-on-complete + cascade cleanup on list delete / collaborator removal (Rules 9–10)
- [ ] Keep this whole phase behind mocked Google API in tests — no real dogfooding until a second
      Google account is available

---

## Phase 7 — CI/CD & deploy

- [x] GitHub Actions: lint/format/typecheck/test both apps on every push (ADR-010) —
      `.github/workflows/ci.yml`
- [ ] E2E job (Playwright, both apps) — waiting on Phase 3+ delivering real pages/flows to drive;
      no point wiring it against the default Nest/Next boilerplate
- [ ] Dockerfiles for both apps
- [ ] Build + push two GHCR images, two Coolify webhooks on merge to `main` — needs Dockerfiles
      above, plus `COOLIFY_WEBHOOK_URL`/`COOLIFY_WEBHOOK_TOKEN` secrets once todolist is registered
      in Coolify
- [ ] `docker-compose.yml`: frontend (public) + backend (internal-only)

---

## Risks

- Calendar sync correctness is only verified against a mocked Google API until real dogfooding
  happens — real-world Google API quirks (rate limits, token expiry) may surface late
- Two test runners (Jest + Vitest) in one repo is a deliberate exception (ADR-008) but adds a small
  ongoing maintenance surface (two configs to keep working in CI)
- Hub prerequisites (Phase 2) block Phase 4 (sharing) — sequence accordingly, don't start sharing UI
  before the `project-members` endpoint exists
