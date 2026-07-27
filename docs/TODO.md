# TODO

See [plans/current.md](../plans/current.md) for the phased implementation plan this list feeds.

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

- [ ] Hub repo: add `GET /api/auth/project-members?project=<slug>&q=<term>` endpoint (ADR-009)
- [ ] Hub repo: register `todolist` project slug in the `projects` table
- [ ] Hub repo / Google Cloud Console: add `https://todo.blonskyi.dev/api/google/calendar/callback`
      as an authorized redirect URI on the existing OAuth Client (ADR-004)
- [ ] Provision `todo_app` Postgres role + `todolist` database on the shared instance (ADR-002)
- [ ] Prisma schema for User/List/Task/Comment/ListShare/CalendarSync/GoogleCalendarConnection
      (knowledge/domain-model.md)
- [ ] NestJS GraphQL resolvers/services for List/Task CRUD, enforcing owner-vs-collaborator rules
      (business-rules.md Rules 2–3)
- [ ] Sharing flow: search (via hub project-members), invite, accept/decline (Rules 3–4)
- [ ] Comment flow: task-level and list-level, both roles (Rule 6)
- [ ] Google Calendar connect flow + one-way manual sync + delete-on-complete (Rules 8–10)
- [ ] Frontend middleware: hub validate check + next-intl locale routing (copied from hub pattern)
- [ ] Copy hub's shadcn theme tokens (light/dark/theme-rose) into frontend (ADR-007)
- [ ] CI workflow: lint/typecheck/prettier/test on every push; build+push+deploy on merge to `main`
      (ADR-010)
- [ ] `docker-compose.yml`: frontend (public) + backend (internal-only) services (docs/architecture.md)

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
