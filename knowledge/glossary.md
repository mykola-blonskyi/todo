# Glossary

## Terms

### Hub

The existing application at `blonskyi.dev` (repo: `my-projects`). Owns the project directory. Prior
to ADR-016 it also owned Google login, the `.blonskyi.dev` session cookie, and per-project access
control for every subdomain, including todolist; that responsibility now belongs to **login**
(below). The hub is still called for exactly one thing — the `/api/auth/project-members` search
(see `docs/TODO.md`'s deferred-dependency entry).

---

### login

The shared OpenID Provider at `login.blonskyi.dev` (repo: `login`) for all `*.blonskyi.dev`
projects, since ADR-016. Owns Google login, user approval, and per-client access
(`client_members`). Todolist is a genuine, independent OIDC client of it (Auth.js, authorization
code + PKCE) — not a shared-cookie consumer the way it was of the hub before ADR-016.

---

### Project (hub term)

A registered pet project in the hub's `projects` table (e.g. slug `todo`), listed on the hub's
project directory. Not to be confused with a **List** (todolist's own domain concept, see below) —
"project" always means the hub-level registration, "list" always means a todolist entity. Distinct
from, and no longer gated by, hub-level **Project Access** (below) — see ADR-016.

---

### Project Access (hub term, superseded for todolist by ADR-016)

The hub-level grant (row in `project_access`) that used to let a given user open todolist at all,
checked via the hub's `/api/auth/validate` endpoint on every request. Since ADR-016, todolist's
equivalent gate is login's own `client_members` grant for the `todolist` client, enforced by login
itself before it issues a token — see `knowledge/business-rules.md` Rule 1. Other hub subdomains
that haven't migrated yet may still use this term as originally defined.

---

### List

The core todolist entity: a named collection of Tasks, owned by exactly one User, optionally shared
with Collaborators. Has its own per-owner metadata (title) but no owner-only theme — theme/locale
are User-level preferences, not List-level.

---

### Task

A single to-do item inside a List. Has a title, a `done` flag, and an optional due date. Only the
List's owner can create, edit, or delete Tasks — Collaborators may only toggle `done` and add
Comments.

---

### Owner

The User who created a List. The only role that can edit/delete Tasks, edit or delete the List
itself, and invite or remove Collaborators.

---

### Collaborator

A User who has **accepted** a List's share invitation (see **ListShare**). Can toggle `done` on any
Task in that List, and add Comments. Cannot add/edit/delete Tasks, cannot edit the List, cannot
re-share it.

---

### ListShare

The invitation/membership record connecting a List to a User the owner has invited. Has a status:
`pending` (invited, not yet responded), `accepted` (the user is now a Collaborator), or `declined`
(the user rejected the invite). Only the List's owner may create a ListShare; only the invited User
may move it from `pending` to `accepted`/`declined`.

---

### Category

A User's own named grouping for Lists (e.g. "Work", "Personal") — always private and per-User, not
shared or visible to anyone else, even on a List multiple Users have access to. A "folder" model
(a List has at most one Category per User), not a multi-tag system.

---

### ListCategoryAssignment

The record connecting one User's Category to one List they have access to. Independent per User —
the owner and each Collaborator on a shared List categorize it separately, with no visibility into
each other's choice. A List with no ListCategoryAssignment for a given User is "uncategorized" for
that User specifically — not a repo-wide state.

---

### ListTemplate

A reusable, editable recipe, owned by one User, that spawns a brand-new List every time its
recurrence rule fires: a fixed checklist of Task titles, a recurrence rule (daily / weekly on chosen
weekdays / monthly on a chosen day / every N days, the last of which fires in **Streaks** — see
below), a timezone anchoring what "day" means for it, an `active`/`paused` status, and a set of
default Collaborators auto-shared onto every List it spawns. Editing a ListTemplate only affects its
future Occurrences — Lists it already spawned are untouched. Distinct from a **List** itself — a
ListTemplate never holds Tasks directly, it only produces Lists.
_Avoid_: Recurring List (conflates the template with the Lists it produces — they're different
things with different lifecycles)

---

### Occurrence

A single scheduled firing of a ListTemplate's recurrence rule, producing exactly one new List.
"Next occurrence" means the next date/time (in the template's own timezone) a new List will be
spawned. Within a Streak, each ON day is still its own Occurrence — a 2-day Streak produces two
Occurrences, not one.

---

### Streak

For an `everyNDays` ListTemplate, a run of consecutive ON days (`streakDays` long) during which the
template fires once per day, followed by a run of consecutive rest days (`intervalDays` long) during
which it doesn't fire — the whole ON-then-rest span repeats indefinitely from `streakStartDate`. A
plain "every 3 days" pulse is the degenerate case where the Streak is 1 day long. See Rule 25 in
[business-rules.md](business-rules.md) for the exact firing math.
_Avoid_: Cycle (used informally above to mean "one Streak + its following rest period," but not
established as its own glossary term — don't introduce it as a formal noun without a reason to)

---

### Comment

A free-text note attached either to a specific Task or to a List as a whole. Any User with access to
the List (owner or accepted Collaborator) may add Comments; nobody may edit Tasks via a Comment — it
is annotation only, never a substitute for the owner-only Task edit rules.

---

### CalendarSync

A per-user, per-List record (`userId`, `listId`, `googleEventId`, `googleCalendarId`) tracking that
a given User has pushed a given List to their own Google Calendar — one event per List, never one
per Task (ADR-015). Because sync is one-way and per-user, the same List can have independent
CalendarSync rows for the owner and for each Collaborator who opted in — they are separate calendar
events in separate calendars, not one shared event.

---

### GoogleCalendarConnection

A per-user record holding the OAuth tokens (encrypted at rest) that authorize todolist to write to
that User's Google Calendar. Entirely separate from signing in via **login** — that only ever grants
identity (profile/email) scope; a GoogleCalendarConnection is created only when a User explicitly
clicks "Connect Google Calendar" and grants the Calendar scope.

---

### Sync (verb, as in "sync a List")

The one-way, manual, per-user action of pushing a List with a due date to the acting User's own
Google Calendar, as a single event whose description carries the List's Tasks as a checklist
(ADR-015). Never used to mean reading changes back from Calendar into todolist — that direction does
not exist in this system.

---

### Disconnect (verb, as in "disconnect Google Calendar")

The User-initiated action of withdrawing todolist's write access to their Google Calendar: the
**GoogleCalendarConnection** is revoked at Google and deleted locally, while every already-synced
Calendar event and **CalendarSync** row survives untouched (business-rules.md Rule 27). Distinct
from two neighbouring things it is easily confused with: revoking access from the User's own Google
Account (same effect on the grant, but todolist keeps a dead row until it next tries to sync), and
signing out of todolist via **login** (which touches no Calendar state at all).

---

### Archived (adjective, of a List)

A **List** the auto-archive job has retired from the overview because it is a finished, 30-day-old,
non-newest **Occurrence** of a **ListTemplate** (business-rules.md Rule 28). Purely a view state —
`List.archivedAt` is set and nothing else changes: the Tasks, ListShares, Comments, **CalendarSync**
rows and the real Google Calendar events all survive, and `myLists` still returns the List. The
owner can restore it, permanently (`unarchivedAt`).

Distinct from two things it is easily confused with:

- **Deleted** — a delete removes the List and everything hanging off it, and cleans up every synced
  Calendar event (Rule 10). Archiving deliberately does none of that; it is reversible, a delete is
  not.
- **A paused ListTemplate** — pausing stops a template producing *new* Occurrences (Rule 18) and
  says nothing about the Lists it already spawned. Archiving hides *one already-spawned List* and
  says nothing about whether the template keeps firing. An active template can have archived
  Occurrences; a paused one can have none.

_Avoid_: "archived template" (a **ListTemplate** is `active` or `paused` — it is never archived)
