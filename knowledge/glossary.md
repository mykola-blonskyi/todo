# Glossary

## Terms

### Hub

The existing application at `blonskyi.dev` (repo: `my-projects`). Owns Google login, the
`.blonskyi.dev` session cookie, the project directory, and per-project access control. Todolist is
a *consumer* of the hub's auth, not a re-implementation of it.

---

### Project (hub term)

A registered pet project in the hub's `projects` table (e.g. slug `todolist`), listed on the hub's
project directory and gated by `project_access`. Not to be confused with a **List** (todolist's own
domain concept, see below) — "project" always means the hub-level registration, "list" always means
a todolist entity.

---

### Project Access

A hub-level grant (row in `project_access`) that lets a given user open a given subdomain project at
all. Checked by every subdomain's middleware via the hub's `/api/auth/validate` endpoint. Distinct
from — and a prerequisite for — being invited to a specific **List** inside todolist.

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

### Comment

A free-text note attached either to a specific Task or to a List as a whole. Any User with access to
the List (owner or accepted Collaborator) may add Comments; nobody may edit Tasks via a Comment — it
is annotation only, never a substitute for the owner-only Task edit rules.

---

### CalendarSync

A per-user, per-Task record (`userId`, `taskId`, `googleEventId`, `googleCalendarId`) tracking that a
given User has pushed a given Task to their own Google Calendar. Because sync is one-way and
per-user, the same Task can have independent CalendarSync rows for the owner and for each
Collaborator who opted in — they are separate calendar events in separate calendars, not one shared
event.

---

### GoogleCalendarConnection

A per-user record holding the OAuth tokens (encrypted at rest) that authorize todolist to write to
that User's Google Calendar. Entirely separate from hub login — login only ever grants identity
(profile/email) scope; a GoogleCalendarConnection is created only when a User explicitly clicks
"Connect Google Calendar" and grants the Calendar scope.

---

### Sync (verb, as in "sync a Task")

The one-way, manual, per-user action of pushing a Task with a due date to the acting User's own
Google Calendar. Never used to mean reading changes back from Calendar into todolist — that
direction does not exist in this system.
