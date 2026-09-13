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
- [x] Touch drag-and-drop on the Board (TODO-62) — cards gained a grip handle carrying
      `touch-action: none`, so the browser yields the gesture by geometry instead of by a
      long-press timer; edge auto-scroll ships with it because only ~2 of 6 columns fit at 390px.
      The grip is a real button, so the board also gained its first keyboard-operable move. Note
      the ticket's `reorderTasks` hint was wrong: the board re-files a List into a Category via
      `assignCategoryAction`, and orders nothing
- [x] Per-layout PWA `theme_color` (TODO-63) — the ticket says the colour follows "layout/palette",
      but layouts own no colour at all: a `[data-layout]` block sets fonts and `--radius`, and every
      colour comes from the palette. What a layout picks is *which* surface sits at the top of the
      viewport, so it splits into two tables in `preferences/chrome.ts` — `CHROME_TOKEN` per layout
      (`terminal` → `primary`, `board`/`ledger` → `card`, the rest → `background`) and
      `CHROME_COLORS` per palette × scheme. Only the viewport meta moved: the manifest stays
      statically prerendered, since its `theme_color` is just the pre-launch default and a manifest
      is fetched per install, not per navigation. Its colour is now derived from the default
      appearance (`#ffffff`) rather than the deleted `THEME_COLOR` constant. `CHROME_TOKEN` mirrors
      the Shell markup with nothing enforcing it, which is TODO-67
- [x] Sign-out leaves the appearance cookies behind (TODO-64) — a fourth cookie `todolist-owner`
      stamps the other three with a digest of the user id, and `getAppearance` trusts them only
      when it matches, so an expired session or a closed tab is covered as well as an explicit
      sign-out. Mode needed more than a cookie: next-themes applies `localStorage` before paint
      where no Server Action reaches, so its `storageKey` is owner-scoped and the incoming user
      reads an empty key and falls back to the row. The login page reverts to the defaults with
      mode `system`. `NEXT_LOCALE` has the same leak and is TODO-65
- [x] Sign-out leaves `NEXT_LOCALE` behind (TODO-65) — the owner stamp does not extend here, because
      this is next-intl's cookie, not ours: its middleware re-sets it on every document navigation
      to match the URL's locale, so a stamp would be overwritten on the next click. `signOutAction`
      deletes it outright instead. That closes the leak but not its other half — nothing in the app
      reads `User.locale` to pick a language, so the next user falls to Accept-Language rather than
      their stored preference. Applying the row is TODO-66
- [x] Nothing reads `User.locale` to pick the rendered language (TODO-66) — the ticket assumed
      applying it meant resolving the user's row on every navigation, and it does not. `localePrefix`
      is next-intl's default `always` and every in-app link goes through next-intl's own `Link`, so a
      normal navigation already carries a prefix, which wins ahead of the cookie and Accept-Language
      in next-intl's own resolution. The stored locale is only consulted on a prefixless, cookieless
      request (a bare `/`, a bookmark), so `proxy.ts` gates the lookup on exactly that and injects the
      result with `request.cookies.set` before handing off — feeding next-intl's existing rung rather
      than building a parallel redirect. Best-effort behind a 1s timeout: a failure falls through to
      the old resolution, so a backend hiccup costs the language and never the page. The session-JWT
      alternative was rejected — no locale claim in the OIDC profile, no `User` row yet at first
      sign-in, and no re-issue path for a 24h token

---
