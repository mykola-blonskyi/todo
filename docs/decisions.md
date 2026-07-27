# Architecture Decisions

---

## ADR-001: Reuse the hub's existing SSO as-is; defer extracting auth to its own subdomain

Date: 2026-07-28

Status: Accepted

### Context
The hub already centralizes login (Google OAuth via Auth.js v5) and per-subdomain access control
behind a `.blonskyi.dev` JWT cookie and a `/api/auth/validate` endpoint, documented in the hub's
`boilerplates/subdomain-app.md`. A move to a dedicated `auth.blonskyi.dev` service was considered
for this project.

### Decision
Todolist consumes the hub's existing auth exactly as documented — no new auth service, no change to
the hub's structure. `API_URL` points at `https://blonskyi.dev`.

### Alternatives Considered
- Extracting auth to `auth.blonskyi.dev` now — rejected for todolist's sake: it's invisible to
  todolist either way (just a config value), it's already shared for free (every subdomain already
  calls the hub over the network), and extracting it would mean re-registering the Google OAuth
  redirect URI and re-deriving several of the hub's own hard-won Auth.js/Next.js fixes (its
  ADR-010–019) in a new codebase, for no todolist-specific benefit.

### Consequences
- If the hub is later split (a separate initiative), todolist's only required change is its
  `API_URL` env var
- Todolist has zero local session/JWT-verification code of its own

---

## ADR-002: Dedicated `todo_app` role and `todolist` database on the shared Postgres instance

Date: 2026-07-28

Status: Accepted

### Context
The hub's own ADR-009 established the pattern for services sharing the VPS's single Postgres
instance: a dedicated, least-privilege role and database per service, rather than reusing an
existing role or a shared database.

### Decision
Todolist gets its own `todo_app` role and `todolist` database on that same instance, reachable at
Docker DNS alias `postgres` on the `coolify` network — identical pattern to the hub's.

### Alternatives Considered
- Sharing the hub's database/schema — rejected: no isolation between projects, and Postgres can't
  do cross-database joins anyway, so there's no query-convenience upside to offset the coupling.

### Consequences
- No foreign key from todolist's tables into the hub's `users` table is possible — todolist keeps a
  local shadow `User` row instead (see `knowledge/domain-model.md`)
- Consistent, single obvious pattern for any future subdomain project to copy

---

## ADR-003: Backend is internal-only (BFF pattern) — no public GraphQL subdomain

Date: 2026-07-28

Status: Accepted

### Context
NestJS + GraphQL could be exposed publicly (e.g. `api.todo.blonskyi.dev`) for a standard
client-calls-API-directly architecture, or kept purely internal with the Next.js frontend as the
only public surface, calling the backend server-side.

### Decision
The backend has no public DNS entry or Traefik routing. The Next.js frontend calls it over the
private `coolify` Docker network (`http://backend:<port>/graphql`) from Server Components/Server
Actions, forwarding a trusted internal user-identity header derived from the session the frontend's
own middleware already validated against the hub.

### Alternatives Considered
- Public API subdomain — rejected for now: the only consumer is this frontend (no mobile app, no
  third party), so it would only add a second, duplicated JWT-verification implementation in the
  backend and a CORS configuration, for flexibility nothing currently needs.

### Consequences
- Backend never independently verifies the hub's JWT — it trusts the network boundary (only the
  frontend container can reach it) and the header the frontend forwards
- If a future consumer genuinely needs direct API access, this decision should be revisited — it
  is not free to reverse once resolvers assume a trusted caller

---

## ADR-004: Reuse the hub's Google OAuth Client for Calendar access, via a new redirect URI

Date: 2026-07-28

Status: Accepted

### Context
The hub's Google OAuth Client is registered for identity-only scopes (`openid`/`email`/`profile`).
Calendar sync needs the broader Calendar scope, requested through a separate, explicit "Connect
Google Calendar" flow — never bundled into hub login.

### Decision
Reuse the hub's existing Google Cloud OAuth Client (same `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`),
adding `https://todo.blonskyi.dev/api/google/calendar/callback` as an additional authorized redirect
URI in the Google Cloud Console. The Calendar-scope consent flow is entirely separate from, and
always after, hub login.

### Alternatives Considered
- Provisioning a brand-new, separate OAuth Client for todolist — rejected: no isolation benefit
  worth the extra registered app, per the project's own "prefer fewer dependencies" default.

### Consequences
- One manual, one-time Google Cloud Console change (new redirect URI) is required before this can
  be built
- Todolist needs at least one plain REST route (`/api/google/calendar/callback`) alongside GraphQL,
  since GraphQL can't be an OAuth redirect target
- Resulting refresh/access tokens are stored encrypted, per-user, in todolist's own
  `GoogleCalendarConnection` table — not in the hub's `accounts` table, which todolist can't reach
  anyway (separate database, ADR-002)

---

## ADR-005: Calendar sync is one-way, manual, and per-user — never automatic, never bidirectional

Date: 2026-07-28

Status: Accepted

### Context
Google Calendar sync could be designed as continuous/automatic (push on every task change) and/or
bidirectional (read back edits made directly in Google Calendar). Both add real complexity: rate
limits and partial-failure handling for continuous sync, conflict resolution for bidirectional sync.

### Decision
Sync is triggered manually by a user, per list, and only pushes (todolist → Google Calendar).
Todolist never reads Calendar back. Each user who syncs a list gets their own independent calendar
events (tracked via one `CalendarSync` row per user per task) — the owner's and a collaborator's
copies are unrelated events in unrelated calendars.

### Alternatives Considered
- Automatic sync on every task edit — rejected: real API-quota and partial-failure surface for no
  clearly needed benefit at this project's scale.
- Bidirectional sync — rejected outright: conflict resolution between todolist and a user's
  independently-edited Calendar event is a substantial feature on its own, not requested.

### Consequences
- Completing a task deletes its synced calendar event(s), best-effort (see
  `knowledge/business-rules.md` Rule 9) — there's no "mark done" convention to invent in Google
  Calendar's UI
- Calendar sync stays e2e-test/mocked-API only until a second real Google account exists to
  dogfood the real Google Calendar API integration manually

---

## ADR-006: Flatten to a single monorepo with a root pnpm workspace

Date: 2026-07-28

Status: Accepted

### Context
`backend/` (from `nest new`) and `frontend/` (from `create-next-app`) were each scaffolded with
their own independent git repo nested inside the top-level `todolist` repo (which itself already
tracks `origin/main`). Left as-is, `git add backend frontend` from the top level would silently
record them as gitlinks (submodule-style commit pointers) rather than actual tracked file contents.
Separately, `backend/` used pnpm (matching the hub) while `frontend/` used npm.

### Decision
Removed the nested `.git` directories (no real history lost — backend had zero commits, frontend
had one auto-generated "Initial commit from Create Next App"). Both apps are now tracked directly by
the top-level repo, under a single root `pnpm-workspace.yaml` covering `backend` and `frontend` as
workspace packages, with one root lockfile.

### Alternatives Considered
- Genuine git submodules, or two fully independent repos — rejected: no requirement for
  backend/frontend to be independently versioned or deployed on separate release cycles; a monorepo
  matches the hub's own single-repo structure and gives one CI pipeline instead of two-to-three.

### Consequences
- One CI workflow, one dependency-install/cache step, one place to `pnpm install`
- Any future subdomain project scaffolded the same way (nested `nest new`/`create-next-app` repos)
  should get this same flatten-before-first-commit treatment

---

## ADR-007: Downgrade frontend to Tailwind CSS v3, to reuse the hub's shadcn theme

Date: 2026-07-28

Status: Accepted

### Context
`create-next-app` scaffolded the frontend with Tailwind CSS v4 (current default), while the hub's
shadcn components and theme (light/dark/theme-rose CSS variables) are built against Tailwind v3's
`tailwind.config.ts` + CSS-variable model. v3 and v4 configure shadcn theming differently enough
that reusing the hub's exact theme tokens requires matching its major version.

### Decision
Downgrade the frontend to Tailwind CSS v3.4.x, matching the hub, so its shadcn components and theme
CSS variables can be copied directly instead of re-adapted to v4's `@theme` model.

### Alternatives Considered
- Keeping Tailwind v4 and re-theming shadcn components from scratch — rejected: real, avoidable
  duplicate work for identical visual output, given "same themes as hub" was the actual requirement.

### Consequences
- Frontend intentionally runs an older Tailwind major than a fresh `create-next-app` would default
  to today — a deliberate, documented choice, not drift, so it shouldn't be "fixed" by a routine
  dependency bump without revisiting this ADR
- Next.js itself was *not* downgraded to match the hub (16.2.12 vs the hub's 15.3.4) — nothing about
  the Tailwind/shadcn reuse requires it

---

## ADR-008: Split test tooling by app — Jest (backend), Vitest (frontend), Playwright (e2e)

Date: 2026-07-28

Status: Accepted

### Context
NestJS's own tooling (`nest-cli` scaffolding, `@nestjs/testing` docs/examples) assumes Jest. The hub
project uses Vitest + React Testing Library for its Next.js app. A single tool across the whole
monorepo was considered for tooling consistency.

### Decision
Backend keeps Jest (already scaffolded, idiomatic for NestJS). Frontend uses Vitest + React Testing
Library, copying the hub's exact setup since both are Next.js 15/16 + shadcn apps. E2E uses
Playwright for both, same as the hub, including its minted-session-JWT pattern (hub's ADR-021) for
authenticated test flows instead of driving real Google OAuth.

### Alternatives Considered
- Vitest everywhere, including the backend — rejected: would mean re-deriving NestJS testing
  patterns (`Test.createTestingModule()` etc.) that Jest already supports natively in the ecosystem,
  for a consistency win that doesn't offset the cost.

### Consequences
- Two unit-test runners in one repo (Jest + Vitest) is a deliberate, scoped exception, not drift —
  each is the idiomatic default for its own framework
- Playwright e2e needs the whole stack running (Postgres + backend + frontend), mirroring the hub's
  `docker-compose.test.yml` pattern

---

## ADR-009: Hub gains a small `project-members` search endpoint, not a full user-directory service

Date: 2026-07-28

Status: Accepted

### Context
Sharing a List needs a way to search for share targets by name/email among users who already have
hub `project_access` to todolist (business-rules.md Rule 4). A larger "extract a shared users
service out of the hub" idea was floated as one way to solve this, alongside the (separately
deferred, ADR-001) auth-extraction idea.

### Decision
Add one small, narrowly-scoped read endpoint to the hub: `GET /api/auth/project-members?project=
todolist&q=<term>`, returning `{ userId, email, name, image }[]` matches (case-insensitive, capped
result count) among users with `project_access` for the given project slug.

### Alternatives Considered
- A full, separate user-directory service — rejected: solves a much bigger problem (many consumers,
  many projects needing rosters) than the one real need today (todolist's own share-target search),
  and duplicates the auth-extraction question already deferred in ADR-001.

### Consequences
- The hub's API surface grows by exactly one endpoint, following its existing validate-endpoint
  conventions (same auth gate, same response shape style)
- If more subdomain projects later need the same lookup, this endpoint already generalizes by
  `project` slug — no todolist-specific coupling to widen later

---

## ADR-010: CI checks both apps unconditionally on every push — no path-based filtering yet

Date: 2026-07-28

Status: Accepted

### Context
A monorepo CI workflow can either always run every app's lint/typecheck/test steps, or filter by
which paths changed (`backend/**` vs `frontend/**`) to skip unaffected work.

### Decision
Run lint, typecheck, prettier check, and tests for both `backend` and `frontend` on every push,
unconditionally. Path-based filtering is deferred.

### Alternatives Considered
- Path-based filtering from day one — rejected as premature: at this project's scale, the added
  complexity (and the risk of a filter silently skipping a check it shouldn't) isn't justified yet.

### Consequences
- Adding path filtering later is purely additive (a `dorny/paths-filter` step plus `if:` conditions
  on already-separate per-app jobs) — this decision doesn't need to be reversed to add it, just
  extended, so revisit only if CI runtime actually becomes a real cost
