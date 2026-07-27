# Future Work

Items intentionally deferred during the initial design — see the referenced ADRs/rules for why each
was deferred rather than cut.

## High Priority

- [ ] Path-based CI filtering, once the unconditional both-apps-every-push pipeline actually becomes
      slow enough to justify it (docs/decisions.md ADR-010)
- [ ] Real Google Calendar dogfooding with a second real Google account, to move Calendar sync out
      of e2e-mocked-only status (plans/current.md Phase 6 risk)

---

## Medium Priority

- [ ] Telegram bot notification channel for share invites / new comments
      (knowledge/business-rules.md Rule 7)
- [ ] Extract hub auth to its own `auth.blonskyi.dev` subdomain — a hub-repo initiative, revisit once
      there are enough subdomain projects that decoupling auth from the hub's UI release cycle is a
      real pain point (docs/decisions.md ADR-001)
- [ ] Widen the hub's `project-members` endpoint into a fuller directory/roster if enough users make
      autocomplete-by-scrolling worthwhile (ADR-009)

---

## Low Priority

- [ ] Public GraphQL subdomain for todolist, only if a second consumer (e.g. a mobile client) is
      ever actually built (ADR-003)
- [ ] Bidirectional Google Calendar sync (read edits back from Calendar) — explicitly rejected for
      v1 due to conflict-resolution complexity; revisit only with real demand (ADR-005)
- [ ] Real-time (WebSocket) updates instead of refresh-based visibility for shares/comments
