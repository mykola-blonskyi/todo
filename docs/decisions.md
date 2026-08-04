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

## ADR-002: Dedicated `todo_app` role and `todo` database on the shared Postgres instance

Date: 2026-07-28

Status: Accepted

### Context
The hub's own ADR-009 established the pattern for services sharing the VPS's single Postgres
instance: a dedicated, least-privilege role and database per service, rather than reusing an
existing role or a shared database.

### Decision
Todolist gets its own `todo_app` role and `todo` database on that same instance, reachable at
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
todo&q=<term>`, returning `{ userId, email, name, image }[]` matches (case-insensitive, capped
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

---

## ADR-011: Pinned to Prisma 6, `prisma-client-js` generator — not Prisma 7's new client

Date: 2026-07-28

Status: Accepted

### Context
Implementing the Prisma schema + Postgres connection ticket, `pnpm add prisma @prisma/client`
installed the current stable major, Prisma 7, which defaults to a new `prisma-client` generator
(replacing `prisma-client-js`): ESM-native output, a mandatory driver adapter (`@prisma/adapter-pg`)
instead of a plain `new PrismaClient()`, and a `prisma.config.ts` file replacing schema-level
datasource config.

Wiring this up against the existing Jest/ts-jest setup (already established in ADR-008 for NestJS
compatibility reasons) surfaced two independent failures in sequence:
1. The generated client's ESM output couldn't be `require()`'d by ts-jest's CommonJS transform at
   all (`exports is not defined in ES module scope`) — fixed by explicitly setting
   `moduleFormat = "cjs"` and `importFileExtension = ""` in the generator block, which got past
   module loading.
2. Past that, Prisma 7's new query engine (a WASM-based "query compiler", replacing the old Rust
   binary engine) loads itself via a runtime `await import(...)` regardless of `moduleFormat` -
   `TypeError: A dynamic import callback was invoked without --experimental-vm-modules`. This isn't
   a config knob; it's Node's CJS module system fundamentally unable to do a dynamic `import()` of
   an ESM/WASM module without either `--experimental-vm-modules` or Jest itself running in native
   ESM mode - a real toolchain incompatibility, not a mistake in configuration.

### Decision
Downgraded to `prisma@6.19.3` / `@prisma/client@6.19.3` (`--save-exact`, latest stable Prisma 6) with
the classic `prisma-client-js` generator: default output into `node_modules/@prisma/client`, a plain
`new PrismaClient()` (no driver adapter required), datasource URL via `env("DATABASE_URL")` in
`schema.prisma` directly (no `prisma.config.ts`). This is the generator every existing NestJS+Prisma
integration pattern (including the `nestjs-prisma` library) assumes, and it has no ESM/WASM
dynamic-import interaction with Jest at all.

### Alternatives Considered
- Making Prisma 7's new client work under Jest via `--experimental-vm-modules` or a full ESM Jest
  config — rejected: would mean converting the entire backend's test toolchain to native ESM to
  accommodate one dependency's brand-new architecture, a much bigger and riskier change than this
  ticket's actual scope, for a dependency version with no feature this project currently needs.
- Switching the backend off Jest to a test runner with better native-ESM support — rejected outright,
  contradicts ADR-008's explicit reasoning for keeping Jest as NestJS's idiomatic default.

### Consequences
- `backend/prisma/schema.prisma`'s generator block and datasource config, and any future Prisma
  setup instructions, should target Prisma 6 syntax (`prisma-client-js`, `env("DATABASE_URL")` in
  the datasource block) - not the Prisma 7 `prisma-client`/`prisma.config.ts` patterns found in
  current-latest Prisma docs or `prisma init` output
- Upgrading to Prisma 7 later is possible but should be its own deliberate migration once either (a)
  the backend's test toolchain moves off Jest/CommonJS, or (b) Prisma's WASM query compiler gets a
  documented, supported way to load under a synchronous CJS `require()` context - revisit this ADR
  before attempting it again, don't just re-run `pnpm add prisma@latest`
- Dependency-update tooling (Renovate/Dependabot, if added later) should not auto-upgrade `prisma`/
  `@prisma/client` past the 6.x line without that deliberate migration

---

## ADR-012: Defer a Redis/read-through caching layer — no bottleneck exists yet

Date: 2026-07-29

Status: Accepted

### Context
Considered adding Redis as a read-through cache in front of Postgres reads, on the general
reasoning that caching is a good fit for read-heavy, shareable data (Lists visible to multiple
Collaborators once Phase 4 ships). There was no concrete measured or specific anticipated bottleneck
driving this — every query in the codebase so far (`backend/src/lists/lists.service.ts` and
equivalents) is a single-table lookup on an indexed column (primary key or the `ownerId` foreign
key), the kind of query Postgres answers trivially at this project's scale.

### Decision
No caching layer for now. Reads go straight to Postgres via Prisma, as they already do.

### Alternatives Considered
- Redis read-through cache — rejected: the exact scenario motivating it (a List visible to multiple
  Collaborators) is also the scenario where it's most dangerous. Every mutation across
  List/Task/Comment/ListShare/CalendarSync would need correct, immediate invalidation, or a
  Collaborator sees stale state after another Collaborator's edit — a correctness bug, not a
  performance win. It would also need its own testing seam, breaking the "real Postgres, mock only
  the trust boundary" philosophy established in ADR-008 and used consistently since. And it adds a
  new operational component (provisioning, monitoring, a failure-mode decision for "Redis
  unreachable") to a project that doesn't have a deploy pipeline yet (Phase 7 has no Dockerfiles).
- In-memory/application-level caching (e.g. within a single Node process) — not seriously
  considered; same invalidation-correctness problem as Redis, without even the benefit of surviving
  a process restart or being shared across instances.

### Consequences
- Revisit only when there's a concrete, measured or clearly-likely bottleneck — e.g. a specific
  query that becomes expensive once real features land (a cross-list aggregation, a future
  "search everything you have access to" feature), or observed real-usage latency. Not on general
  principle.
- If revisited, the cache-invalidation strategy needs to be designed explicitly per mutation (which
  writes invalidate which cached reads) before implementation starts — not bolted on generically -
  and a new testing seam for the cache layer itself will need to be defined, consistent with how
  every other seam in this project has been chosen deliberately (see `docs/decisions.md` and
  `knowledge/business-rules.md` throughout)
- This ADR itself is the record that this was considered and declined - don't re-propose it without
  a concrete driver this entry doesn't already address

---

## ADR-013: Recurring ListTemplates spawn independent Lists per Occurrence — not a single List reset in place

Date: 2026-08-04

Status: Accepted

### Context
Recurring todo lists (e.g. a weekly groceries checklist) could be modeled two ways: (a) one List
whose Tasks get reset/un-done on a schedule, staying the same `id` forever, or (b) a separate
`ListTemplate` entity that spawns a brand-new, independent List every time its recurrence rule
fires, with old Lists left behind as history.

### Decision
Model (b): a `ListTemplate` holds a fixed checklist of Task titles, a recurrence rule
(daily/weekly/monthly/every-N-days), its own `timezone`, an `active`/`paused` status, and a
`TemplateCollaborator` set. Each Occurrence creates a new List (fresh Tasks from the current
checklist, no carryover of unfinished items) with the template's TemplateCollaborators auto-shared
as already-`accepted` ListShares. Deleting the template does not cascade-delete Lists it already
spawned — only the `templateId` back-reference is cleared; those Lists remain intact, ordinary
Lists. See `knowledge/domain-model.md` (`ListTemplate`, `TemplateCollaborator`) and
`knowledge/business-rules.md` Rules 12–19.

### Alternatives Considered
- **Same List reset in place** — rejected: destroys the ability to see what did/didn't get done in
  a previous cycle unless a separate history/log entity were built anyway, which would just be this
  same design under a different name.
- **Re-inviting Collaborators on every spawned List** (`pending`, requiring re-acceptance each
  cycle) — rejected: a Collaborator agreeing to be on a recurring series shouldn't have to
  re-confirm every single Occurrence; that's busywork, not a meaningful consent event.
- **Cascade-deleting spawned Lists when the template is deleted** — rejected: it would silently
  destroy exactly the history this design exists to preserve; "stop generating new ones" and "erase
  everything that ever happened" are different intents and shouldn't share one action.
- **Skipping or rolling over months without the picked day** (for `monthly`) — rejected in favor of
  clamping to the month's last day: skipping means some months silently have no list at all; rolling
  to next month makes the spawn date jump unpredictably between adjacent months.

### Consequences
- A spawned List is an ordinary List in every respect (same Task/ListShare/Comment/CalendarSync
  rules apply) — no new permission model was needed, only the `templateId` provenance field
- Recurrence scheduling needs its own timezone concept (`ListTemplate.timezone`) since User has none
  — this is new schema surface scoped only to templates, not the User entity
- A background scheduler (checking due Occurrences and spawning Lists) is required — not yet
  designed; this ADR covers the data model and cascade semantics, not the job-running mechanism
