# Domain Model

See [glossary.md](glossary.md) for term definitions and [business-rules.md](business-rules.md) for
the permission/cascade rules referenced below.

## Entities

### User

Responsibilities:
- Local shadow of a hub-identified person. Never the source of truth for identity — the hub is.
- Owns Lists, holds ListShares, has independent theme/locale preferences, may hold a
  GoogleCalendarConnection.

Fields:
- `id` (uuid, local primary key)
- `hubUserId` (uuid — the hub's `users.id`, the join key back to the hub, not a real FK since it
  lives in a separate database)
- `email`, `name`, `image` (denormalized from the hub, refreshed on login / project-members lookups)
- `locale` (enum: en/ru/uk/es, default `en` — independent of the hub's own per-user locale)
- `theme` (enum: light/dark/theme-rose, default `light` — independent of the hub's own per-user
  theme)
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
- `ownerId` (→ User)

Relationships:
- N:1 with **User** (owner)
- 1:N with **Task**
- 1:N with **ListShare**
- 1:N with **Comment** (list-level)

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
- 1:N with **CalendarSync** (only present for Tasks with a `dueDate` that someone chose to sync)

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
- Tracks that a specific User has pushed a specific Task to their own Google Calendar, so todolist
  knows which `googleEventId` to update or delete later (e.g. on task completion, per
  [business-rules.md](business-rules.md)).

Fields:
- `id`, `googleEventId`, `googleCalendarId`, `syncedAt`
- `userId` (→ User), `taskId` (→ Task)

Relationships:
- N:1 with **User**
- N:1 with **Task**

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
