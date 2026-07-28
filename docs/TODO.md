# TODO

See [plans/current.md](../plans/current.md) for the phased implementation plan this list feeds, and
[GitHub Issues](https://github.com/mykola-blonskyi/todo/issues) for the actual ticket-level,
dependency-ordered breakdown — this file tracks coarser-grained, cross-cutting items, not individual
tickets.

## Backlog

- [ ] Real-time updates (WebSocket subscriptions) instead of refresh-to-see-changes
- [ ] Telegram bot notification channel (business-rules.md Rule 7 names this as a possible future
      addition, not built now)
- [ ] Path-based CI filtering (ADR-010 — deferred, not blocking)
- [ ] Public GraphQL subdomain, if a second API consumer ever materializes (ADR-003 — deferred)
- [ ] Bidirectional Calendar sync (ADR-005 — explicitly rejected for v1, revisit only with real
      demand)

---

## Planned

- [ ] Hub repo: register `todolist` project slug in the `projects` table
- [ ] Provision `todo_app` Postgres role + `todolist` database on the shared VPS instance for prod
      (ADR-002) — local dev/test already have their own docker-compose Postgres
- [ ] NestJS GraphQL resolvers/services for List/Task CRUD, enforcing owner-vs-collaborator rules
      (business-rules.md Rules 2–3) — see GitHub Issues #9–#13
- [ ] Sharing flow: search (via hub project-members), invite, accept/decline (Rules 3–4) — see
      GitHub Issues #14–#18
- [ ] Comment flow: task-level and list-level, both roles (Rule 6) — see GitHub Issue #19
- [ ] Google Calendar connect flow + one-way manual sync + delete-on-complete (Rules 8–10) — see
      GitHub Issues #20–#24
- [ ] Frontend middleware: hub validate check + next-intl locale routing (copied from hub pattern)
- [ ] Copy hub's shadcn theme tokens (light/dark/theme-rose) into frontend (ADR-007)
- [ ] Dockerfiles for both apps; `docker-compose.yml`: frontend (public) + backend (internal-only)
- [ ] Build+push+deploy CI jobs on merge to `main`, once Dockerfiles + Coolify registration exist
      (ADR-010)

---

## In Progress

- [ ]

---

## Review

- [ ]

---

## Done

- [x] Design/requirements grilling session — see docs/decisions.md ADR-001 through ADR-010
- [x] Flattened nested backend/frontend git repos into single monorepo (ADR-006)
- [x] Root pnpm workspace (single lockfile); frontend prettier + Vitest/RTL wired in (ADR-008)
- [x] GitHub Actions CI: lint/format/typecheck/test both apps, backend integration tests, on every
      push (ADR-010)
- [x] Hub repo: added `GET /api/auth/project-members?project=<slug>&q=<term>` endpoint (ADR-009,
      hub's own ADR-022) — merged
- [x] Hub repo / Google Cloud Console: added the Calendar-callback redirect URI (ADR-004)
- [x] Prisma schema for the full domain model + Postgres connection (issue #8) — Prisma 6, see
      ADR-011
- [x] Published 4 specs (#3–#6) and 17 implementation tickets (#8–#24) to GitHub Issues
- [x] GraphQL module (code-first) + trusted-identity guard + `me` query (issue #9)
- [x] Downgraded frontend to Tailwind v3, copied hub's shadcn theme tokens (ADR-007)
- [x] Frontend middleware: hub validate + next-intl locale routing, with a documented local-dev
      bypass (issue #10)
- [x] Backend List create/myLists/list(id) + frontend Lists overview and detail page (issue #10)
- [x] Backend renameList/deleteList + frontend rename/delete UI, owner-only (issue #11)
