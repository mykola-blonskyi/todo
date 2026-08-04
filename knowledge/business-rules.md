# Business Rules

See [domain-model.md](domain-model.md) for entity definitions and [glossary.md](glossary.md) for
terminology.

## Rule 1 — Hub project access gates everything, before any List-level rule applies

A User must have a hub `project_access` grant for the `todo` project slug (or be the hub owner)
to reach todo.blonskyi.dev at all — enforced by the subdomain middleware calling the hub's
`/api/auth/validate` endpoint. No rule below is ever reached by a User who fails this check.

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

A Task only participates in Calendar sync if it has a due date, and only for Users who explicitly
trigger a sync for that List — never automatically, and never by default for either the Owner or a
Collaborator. Sync is one-way (todolist → Google Calendar); todolist never reads back edits made
directly in Google Calendar. The Owner's and each Collaborator's synced copies are independent
events in independent calendars (see **CalendarSync**, one row per user per task).

---

## Rule 9 — Completing a synced Task deletes its calendar event

When a Task with one or more CalendarSync rows is marked `done`, todolist attempts to delete the
corresponding Google Calendar event for every User who had synced it. This is a best-effort action —
Task completion is never blocked or rolled back by a failed calendar deletion (e.g. expired token);
the failure is logged and the CalendarSync row is removed regardless.

---

## Rule 10 — Deleting a List or removing a Collaborator cleans up their calendar

- Deleting a List cascades to its Tasks, Comments, and ListShares, and best-effort deletes every
  CalendarSync'd event for every User (Owner and all Collaborators) who had synced any of its Tasks.
- Removing a Collaborator (by the Owner) or a Collaborator leaving voluntarily deletes their
  ListShare and best-effort deletes only *their own* CalendarSync'd events for that List's Tasks —
  other Users' synced events are untouched.
- Both are best-effort in the same sense as Rule 9: a failed Google API call is logged, not treated
  as a failure of the deletion/removal itself.

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
