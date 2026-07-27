# Business Rules

See [domain-model.md](domain-model.md) for entity definitions and [glossary.md](glossary.md) for
terminology.

## Rule 1 — Hub project access gates everything, before any List-level rule applies

A User must have a hub `project_access` grant for the `todolist` project slug (or be the hub owner)
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

A List may only be shared with a User who already has `project_access` for the `todolist` project
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
