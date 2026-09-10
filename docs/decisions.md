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
- Keeping every Occurrence as history means the overview grows by one card per firing forever; that
  accumulation is now bounded by `knowledge/business-rules.md` Rule 28, which archives stale
  Occurrences from the view (reversibly, never deleting them — the history this ADR exists to
  preserve stays intact)

---

## ADR-014: `everyNDays` fires in Streaks (consecutive ON days), computed as pure calendar math

Date: 2026-08-13

Status: Accepted

### Context
A ListTemplate's `everyNDays` recurrence originally fired a single day, then waited `intervalDays`
days, then fired again — anchored to `lastSpawnedAt` (self-healing: a missed cron run just meant the
next run correctly measured "days since we last actually fired"). A request came in for a pattern
like "on for 2 days, off for 2 days, repeat" (e.g. an alternating-days chore schedule) — which the
existing single-day-pulse model can't express at all.

### Decision
Generalize `everyNDays` rather than add a fifth `recurrenceType`: a new `streakDays` field (default
`1`) says how many consecutive days the template fires for — a **Streak** (see
`knowledge/glossary.md`) — before going quiet for `intervalDays` consecutive rest days and
repeating. `intervalDays` is redefined to mean rest-days-only (previously: full cycle length); the
old single-pulse behavior is exactly `streakDays = 1`. A new `streakStartDate` field (defaults to
`createdAt`) anchors day zero of the Streak/rest cycle. Firing becomes pure calendar arithmetic —
`daysSince(streakStartDate) mod (streakDays + intervalDays) < streakDays` — matching how
`weekly`/`monthly` already work, rather than the old `lastSpawnedAt`-rolling approach. See
`knowledge/domain-model.md` (`ListTemplate`) and `knowledge/business-rules.md` Rule 25.

### Alternatives Considered
- **New `recurrenceType` (e.g. `cyclic`) alongside the untouched `everyNDays`** — rejected: the
  existing single-day pulse is structurally just `streakDays = 1` of the same pattern; a separate
  type would duplicate the due-check logic for what's really one concept, and grows the public enum
  for no behavioral gain.
- **Keep `intervalDays` meaning "full cycle length"** (so `streakDays=2, intervalDays=4` reads as "2
  on out of every 4") — rejected: reads backwards against the field's own name once a Streak can be
  longer than one day, and forcing `intervalDays ≥ streakDays` as a validation constraint is more
  surprising than just letting `intervalDays` mean what it says (rest days).
- **Migrate existing `everyNDays` templates' `intervalDays` down by one** to preserve their exact
  original cycle length under the new meaning — rejected for now: judged not worth a backfill
  migration given how few templates exist at this stage of the project. Explicitly not a precedent
  for skipping migrations once real user data is at stake.
- **Keep the `lastSpawnedAt`-rolling, self-healing due-check** (catches up a Streak day missed by
  scheduler downtime) — rejected in favor of deterministic calendar math: simpler to reason about,
  consistent with the other three recurrence types, and a missed-cron edge case is judged rarer and
  lower-stakes than the complexity of merging two different anchoring strategies in one due-check.

---

## ADR-015: Google Calendar sync targets the List as a whole, not individual Tasks

Date: 2026-08-14

Status: Accepted

### Context
The manual sync trigger (TODO-18) was first built per-Task: every Task with its own due date became
its own Calendar event. In practice, most Lists represent one checklist due by one deadline, not a
set of independently-scheduled items — per-Task sync required setting a due date on every Task
individually and produced one Calendar event per Task, cluttering the calendar for a single list.

### Decision
Sync is List-level: `List` gains its own optional `dueDate` (`knowledge/domain-model.md`), and
`syncListToCalendar` produces exactly one Calendar event per (user, List) — titled with the List's
title, with a checklist of every Task (done/not-done marker, `position` order) in the description.
Re-syncing updates that same event in place (via the stored `googleEventId`) rather than creating a
new one — idempotent in the sense of "never duplicates," not "never changes." `CalendarSync` is
re-keyed from `(userId, taskId)` to `(userId, listId)` accordingly. `Task.dueDate` is unchanged and
plays no role in Calendar sync anymore — it stays a purely Task-management field.

A consequence: Rule 9 ("completing a synced Task deletes its calendar event") is retired — there's no
per-Task event left to delete, and no equivalent "List is done" concept was introduced to replace it
(seen as scope creep past what was asked). The List's event is only ever removed via the existing
List-deletion/collaborator-removal cascade (Rule 10), unchanged in substance, just reworded from
per-Task events (plural) to the List's one event (singular).

### Alternatives Considered
- **Keep per-Task sync, add a List-level rollup on top** — rejected: running two sync granularities
  side by side for the same feature has no clear benefit and doubles the surface to maintain/explain.
- **Auto-delete the List's event once every Task in it is done** — rejected: requires inventing a
  "List is done" concept that doesn't exist anywhere else in the domain model, for a feature nobody
  asked for. The checklist description already shows per-Task completion state on every resync.
- **Default the event date to "today" when `List.dueDate` is unset** (so sync always works) —
  rejected: a Calendar event dated "today" for reasons unrelated to any real deadline is more
  confusing than requiring the List to have a due date before it can be synced at all.

### Consequences
- TODO-19 ("delete calendar event on task done") is cancelled — its premise no longer exists.
- The originally-merged per-Task implementation (TODO-18's first version, PR #96) was closed unmerged
  rather than shipped-then-reverted, since nothing depended on it yet.
- `CalendarSync`'s schema change (re-keying `taskId` → `listId`) needed no data migration — no rows
  existed under the old per-Task shape at the time of this change.

### Consequences
- `intervalDays`'s meaning changes for every already-existing `everyNDays` template with no data
  migration — their firing cadence may shift the moment this ships (accepted, see above)
- `everyNDays` no longer depends on `lastSpawnedAt` for its due-check (only the universal
  same-calendar-day dedup guard still reads it) — a missed cron run silently skips that Streak day
  rather than catching it up later, a real (accepted) reliability trade-off
- `streakStartDate` is genuinely new schema surface with no equivalent in the other three
  recurrence types, which anchor purely off the calendar (today's weekday/day-of-month) with no
  stored "day zero" of their own

---

## ADR-016: Todolist becomes an independent OIDC client of `login.blonskyi.dev`

Date: 2026-09-05

Status: Accepted

### Context
`login.blonskyi.dev` (repo `login`) is a new shared OpenID Provider for all `*.blonskyi.dev`
projects, extracted from the hub. The hub itself already completed the same conversion (its own
ADR-024) — a working, deployed reference for this migration. Ticket 12 does the equivalent for
todolist: stop trusting the hub's `.blonskyi.dev` session cookie and its `/api/auth/validate`
endpoint (ADR-001), and become a genuine Auth.js OIDC client of `login` instead, with `login`
itself enforcing per-client access (`client_members`) before it ever issues a token. Unlike the
hub's ADR-024, this is not a "provider swap only" — todolist never had its own login/session
implementation to swap a provider under.

### Decision
**Client registration** (operational step, on `login`, not a file in this repo): registered once via
login's own CLI —
```bash
REGISTER_CLIENT_ID=todolist REGISTER_CLIENT_NAME=Todolist \
REGISTER_CLIENT_SECRET=<generated, stored as OIDC_CLIENT_SECRET> \
REGISTER_REDIRECT_URIS=https://todo.blonskyi.dev/api/auth/callback/login \
REGISTER_KIND=confidential \
go run ./cmd/login register-client
```
(`REGISTER_SCOPES` left at its default `openid,profile,email,offline_access`; no `admin` scope. A
second, comma-separated `http://localhost:3000/api/auth/callback/login` redirect URI was added for
local verification only — not needed in production.)

`frontend/src/features/auth/lib/auth.ts`: a generic OIDC provider (`id: "login"`,
`issuer: process.env.OIDC_ISSUER`, `clientId: "todolist"` — fixed literal, matching the
registration above and the hub's own `clientId: "hub"` convention —
`clientSecret: process.env.OIDC_CLIENT_SECRET`, `checks: ["pkce", "state"]`), `session:
{ strategy: "jwt" }`, `trustHost: true`. `cookies.sessionToken` pins the cookie name/`secure` flag
explicitly (matching the hub's own auth.ts), with no `domain` — host-only, never shared with
another service. No `DrizzleAdapter`/Auth.js-managed accounts table: todolist keeps its existing
Prisma `User` shadow table exactly as before (`findOrCreateByIdentity`, from the trusted
`x-user-id`/`x-user-email` headers `proxy.ts` forwards, ADR-003) — which is also why no
`allowDangerousEmailAccountLinking` flag is needed, unlike the hub: that flag reconciles a new
provider against an adapter-managed `accounts` table with rows from a different provider, and
todolist has no such table. No custom `redirect` callback either: the hub needs one
(`resolveTrustedRedirectTarget`) because its `callbackUrl` can target any `*.blonskyi.dev`
subdomain; todolist's `callbackUrl` only ever targets its own origin, which Auth.js's default
same-origin check already covers.

**A `jwt` callback is required, and it must read `profile.sub`, never `user.id`.** Verified live
against a real login instance, not assumed from docs: without a database adapter, Auth.js
discards whatever `id` a bare inline provider's `profile()` returns and assigns `user.id` (and the
default `token.sub`) a fresh random id on every sign-in instead, since it has no adapter-backed
record to treat as canonical. `profile.sub` (from the verified ID token) is the only value
actually stable across sign-ins, so `jwt({ token, profile })` copies it onto a custom
`token.userId` field (a `next-auth/jwt` module augmentation), which `getIdentity()`
(`frontend/src/shared/lib/identity.ts`, replacing the deleted `resolveIdentity()`) reads instead of
`token.sub`. This is why the hub's own `token.userId = user.id` jwt callback works there but would
be silently wrong here: the hub's `user.id` is a real, `DrizzleAdapter`-assigned database id,
stable by construction; todolist's bare `user.id` is not, precisely because it has no adapter.

Sign-in page (`frontend/src/app/[locale]/login/page.tsx`,
`frontend/src/features/auth/components/LoginSignInButton.tsx`, todolist's first ever): a plain
`<form method="POST" action="/api/auth/signin/login">` with a client-fetched CSRF token, mirroring
the hub's own `GoogleSignInButton` byte-for-byte. Deliberately **not** `signIn()` or a Server
Action — the hub's ADR-015/016/017 chain found and fixed a real bug where a Server Action whose
result is an external navigation gets replayed by Next.js's own Server Actions `startTransition`
machinery once another page using Server Actions loads the same framework chunk. A plain form
leaves no React/Next.js request-handling in the loop to replay. Sign-out (`LoginSignOutButton`, in
the header, shown only when `proxy.ts` has forwarded an identity) *is* a Server Action, mirroring
the hub's own `logout.ts`: that replay bug only bites when the action's result navigates off our
own origin, and sign-out lands back on `/[locale]/login`.

`proxy.ts` now decodes todolist's own JWT via `getIdentity()`/`getToken()`; absent → redirect to
`/[locale]/login` with `callbackUrl` set to the exact current path (middleware also gained a
bypass for the login page's own path, to avoid a redirect loop); present → set `x-user-id`
(login's `sub`)/`x-user-email` headers, unchanged from before (ADR-003) other than the values'
source. Deleted `resolveIdentity()`/`devBypassIdentity()`/`hub-identity.ts` and the
`/api/auth/validate` call entirely, along with the `DEV_BYPASS_AUTH`/`DEV_USER_ID`/
`DEV_USER_EMAIL`/`PROJECT_SLUG` (frontend) env vars that only existed to support them: `login`
enforces approval + the `client_members` grant before issuing a token at all (Rule 1), so a valid
session already implies authorization, and local dev can now run a real `login serve` instance
against a throwaway Postgres with a directly-seeded session (login's own `examples/go-client/
README.md` "Testing without Google" technique) instead of faking identity headers.

`User.hubUserId` renamed to `User.identitySub` (plain `RENAME COLUMN` migration, no data loss) —
the local shadow User is now keyed by login's `sub`, not the hub's old user id. The GraphQL
`ShareCandidate` wire shape (still sourced from the hub's project-members search) deliberately
keeps its own `hubUserId` field name — a different, unmigrated identity mechanism.

**Data continuity is reconciled automatically, by email.** Existing `User` rows are keyed by an
identifier `login` will never reissue: the owner's row carries the hub's old user id, and
`findOrCreateCandidate` keeps minting rows keyed by a hub id for anyone added as a share/template
candidate before their own first real sign-in. `User.email` is unique, so on that person's first
real sign-in a plain upsert on `identitySub` matches nothing, falls through to `create`, and
**fails outright** on the email constraint — not a one-off owner problem, a problem for every
share candidate.

`findOrCreateByIdentity` therefore resolves in three steps inside one transaction: by
`identitySub`, then by `email` (rewriting `identitySub` onto the row that already exists), and only
then `create`. This is the same reconciliation `login`'s own `db.UpsertGoogleUser` performs for the
same shape of problem — a row created under an older identifier needs reattaching once a stable one
is presented — and every existing association (Lists, ListShares, ...) keeps pointing at the same
`User.id`. No manual SQL step, for the owner or anyone else.

### Alternatives Considered
- **`DrizzleAdapter`** — rejected: the existing Prisma `User` shadow table already does everything
  an adapter would; a second Auth.js-managed user table would mean reconciling two sources of
  truth for no benefit, with no multi-provider linking problem to solve.
- **Client-side `signIn()` or a Server Action for the sign-in button** — rejected: not hypothetical,
  a bug the hub's ADR-015/016/017 chain already root-caused (inside Next.js's own runtime) and
  fixed once; re-deriving that investigation here would waste effort proving something already
  proven.
- **A one-time manual `UPDATE users SET "identitySub" = ...` runbook step for the owner** —
  rejected. It was the original plan, on the reasoning that the new `sub` doesn't exist until the
  owner first signs in, so no migration could manufacture it. That reasoning holds for a
  *migration*, but not for the sign-in path itself, which has the new `sub` in hand at exactly the
  moment it's needed. It also framed as an owner-only chore something that affects every
  pre-existing share candidate. Reconciling by email in `findOrCreateByIdentity` handles all of
  them, with no runbook.
- **Migrating `searchShareCandidates`/`searchTemplateCandidates` off the hub in this ticket** —
  rejected, out of scope. `HubClientService.searchProjectMembers` has no login-side equivalent yet.
  Left calling the hub as before — with a real, newly-introduced consequence: that call
  authenticates against the hub's own session, which todolist's users no longer hold just by using
  todolist. Tracked in `docs/TODO.md`, not silently accepted.

### Consequences
- New frontend env vars: `OIDC_ISSUER`, `OIDC_CLIENT_SECRET`, `HUB_URL` (replaces `API_URL`'s one
  remaining use, the "blonskyi.dev" header link, unrelated to auth). Removed: `API_URL`,
  `COOKIE_DOMAIN` (verified unused), `PROJECT_SLUG` (frontend only — the backend's own, used by the
  unchanged `HubClientService`, stays), `DEV_BYPASS_AUTH`/`DEV_USER_ID`/`DEV_USER_EMAIL`.
- **`AUTH_SECRET` changes meaning** — todolist's own fresh Auth.js secret, no longer the hub's
  shared one. A genuine security improvement: one fewer service holding a credential another
  service could leak or misuse.
- Backend (`internal-only`, ADR-003) is unaffected in principle — still never verifies a JWT
  itself, only the *source* of the forwarded headers changed.
- Todolist's session cookie is host-only *and* never forwarded outward: `graphqlFetch` passes on
  only the hub's own `authjs.session-token` from the incoming `cookie` header (to the backend, and
  thence to the hub's project-members search), so the one remaining hub call can't receive this
  app's live credential. It is named `todolist.session-token` rather than Auth.js's default for the
  same reason the pass-through can be an allowlist at all: the hub sets the default name for
  `.blonskyi.dev`, and two same-named cookies can't be told apart in a `Cookie` header.
- Verified locally end-to-end against a real `login serve` instance (throwaway Postgres, `todolist`
  registered via `register-client`, IdP session seeded directly per login's own "Testing without
  Google" technique — no real Google consent screen, same sandbox limitation login's own
  `docs/TODO.md` documents): full sign-in to the exact deep-linked path, PKCE present on the real
  `/authorize` request, `identitySub` stable across repeat sign-ins (no duplicate `User` row), and
  the email reconciliation above driven through the real HTTP flow against a seeded
  candidate-shaped row with List data attached — the row was reattached in place (same `id`, new
  `identitySub`) instead of colliding on `User.email`'s unique constraint, which is what the
  original upsert did. This same live verification is what caught the `profile.sub`-vs-`user.id`
  bug above; static review alone would not have.

## ADR-017: Six switchable layouts and twelve colour palettes, as three independent user preferences

Date: 2026-09-06

Status: Accepted

### Context
The shipped UI was the shadcn default: one centred column, one `theme` select whose three values
(`light`, `dark`, `theme-rose`) mixed two different things — light/dark *mode* and a colour
*palette*. A design pass produced ten UX directions and ten palettes as mockups
(`docs/design/redesign-gallery.html`); six of the directions (Workspace, Board, Notebook, Pocket,
Terminal, Ledger) and all ten palettes were chosen, with the brief that every screen — not just
the two the mockups covered — gets a genuine version in each direction, and that the user picks
the direction like they pick a theme.

### Decision
**Appearance is three orthogonal axes, each its own `User` column and its own control:**

| axis | values | where it lives | who applies it |
|---|---|---|---|
| `theme` (mode) | `light` · `dark` · `system` | `next-themes` (localStorage + `dark` class), mirrored to `User.theme` | client |
| `palette` | `classic` · `rose` · `indigo` · `ocean` · `forest` · `olive` · `honey` · `clay` · `coral` · `violet` · `graphite` · `paper` | cookie `todolist-palette` + `User.palette` | server renders `<html class="theme-<id>">`; the switcher flips the class synchronously too |
| `layout` | `workspace` · `board` · `notebook` · `pocket` · `terminal` · `ledger` | cookie `todolist-layout` + `User.layout` | server picks the shell + page components |

The old `theme-rose` value is migrated to `theme=light, palette=rose` (migration
`20260906210000_add_palette_and_layout_preferences`).

**Palettes are colour only.** Every palette is a `.theme-<id>` block plus a `.dark.theme-<id>`
block in `globals.css`, the same token contract shadcn already used, so any palette composes with
either mode and with any layout. `--radius` is deliberately *not* a palette token — it belongs to
the layout. The palette blocks sit outside `@layer base` because Tailwind v3 tree-shakes `@layer`
classes it can't find in the content files, and these class names are assembled at runtime.

**Layouts are whole UX variants, not skins.** `frontend/src/layouts/<id>/` implements
`LayoutViews` (`layouts/types.ts`): a `Shell` (navigation chrome) and one component per screen —
Lists, List detail, Templates, Template form, Categories, Settings, Login. `layouts/registry.ts`
maps the id to the views; the route files under `app/[locale]/` only fetch data and delegate. The
shell and all overview screens share one per-request-cached GraphQL fetch (`layouts/data.ts`,
`fetchNavData`) so adding a sidebar full of counts costs no extra round-trip. Per-layout
typography/radius/primitive feel is CSS keyed on `<html data-layout>` (with `ui-*` hook classes on
the shadcn primitives); the actual behaviour — Server Actions, `TaskRow`, `ShareSearch`,
`TemplateForm`, comment threads — is shared, composed differently, and restyled through those
hooks. The List detail page was decomposed into `features/todo-list/ListDetailBlocks.tsx` for
exactly this reason; the layouts are sync Server Components using `useTranslations`, which also
makes them renderable under RTL (`tests/layouts.test.tsx` smoke-renders every screen of every
layout).

**Cookies are the render source of truth; the `User` row is the cross-device backup.** The shell is
server-rendered, so the server must know the layout before the first byte — a client-only
preference would flash. `updateLayoutAction`/`updatePaletteAction` set the cookie first (Next.js
re-renders the route after a cookie-setting Server Action, which is what swaps the shell with no
reload) and then persist. A browser with no cookie yet (new device) is served from the `User` row
once (`preferences/server.ts`) and back-fills its cookies client-side.

Default for everyone is `workspace` / `classic` / `light` — the closest to what shipped before.

### Alternatives Considered
- **One combined `theme` enum of every mode × palette pair** — rejected: 24 values, no way to add
  `system`, and the palette CSS already ships light and dark blocks per palette; two selects that
  compose is what the CSS models.
- **Palette/layout in `localStorage` only, like mode** — rejected: the layout is server-rendered.
  A client-only value means rendering the default shell and swapping after hydration (a visible
  flash) or blocking render on a client script. Cookies give the server the value up front.
- **One layout by default and the others behind `?layout=`** — rejected by the owner: the brief was
  a real preference, not a comparison mode.
- **Layout-specific versions of only the two mocked screens** — rejected by the owner (option B):
  Templates, Categories, Settings and Login each get their own composition per layout; the
  shared blocks keep that from multiplying the behaviour.
- **A drag-and-drop library for the Board** — rejected for now: native HTML5 DnD with an
  optimistic re-file covers "drag a card to another column"; touch DnD and multi-select can come
  with real demand.

### Consequences
- New GraphQL mutations `updatePalette` / `updateLayout`; `me` exposes `palette` and `layout`.
  `UserTheme` gains `system` and loses `theme_rose`.
- New message namespaces (`Nav`, `Overview`, `Appearance`, `PaletteSwitcher`, `LayoutSwitcher`,
  `Board`, `Notebook`, `Pocket`, `Terminal`, `Ledger`) in all four locales.
- Nine Google-Fonts families are self-hosted via `next/font` (one or two per layout); browsers only
  download the ones the active layout's CSS actually uses.
- `TaskRow` changed for every layout: secondary actions are icon buttons revealed on hover/focus
  (always visible on touch), the comment toggle sits inline and the thread opens below — the
  old always-visible button strip did not survive contact with the narrow Pocket column or the
  ruled Notebook page.
- The pre-layouts `Header`, `TodosList`, `ListRow`, `ListDetail`, `TemplatesList`,
  `CategoriesList` and `ThemeToggle` are gone; their responsibilities live in the shells, the
  layout pages and `ModeToggle`. Nothing references them.
- Adding a layout = a folder implementing `LayoutViews`, an id in `features/preferences/types.ts`,
  a value in `UserLayout`, a `[data-layout]` block in `globals.css`, a label in each locale.
- Read-side wiring of the persisted `User.theme` (mode) on a fresh device is still not done — mode
  stays a client/localStorage-first preference exactly as before; only palette and layout are
  read back from the row.
