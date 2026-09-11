# Business Rules

See [domain-model.md](domain-model.md) for entity definitions and [glossary.md](glossary.md) for
terminology.

## Rule 1 — login's own access grant gates everything, before any List-level rule applies

A User must be `approved` on login and hold a `client_members` grant for the `todolist` client (or
be login's owner) to reach todo.blonskyi.dev at all — enforced by login itself before it ever issues
a token to todolist's Auth.js client (ADR-016). Previously this was the hub's own `project_access`
grant, checked via a separate `/api/auth/validate` call on every request; that call no longer
exists — a valid todolist session already implies the grant, since login would not have issued the
token otherwise. No rule below is ever reached by a User who fails this check.

---

## Rule 2 — Only Owner manages Task content

Only a List's Owner may create, edit, delete, or reorder Tasks, and only the Owner may edit or
delete the List itself. Collaborators may only toggle a Task's `done` flag and add Comments.

---

## Rule 3 — Only Owner invites; only the invitee responds

Only a List's Owner may create a ListShare (invite someone). Only the invited User may transition
their own ListShare from `pending` to `accepted` or `declined`. Collaborators may never re-share a
List to a third party.

---

## Rule 4 — Share targets must already have hub project access

A List may only be shared with a User who already has `project_access` for the `todo` project
slug on the hub (checked via the hub's `project-members` search endpoint at invite time, see ADR-004
in [docs/decisions.md](../docs/decisions.md)). Sharing with an arbitrary email address is not
supported — someone who can't reach todo.blonskyi.dev at all can't act on a shared List anyway.

---

## Rule 5 — Preferences are per-User, not per-List

Theme and locale are properties of a User's own profile, independent of which Lists they own or
collaborate on. There is no per-List theme override.

---

## Rule 6 — Comments are annotation only

Comments (task-level or list-level) never grant edit rights over the thing they're attached to.
A Collaborator's Comment on a Task does not let them change that Task's title, due date, or
`done` state through any means other than the explicit toggle allowed by Rule 2.

---

## Rule 7 — Notifications are in-app and pull-based only

There is no email, push, or real-time delivery for share invites or new Comments. A pending
ListShare surfaces the next time the invitee opens todolist; a new Comment is visible the next time
anyone views that Task/List. (A Telegram-bot notification channel is a possible future addition —
see [plans/backlog.md](../plans/backlog.md) — not built in the initial version.)

---

## Rule 8 — Calendar sync is opt-in, one-way, and per-user

A List only participates in Calendar sync once it has a due date, and only for Users who explicitly
trigger a sync for that List — never automatically, and never by default for either the Owner or a
Collaborator. Sync is List-level: one Calendar event per (User, List), not per Task (ADR-015) — its
description lists every Task as a checklist (done/not-done marker), so per-Task state is visible
without per-Task events. Sync is one-way (todolist → Google Calendar); todolist never reads back
edits made directly in Google Calendar. The Owner's and each Collaborator's synced copies are
independent events in independent calendars (see **CalendarSync**, one row per user per List).

---

## Rule 9 — Retired

Previously: "completing a synced Task deletes its calendar event" — this assumed per-Task sync.
Retired by ADR-015 (List-level sync): Task completion has no automatic effect on the List's Calendar
event. The event only changes on an explicit re-sync (which refreshes the checklist to show current
done/not-done state) or gets removed via Rule 10's List-deletion/collaborator-removal cascade.

---

## Rule 10 — Deleting a List or removing a Collaborator cleans up their calendar event

- Deleting a List cascades to its Tasks, Comments, and ListShares, and best-effort deletes the
  synced Calendar event for every User (Owner and all Collaborators) who had synced that List.
- Removing a Collaborator (by the Owner) or a Collaborator leaving voluntarily deletes their
  ListShare and best-effort deletes only *their own* synced Calendar event for that List — other
  Users' synced events are untouched.
- Both are best-effort: a failed Google API call is logged, not treated as a failure of the
  deletion/removal itself.
- Deleting several Lists at once applies this rule once per List, sequentially and outside any
  transaction — each delete runs its own Calendar cleanup, so a batch is never held open across a
  string of external API calls. Partial success is the contract: a List the caller doesn't own (or
  that is already gone) fails on its own and is reported back as such, without aborting the rest of
  the batch. There is no cap on how many Lists one batch may carry. This is the bulk-deletion
  contract for every entity that offers one — Rule 23 applies it to Categories.

---

## Rule 11 — Hub-level access revocation is not specially handled

If the hub revokes a User's `project_access` to todolist independently of any List activity, no
cascade or cleanup runs in todolist. The User is simply locked out at Rule 1 on their next request.
Their ownership, ListShares, Comments, and CalendarSync rows remain exactly as they were — inert,
not actively harmful, and out of scope to reconcile automatically.

---

## Rule 12 — Only the owner manages a ListTemplate

Only a ListTemplate's owner may create, edit, pause/resume, or delete it — the same sole-authority
pattern as List ownership (Rule 2). A ListTemplate has no collaborator role of its own; the
default-Collaborator set (**TemplateCollaborator**) is just a list of Users to auto-share each
spawned List with (Rule 14), not people with any say over the template itself.

---

## Rule 13 — Each Occurrence spawns an independent List from the template's current checklist

When a ListTemplate's recurrence rule fires, it creates a new List (titled from the template) with
one Task per entry in the template's current `taskTitles`, each `done: false` with no due date.
Nothing carries over from the previous Occurrence's List — unfinished Tasks are left behind on that
(now-historical) List, untouched.

---

## Rule 14 — Default Collaborators are auto-shared as accepted, every Occurrence

Every User in a ListTemplate's TemplateCollaborator set gets an `accepted` ListShare created
automatically on each newly-spawned List — no `pending` state, no invite to accept, since they
already agreed to be on this recurring series once (when added to the template). Adding or removing
someone from the template's TemplateCollaborator set only affects future Occurrences, never Lists
already spawned.

---

## Rule 15 — Occurrences are anchored to the template's own timezone

A ListTemplate's recurrence rule (what counts as "today," a weekday, or a day of the month) is
evaluated against its own `timezone` field, captured once at creation — never UTC, and never the
owner's current profile setting (the owner's timezone isn't tracked anywhere; see
[domain-model.md](domain-model.md) User). If the owner is later in a different timezone, the
template's schedule does not silently shift.

---

## Rule 16 — Monthly Occurrences clamp to the last day of short months

A ListTemplate with `recurrenceType = monthly` and a `dayOfMonth` beyond a given month's actual
length (e.g. 31 in April, or 29/30/31 in February) spawns on that month's last day instead of
skipping the month entirely or rolling into the next one.

---

## Rule 17 — Deleting a ListTemplate does not delete Lists it already spawned

Deleting a ListTemplate only stops future Occurrences. Every List it already spawned remains fully
intact (Tasks, Comments, ListShares, CalendarSync all untouched) — its `templateId` is simply
cleared. This is a distinct case from Rule 10: there, deleting a List cascades to *its own*
children; here, the *parent* template is removed while its already-spawned Lists survive.

---

## Rule 18 — A paused ListTemplate spawns nothing until resumed

Setting a ListTemplate's `status` to `paused` stops it from spawning new Lists on its schedule, but
preserves all its configuration (checklist, recurrence rule, timezone, TemplateCollaborator set) for
when it's set back to `active`. Distinct from deletion (Rule 17): pausing is fully reversible with
no configuration lost.

---

## Rule 19 — Editing a ListTemplate only affects future Occurrences

Changing a ListTemplate's checklist, recurrence rule, timezone, or TemplateCollaborator set never
retroactively modifies Lists it already spawned — those Lists are independent entities from the
moment they're created (Rule 13). Only the next Occurrence onward reflects the edit.

---

## Rule 20 — Only a Category's owner manages it

Only a Category's owner may create, rename, or delete it — the same sole-authority pattern as List
ownership (Rule 2) and ListTemplate ownership (Rule 12). Categories have no collaborator role.

---

## Rule 21 — Assigning a Category requires access to the List, not ownership of it

Any User with access to a List (owner or accepted Collaborator, same check as the `list` query)
may assign or unassign one of their own Categories on it. Assigning a Category never requires
owning the List — only having a Category of one's own and access to the List being categorized.

---

## Rule 22 — Category assignment is per-User and fully independent

A ListCategoryAssignment is scoped to one User. On a shared List, the owner and each Collaborator
categorize it entirely independently — with no visibility into, or influence over, each other's
choice. A List can be "Work" for its owner and simultaneously uncategorized for a Collaborator.

---

## Rule 23 — Deleting a Category only removes its assignments, never the Lists

Deleting a Category cascades to delete its ListCategoryAssignment rows only. The Lists that were
assigned to it are completely untouched — they simply become uncategorized for that User. Distinct
from Rule 10 (deleting a List cascades to *its own* children); here, deleting the *grouping*
leaves the grouped things alone.

Deleting several Categories at once follows the same bulk contract Rule 10 states for Lists —
sequential, outside any transaction, partial success reported per item, no cap — applying this rule
once per Category, so every List filed under any of them survives as an uncategorized List. Because
the count makes a bulk delete read as if it removed the Lists too, the confirmation shown for one
must say that they survive.

---

## Rule 24 — A ListTemplate's default category only ever applies to the template's own owner

A ListTemplate's optional default Category (see Rule 14 for the analogous TemplateCollaborator
auto-share) is applied as the *owner's own* ListCategoryAssignment on every List the template
spawns — never for TemplateCollaborators, consistent with categorization being per-User (Rule 22).
A Collaborator on a spawned List always starts uncategorized for themselves.

---

## Rule 25 — `everyNDays` fires in Streaks, not single-day pulses

A `recurrenceType = everyNDays` ListTemplate fires for `streakDays` consecutive days (a **Streak**,
see [glossary.md](glossary.md)), then goes quiet for `intervalDays` consecutive days (the rest
period), then repeats — each ON day within a Streak spawns its own independent Occurrence (Rule 13
still applies per-day, not per-Streak). `streakDays = 1` is the degenerate case: a single-day pulse
repeated every `1 + intervalDays` days, which is the entire behavior this recurrence type had before
Streaks existed.

Streak position is computed as pure calendar arithmetic anchored to `streakStartDate` (defaults to
the template's `createdAt`, in the template's own `timezone` per Rule 15) — `daysSince(streakStartDate)
mod (streakDays + intervalDays) < streakDays` means due. This is deliberately **not** self-healing:
unlike a `lastSpawnedAt`-anchored check, if the spawn cron doesn't run during what should have been an
ON day (e.g. a deploy outage), that day's Occurrence is gone for good — the next run just continues
the calendar-position calculation, it doesn't detect or catch up a missed day. This matches how
`weekly`/`monthly` already work (pure calendar position, no rolling state) rather than the older,
now-superseded `lastSpawnedAt`-rolling approach `everyNDays` used before Streaks — a deliberate
trade-off for determinism and consistency with its sibling recurrence types over resilience against
scheduler downtime.

Existing `everyNDays` templates created before Streaks shipped are **not** migrated: `intervalDays`
changed meaning (it now means rest-days-only, not full cycle length) with no backfill, so a
template's firing cadence may shift once this ships. Accepted as low-impact given how few templates
exist at this stage of the project — not a precedent for skipping migrations on future breaking
field-meaning changes.

---

## Rule 26 — GoogleCalendarConnection tokens are encrypted at rest with AES-256-GCM

`GoogleCalendarConnection.accessToken`/`refreshToken` are never stored in plaintext (ADR-004). Each
value is encrypted individually with AES-256-GCM, a fresh random IV per encryption, keyed by the
`TOKEN_ENCRYPTION_KEY` env var (32 raw bytes, base64-encoded). The key is generated per environment
(dev/prod each get their own) and is never derived from or shared with the hub's own secrets — only
`GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` are reused from the hub (ADR-004); the encryption key is
todolist's own.

Google only re-issues a `refresh_token` when the consent screen is forced (`prompt=consent`, which
the connect flow always sets) — a reconnect that omits one from Google's response keeps the
previously-stored (still encrypted) `refreshToken` rather than overwriting it with nothing.

---

## Rule 27 — Disconnecting Google Calendar revokes the grant but keeps the synced events

Disconnecting revokes todolist's OAuth grant at Google and deletes the stored
`GoogleCalendarConnection` (and with it both tokens). It deliberately does **not** delete the
User's already-synced Calendar events, and does not delete their `CalendarSync` rows:

- The events are data in the User's own calendar, and the published Privacy Policy already tells
  them the events survive — only a List deletion removes an event automatically (Rule 10).
- Keeping the `CalendarSync` rows means a later reconnect + re-sync updates those same events
  instead of creating duplicates. Between disconnect and reconnect the rows are inert, the same way
  Rule 11 leaves everything intact when hub access is revoked.

This is the deliberate asymmetry with Rule 10: there, the User has *lost access to the List*, so
their copy of its event is cleaned up; here they keep the List and only withdraw todolist's write
access to their calendar.

Revocation is best-effort: a revoke call Google refuses is logged and the local tokens are deleted
anyway, and the mutation still reports success — once the row is gone todolist has no Calendar
access either way, and the User's remaining recourse (revoking directly in their Google Account) is
already documented in the Privacy Policy. Disconnecting when nothing is connected is a no-op, not
an error.

---

## Rule 28 — Stale template-spawned Lists are auto-archived, reversibly and without touching Calendar

Because every Occurrence is its own independent List that is kept as history (ADR-013), an active
ListTemplate would otherwise add one card to the overview forever. A daily job archives the ones
that have clearly served their purpose. A List is eligible only when **all** of these hold:

- `templateId` is set — a manually-created List is never auto-archived, however old or finished
- `createdAt` is at least 30 days before now
- it has no undone Tasks (a List with no Tasks at all counts as having none undone)
- it is **not** the newest Occurrence of its template, compared against every List of that template
  whatever its archive state — so an active template always keeps exactly one live card, and a
  template nobody uses any more doesn't quietly vanish from the overview entirely
- `archivedAt` is null (nothing to do) and `unarchivedAt` is null (see below)

Archiving is **view-level only**: it sets `List.archivedAt` and nothing else. Tasks, ListShares,
Comments, `CalendarSync` rows and the User's real Google Calendar events are all untouched, and
nothing cascades. This is the whole reason the job archives rather than deletes: a cron that
hard-deleted Lists would trip Rule 10's cleanup and silently remove events from the calendars of
every User who had synced them — a background job is not an intent to do that.

`myLists` keeps returning archived Lists; hiding them is the client's job. The overview shows them
under its own Archive filter only, and leaves them out of the shell's counts.

**A restore is permanent.** Restoring (owner-only, like every other List lifecycle action — Rule 2)
clears `archivedAt` and sets `unarchivedAt`, which is never cleared again; the job skips any List
that has it, forever, even if that List still satisfies every condition above. A job that overrules
a User's explicit decision on the next timer is the behaviour that makes people stop trusting
automation. There is deliberately no manual archive action to pair with it — archiving is the job's
business, restoring is the User's.

---

## Rule 29 — A Google-side revoke marks the connection stale; it never silently deletes it

A User can withdraw todolist's Calendar access from their Google Account directly, without ever
touching our Settings page (Rule 27's Disconnect). That kills the stored `refreshToken` but leaves
the `GoogleCalendarConnection` row behind, so without this rule Settings goes on claiming
*Connected* forever and every sync fails with a generic error that points nowhere.

todolist notices this **lazily** — only when it next tries to use the grant, because nothing polls
Google in the background. Two calls can notice it:

- a token refresh Google answers with `invalid_grant`
- a Calendar API call Google answers with `401`, which matters because the stored access token
  stays usable for up to an hour after the revoke and no refresh is attempted in that window

Either sets `GoogleCalendarConnection.revokedAt`. The row itself is **kept**, deliberately:
deleting it on the first `invalid_grant` would make the app self-heal into a "never connected"
state, and a transient Google failure that happens to carry that code would then silently discard a
connection the User never withdrew. `googleCalendarConnected` therefore stays true, and a second
field, `googleCalendarNeedsReconnect`, carries the staleness — Settings shows a *Reconnect needed*
badge plus a reconnect action instead of the *Connected* badge, and a failed sync says the access
was revoked rather than blaming a missing due date. A successful reconnect clears `revokedAt`.

Two Google responses that look identical are deliberately **not** treated as a revoke:

- `invalid_grant` from the initial code exchange, which means a stale or already-used authorization
  code — "start the flow again", not "the grant is gone"
- any other token-endpoint failure (`invalid_client`, a 5xx, a network error), which says nothing
  about whether the User still trusts us

Everything Rule 27 says about the User's data still holds: a stale connection is flagged, never
cleaned up behind their back, and the Calendar events already synced stay in their calendar
whichever way the connection ends.
