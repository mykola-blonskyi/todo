# Domain Model

See [glossary.md](glossary.md) for term definitions and [business-rules.md](business-rules.md) for
the permission/cascade rules referenced below.

## Entities

### User

Responsibilities:
- Local shadow of a login-identified person. Never the source of truth for identity — login is
  (ADR-016; previously the hub).
- Owns Lists, holds ListShares, has independent theme/palette/layout/locale preferences, may hold a
  GoogleCalendarConnection.

Fields:
- `id` (uuid, local primary key)
- `identitySub` (uuid — login's own `sub` claim, the join key back to login, not a real FK since it
  lives in a separate database. Renamed from `hubUserId` in ADR-016; a pre-existing row's value is a
  stale hub user id until the owner-remap step in ADR-016 runs, and a row created via the
  still-hub-sourced share-candidate search (`findOrCreateCandidate`) also holds a hub user id, not a
  real login `sub`, until that person actually logs in — a known, documented gap, see ADR-016)
- `email`, `name`, `image` (denormalized from login, refreshed on login / project-members lookups)
- `locale` (enum: en/ru/uk/es, default `en` — independent of the hub's own per-user locale)
- `theme` (enum: light/dark/system, default `light` — light/dark mode only, independent of the
  hub's own per-user theme)
- `palette` (enum: classic/rose/indigo/ocean/forest/olive/honey/clay/coral/violet/graphite/paper,
  default `classic` — colour palette, see ADR-017)
- `layout` (enum: workspace/board/notebook/pocket/terminal/ledger, default `workspace` — which
  app shell / page composition the user sees, see ADR-017)
- `createdAt`

Relationships:
- 1:N with **List** (as owner)
- 1:N with **ListShare** (as invitee/collaborator)
- 1:N with **Comment** (as author)
- 1:N with **CalendarSync** (as the calendar owner)
- 1:0..1 with **GoogleCalendarConnection**

Row is upserted lazily: on first login (from the validated session claims) or, earlier, when named
as a share target via the hub's `project-members` lookup (see ADR-004 in
[docs/decisions.md](../docs/decisions.md)).

---

### List

Responsibilities:
- The unit of ownership and sharing. Holds Tasks and is the target of ListShares and list-level
  Comments.

Fields:
- `id`, `title`, `createdAt`, `updatedAt`
- `dueDate` (nullable, date-only semantics like `Task.dueDate`) — owner-only to set. Used only to
  gate/date Google Calendar sync (business-rules.md Rule 8, ADR-015); has no effect on Task-level
  due dates, which remain completely independent.
- `ownerId` (→ User)
- `templateId` (→ ListTemplate, nullable) — set only if this List was spawned by a ListTemplate
  Occurrence; otherwise null for a manually-created List. Provenance only: a spawned List is an
  ordinary List in every other respect (same Task/ListShare/Comment/CalendarSync rules apply). If
  the ListTemplate is later deleted, this is cleared (`SetNull`), not cascaded — see
  [business-rules.md](business-rules.md) Rule 17.

Relationships:
- N:1 with **User** (owner)
- N:0..1 with **ListTemplate** (the template that spawned it, if any)
- 1:N with **Task**
- 1:N with **ListShare**
- 1:N with **Comment** (list-level)
- 1:N with **CalendarSync** (one row per User who has synced this List — ADR-015)

---

### ListTemplate

Responsibilities:
- A reusable recipe that spawns a new, independent List each time its recurrence rule fires. Owns
  the fixed checklist of Task titles and the default-Collaborator set every spawned List starts
  with. Never holds Tasks itself.

Fields:
- `id`, `title` (used as the title for each spawned List), `createdAt`, `updatedAt`
- `ownerId` (→ User) — same sole-authority pattern as List ownership (Rule 12)
- `taskTitles` (ordered string array) — the fixed checklist copied onto every spawned List as
  `done: false` Tasks with no due date
- `recurrenceType` (enum: `daily` / `weekly` / `monthly` / `everyNDays`)
- `weekDays` (nullable set of weekdays — only meaningful when `recurrenceType = weekly`)
- `dayOfMonth` (nullable, 1–31 — only meaningful when `recurrenceType = monthly`; clamped to a
  given month's last day at occurrence time if that month is shorter, see Rule 16)
- `streakDays` (nullable positive integer, default `1` — only meaningful when
  `recurrenceType = everyNDays`) — how many consecutive days a Streak fires for (see Rule 25 and
  [glossary.md](glossary.md))
- `intervalDays` (nullable positive integer — only meaningful when `recurrenceType = everyNDays`) —
  how many consecutive rest days follow each Streak before the next one starts (Rule 25)
- `streakStartDate` (nullable date, defaults to `createdAt` — only meaningful when
  `recurrenceType = everyNDays`) — anchors day zero of the Streak/rest cycle; pure calendar
  arithmetic from this date determines which days are ON, independent of `lastSpawnedAt` (Rule 25)
- `timezone` (IANA string, e.g. `Europe/Kyiv`) — captured once at creation; anchors what "day"
  means for this template's Occurrences, independent of the owner's own profile (see Rule 15)
- `status` (enum: `active` / `paused`) — a paused template spawns nothing until resumed, but keeps
  its full configuration (Rule 18)
- `lastSpawnedAt` (nullable) — used only to enforce "never spawn twice on the same calendar day,"
  uniformly across every `recurrenceType`; does **not** drive Streak position for `everyNDays`
  (that's pure calendar math from `streakStartDate`, see Rule 25)

Relationships:
- N:1 with **User** (owner)
- 1:N with **TemplateCollaborator** (the default-Collaborator set)
- 1:N with **List** (every List it has ever spawned — survives the template's own deletion, see
  Rule 17)

---

### TemplateCollaborator

Responsibilities:
- One User in a ListTemplate's default-Collaborator set. Existence here means "auto-share every
  spawned List with this User, pre-accepted" — see Rule 14. Carries no status of its own; there is
  no pending/declined state at the template level, only at the per-spawned-List **ListShare** level.

Fields:
- `id`, `addedAt`
- `templateId` (→ ListTemplate), `userId` (→ User)

Relationships:
- N:1 with **ListTemplate**
- N:1 with **User**

Constraints: unique on (`templateId`, `userId`) — a User is listed at most once per template.

---

### Task

Responsibilities:
- A single to-do item. Owner-managed content; Collaborators may only flip `done` and attach
  Comments.

Fields:
- `id`, `title`, `done` (boolean, default false), `dueDate` (nullable), `position` (ordering),
  `createdAt`, `updatedAt`
- `listId` (→ List)

Relationships:
- N:1 with **List**
- 1:N with **Comment** (task-level)

`dueDate` and `done` are purely Task-management fields — neither participates in Google Calendar
sync, which is List-level (see **List**.`dueDate`, ADR-015). `done` only shows up as a checklist
marker the next time the List is synced/re-synced; it has no automatic effect on any Calendar event.

---

### ListShare

Responsibilities:
- Represents an invitation from a List's owner to a User, and its lifecycle to acceptance/decline.
  The existence of an `accepted` ListShare is what makes a User a Collaborator on that List.

Fields:
- `id`, `status` (enum: `pending` / `accepted` / `declined`), `invitedAt`, `respondedAt` (nullable)
- `listId` (→ List), `userId` (→ User, the invitee)

Relationships:
- N:1 with **List**
- N:1 with **User**

Constraints: unique on (`listId`, `userId`) — a User has at most one ListShare per List at a time.

---

### Category

Responsibilities:
- A User's own named grouping for Lists. Always private and per-User — never shared, never visible
  to anyone else, even on a List multiple Users have access to.

Fields:
- `id`, `name`, `createdAt`
- `ownerId` (→ User)

Relationships:
- N:1 with **User** (owner)
- 1:N with **ListCategoryAssignment**

Constraints: unique on (`ownerId`, `name`) — a User can't have two categories with the same name.

---

### ListCategoryAssignment

Responsibilities:
- Connects one User's Category to one List they have access to. Existence of this row is what
  makes a List categorized *for that User specifically* — a shared List can be independently
  categorized (or left uncategorized) by its owner and each Collaborator, with no visibility into
  each other's choice.

Fields:
- `id`, `assignedAt`
- `userId` (→ User), `listId` (→ List), `categoryId` (→ Category)

Relationships:
- N:1 with **User**
- N:1 with **List**
- N:1 with **Category**

Constraints: unique on (`userId`, `listId`) — at most one Category per User per List (a "folder"
model, not multi-tag). `myLists(categoryId: ID, uncategorizedOnly: Boolean)` filters on this: the
two arguments are mutually exclusive filter modes, not overlaid onto one nullable argument — a
List with no ListCategoryAssignment row for the caller is what `uncategorizedOnly: true` matches.

---

### Comment

Responsibilities:
- Free-text annotation, attached to exactly one of a Task or a List (never both, never neither).

Fields:
- `id`, `body`, `createdAt`
- `authorId` (→ User)
- `taskId` (→ Task, nullable) / `listId` (→ List, nullable) — exactly one is set

Relationships:
- N:1 with **User** (author)
- N:1 with **Task** (optional)
- N:1 with **List** (optional)

---

### CalendarSync

Responsibilities:
- Tracks that a specific User has pushed a specific List to their own Google Calendar as one event,
  so todolist knows which `googleEventId` to update on re-sync or delete later (List deletion /
  collaborator removal, [business-rules.md](business-rules.md) Rule 10). List-level, not per-Task
  (ADR-015) — a resync updates the same event's checklist rather than creating a new one.

Fields:
- `id`, `googleEventId`, `googleCalendarId`, `syncedAt`
- `userId` (→ User), `listId` (→ List)

Constraints: unique on (`userId`, `listId`) — one synced event per User per List.

Relationships:
- N:1 with **User**
- N:1 with **List**

Constraints: unique on (`userId`, `taskId`) — one calendar event per user per task.

---

### GoogleCalendarConnection

Responsibilities:
- Holds the OAuth grant that authorizes todolist to write to one User's Google Calendar. Created
  only via an explicit "Connect Google Calendar" action — never implied by hub login.

Fields:
- `id`, `accessToken` (encrypted), `refreshToken` (encrypted), `expiresAt`, `scope`, `connectedAt`
- `userId` (→ User, unique — one connection per user)

Relationships:
- 1:1 with **User**
