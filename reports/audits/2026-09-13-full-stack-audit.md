# Audit Report

Date: 2026-09-13 / 2026-09-14

Auditor: three parallel read-only reviewers (architect, backend, frontend), then a fix pass

Audit Type: security, correctness and operational readiness, whole repository

---

## Scope

Every backend resolver and service, the Prisma schema and its migrations, the frontend's auth and
data layer, all six layouts, i18n coverage, accessibility, `docker-compose.yml`, both Dockerfiles
and the CI workflow. Nothing was excluded.

The decision trail for both the audit and the fixes is
[2026-09-13-full-stack-audit-decisions.tsv](2026-09-13-full-stack-audit-decisions.tsv).

---

## Findings

Status is one of **fixed** (in this branch, with a test), **open** (named below under Action Plan),
or **not a defect**.

### Critical

- **Anyone could act as any user by sending two headers.** `graphqlFetch` read `x-user-id` /
  `x-user-email` off the incoming request and forwarded them to a backend that trusts them
  absolutely (ADR-003). `proxy.ts` was supposed to overwrite them, but returned early on public
  paths and its matcher excluded any path containing a dot while the route behind it still
  rendered. Because the backend resolves an unknown `identitySub` by falling back to `email`, a
  victim's address was the whole attack. Confirmed by execution against a built frontend, not by
  reading. **fixed** — ADR-018.
- **The same hole was writable.** A Server Action is dispatched by id from a global map, and Next
  lets a request through when `Origin` is absent, so a plain POST to a public path executed any
  mutation as the victim. **fixed** by the same change: identity no longer comes from a header.

### High

- `ListShare.list` returned a full `List`, so a pending or declined invitee could read the tasks,
  comments and collaborators of a List that Rule 3 denies them. **fixed** (`ListSummary`).
- One bad `timezone` on one template stopped occurrence spawning for every user, permanently and
  silently. **fixed** (validation, plus per-template containment in the cron).
- Rule 4 was documented and entirely unenforced: `inviteToList` and `addTemplateCollaborator`
  minted a `User` row for any address the caller named. **fixed**.
- Inviting anyone who had already signed in returned a 500 — `identitySub` never equals the hub id
  the search returns. Sharing was broken for exactly the population that uses the app. **fixed**.
- An open redirect via an unvalidated `NEXT_LOCALE`, a cookie any `.blonskyi.dev` host can set.
  **fixed** (`signInUrl` takes a `Locale`).
- No `error.tsx` or `global-error.tsx` anywhere, so one backend hiccup replaced the app with Next's
  unstyled error page. **fixed**.
- The board's keyboard drag was fully implemented and CSS-hidden from keyboard users. **fixed**.
- Both overlays claimed `aria-modal` and implemented none of it. **fixed** (Radix Dialog).
- Form controls across eight components had no accessible name. **fixed**.
- No environment validation anywhere; compose substituted empty strings for unset variables.
  **fixed** (zod at boot, `${VAR:?}` in compose).

### Medium

- No timeout on any outbound HTTP call, against a 300s undici default. **fixed**.
- Re-syncing an event deleted in Google Calendar broke that List's sync permanently. **fixed**.
- Authorization lived only on root queries, never on field resolvers. **fixed** for the two
  reachable cases; see Action Plan for the general shape.
- The schema had zero indexes. **fixed** (11, each behind a query that exists today).
- No graceful shutdown: `sh` held PID 1 and `enableShutdownHooks` was never called. **fixed**.
- `depends_on` ignored the healthcheck, and the healthcheck proved nothing. **fixed**.
- `AUTH_URL` hardcoded to production in compose. **fixed**.
- `docs/architecture.md` described a Calendar sync that ADR-015 replaced, and a CI pipeline that
  does not exist. **fixed**.
- The "Invited" confirmation could never render, and a failed invite showed nothing. **fixed**.
- Any GraphQL error rendered as "not found". **fixed**.
- Preference actions wrote the cookie, then made an unguarded network call. **fixed**.
- The terminal's `:mode` skipped the cookie every other path writes. **fixed**.
- `key={index}` over a removable list of controlled inputs. **fixed**.
- `moveTaskAction` was a read-modify-write that a concurrent edit broke. **fixed**.
- A missing Coolify secret turned the deploy into a green no-op. **fixed** separately in #135.
- Five copies of the same authorization predicate. **open**.
- Hand-written wire types with no drift guard, and no committed schema. **open**.
- `shared/` imports `features/`. **open**.
- Migrations run in the container `CMD` on every start. **open**.
- The share search is a plain input, not a combobox. **partly fixed** — it announces its result
  count and the outcome of an invite now; it is still not a combobox.

### Low

- `updateTask(title: null)` threw a `TypeError` and surfaced as a 500. **fixed**.
- Check-then-write races surfaced as "Internal server error". **fixed** at the GraphQL boundary.
- A floating `bootstrap()` turned a startup failure into an unhandled rejection. **fixed**.
- `x-user-name` / `x-user-image` were read by the backend and sent by nobody, so a user's own name
  and avatar stayed null forever. **fixed**.
- Neither lint gate failed on warnings. **fixed**.
- `everyNDays` degenerated silently on a non-positive `intervalDays`. **fixed**.
- `spawnDueOccurrence` lets the owner drive `now` arbitrarily. **open**.
- Doc drift in `knowledge/domain-model.md` and Rules 4, 15, 25. **fixed**.
- Both Dockerfiles `COPY . ` before `pnpm install`, invalidating the install layer on any source
  edit. **open**.
- Layout parity and copy nits (L17–L21 of the frontend report). **open**.

### Not a defect

Token encryption is correct AES-256-GCM with a fresh IV and an enforced auth tag, and no token
plaintext is logged. Rule 29's revoke path is faithfully implemented. Rules 16, 17, 26, 27 and 28
hold. i18n key parity and resolution are exact across all four locales. No `dangerouslySetInnerHTML`,
`eval` or `new Function` anywhere. Every id-taking mutation is scoped by the caller's own user. The
service worker caches nothing. Preference cookies are allowlist-validated on every read.

---

## Overall Assessment

The app was well built and thoroughly tested at the layer it tested — 222 e2e specs against a real
Postgres, with the collaborator permission boundary genuinely exercised. Every critical finding sat
in the one place that layer did not reach: the trust boundary between the frontend and the backend,
which every backend test simulates by injecting `x-user-id` directly. That assumption was the
vulnerability.

The second theme is rules that exist in `knowledge/business-rules.md` and nowhere in the code —
Rule 4 most of all. The third is failure handling: several defects were not wrong logic but the
absence of a boundary, a timeout, a validation or an error page.

---

## Action Plan

Ordered by what it costs to leave alone.

- [ ] Give `login.blonskyi.dev` a members endpoint so the hub dependency can go. It now covers the
      invite path as well as the search, so the replacement has to cover both — `scripts/hub-callers.sh`
      reports 4. Needs a production deploy of the shared identity provider, which is a human step.
- [ ] Collapse the five copies of the access predicate into one shared, tested module. The module
      graph is genuinely acyclic, so the circular-dependency reason each copy cites no longer holds.
- [ ] Commit `schema.gql` and diff it in CI, or add frontend codegen. Today the backend can make a
      field nullable and both typecheckers and all 324 frontend tests stay green.
- [ ] Move `prisma migrate deploy` out of the container `CMD`, so a new container does not migrate
      the schema out from under the old one still serving traffic.
- [ ] Untangle `shared/` importing `features/`, which is one import away from a real cycle.
- [ ] Drop `spawnDueOccurrence`'s client-supplied `now`, or restrict the mutation to tests.
- [ ] Make the share search a real combobox.
- [ ] Reorder both Dockerfiles so `pnpm install` is not invalidated by a source edit.
