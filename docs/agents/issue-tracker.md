# Issue tracker: Plane

Tickets and specs for this repo live in Plane (self-hosted at `https://plane.blonskyi.dev`),
workspace slug `blonskyi`, project `TODO` (identifier `TODO`, id `2df48b0f-f602-491e-8e05-fe0643ab0f4d`).
GitHub Issues on `mykola-blonskyi/todo` were migrated here on 2026-08-07 and are closed —
each closed issue carries a comment pointing at its Plane replacement (`external_source: github`,
`external_id: "<github issue number>"` on the work item, so a GitHub number can be looked back up
via `?external_source=github&external_id=<n>`).

All operations go through the Plane REST API (`/api/v1/...`), authenticated with
`X-API-Key: $PLANE_API_KEY`. Read the token from the `PLANE_API_KEY` env var — never hardcode or
commit it. Every write in this doc is a `curl` call; wrap the boilerplate (base URL, workspace,
project id, auth header) in a shell function or small script rather than repeating it.

## Specs vs. tickets

Specs (PRD-style, e.g. `Spec: Sharing & Collaboration`) and implementation tickets are both work
items in the TODO project — there's no separate "docs" surface. Plane's Pages feature would be the
better conceptual fit (reference doc, not a lifecycle-driven unit of work), but this instance is
self-hosted Community Edition v1.4.0, whose public API doesn't mount the Pages endpoints
(`GET/POST .../pages/` and `.../features/` both 404 with a valid `X-API-Key`, unlike work-items/
labels/states/relations which all work) — confirmed 2026-08-07. Root cause, confirmed from source
(`makeplane/plane` tag `v1.4.0`): the public API app (`apps/api/plane/api/urls/`, mounted at
`/api/v1/...`) simply has no `page.py` — Pages only exist as a resource in the internal, session-
cookie-authenticated app the web SPA itself calls (`apps/api/plane/app/urls/page.py`, mounted at
`/api/...` without `v1`). This isn't a Community-vs-Commercial feature flag or a "not implemented
yet" gap that a version bump necessarily closes — CE got public routes for every other resource,
just not this one. Re-check `apps/api/plane/api/urls/` for a `page.py` after any Plane version bump
anyway, in case upstream adds it, but don't expect it.

Pages themselves are usable **manually** in the web UI — as of 2026-08-07 the `live` service
(Hocuspocus/Yjs realtime sync backend the Pages editor depends on) was added back to the Coolify
deploy (`~/workspace/plane`, commit `a9b58d0`; it had been deliberately dropped in the original
deploy to save resources, per `~/Documents/obsidian-notes/plane/instructions.md` §4). The editor now
loads and renders correctly. This only helps humans clicking around — it changes nothing about API
automation, since the write gap above is unrelated to `live` being up or down.

**Automating Page creation was explicitly considered and rejected** (grilling session, 2026-08-07).
Three paths were evaluated and all rejected for the same underlying reason — none is a stable,
supported contract to build agent automation on top of:
- **Scripting the internal session-cookie API** — works technically (it's what the browser uses),
  but is undocumented and unversioned; could break silently on any Plane upgrade.
- **Webhooks (e.g. via n8n)** — Plane's outgoing webhooks (`apps/api/plane/bgtasks/webhook_task.py`)
  never fire a `page` event (only `project`/`issue`/`cycle`/`module`/`cycle_issue`/`module_issue`/
  `issue_comment`/`intake_issue`), and even an `issue`-labeled-`spec` trigger wouldn't help — nothing
  downstream could call a working Pages-write endpoint anyway. Also judged not worth the added
  infra (a new n8n deployment on an already memory-constrained VPS) for a low-frequency event.
- **Writing `pages`/`project_pages` rows directly via `psql`** — more viable than expected (the
  `live` service auto-converts `description_html` → Yjs binary on first open if `description_binary`
  is empty, so hand-rolling CRDT state isn't required — see `apps/live/src/extensions/database.ts`),
  but still bypasses Django validation, the activity/version log, and `description_stripped`
  search-text generation, and carries silent schema-drift risk across `APP_RELEASE` bumps with no
  changelog to warn us. Rejected — `psql` access to the Plane DB stays scoped to the one-time
  provisioning it's already used for (§3 of the instructions.md deploy doc), not recurring
  application writes.

Net: specs stay distinguished from tickets by the `spec` label, not by living in a different
resource type — this is the durable, sole automated/agent-facing path. Real Plane Pages exist only
as a manual, human, UI-only step. Don't re-propose webhook/n8n/DB-write automation for this without
a new, concrete driver this entry doesn't already address (e.g. upstream actually shipping a public
Pages API).

## Markdown → description_html gotcha

`description_html` must be actual HTML, not raw markdown — the API silently ignores a plain
`description` field. Acceptance-criteria checklists (`- [ ] ...`) need Tiptap's task-list shape, not
whatever a generic markdown-to-HTML pass produces:
`<ul data-type="taskList"><li data-checked="false"><label><input type="checkbox"><span></span></label><div><p>...</p></div></li></ul>`
(verified by round-tripping a PATCH and reading it back unchanged). A plain markdown converter turns
`- [ ] foo` into a literal bullet reading "[ ] foo" instead of a checkbox — check for that pattern
before trusting a fresh conversion pipeline.

## States

Default states for the TODO project (fetch fresh via
`GET /api/v1/workspaces/blonskyi/projects/{project_id}/states/` if these ever change):

| Name | group | id |
| --- | --- | --- |
| Backlog | backlog | `4529e1eb-b900-4560-b9bc-fd0f90ddcf31` (default for new items) |
| Todo | unstarted | `913f8549-0570-4c21-83ee-402260beaee3` |
| In Progress | started | `871a243d-6f0c-4545-8fca-84d7255cddeb` |
| Done | completed | `cf139297-c96d-4542-8636-20f82d25c4ac` |
| Cancelled | cancelled | `c5eb51da-8d5c-4149-906b-7510e1084bd7` |

## Conventions

- **Create a ticket**: `POST /api/v1/workspaces/blonskyi/projects/{project_id}/work-items/` with
  `{"name": "...", "description_html": "<p>...</p>", "state": "<state-id>", "labels": ["<label-id>"]}`.
  Body content must be HTML, not raw markdown — convert first (e.g. Python's `markdown` package).
- **Read a ticket**: `GET .../work-items/{id}/` for the item, `GET .../work-items/{id}/comments/`
  for its comments. Look up `{id}` by sequence (`TODO-42`) via
  `GET .../work-items/?fields=id,sequence_id` and matching `sequence_id`, or by GitHub number via
  `?external_source=github&external_id=<n>`.
- **List tickets**: `GET .../work-items/?per_page=100` with `cursor` for pagination. Filter
  client-side on `state.group`, `labels`, `assignees` — check current API docs for server-side
  filter query params before assuming one exists.
- **Comment on a ticket**: `POST .../work-items/{id}/comments/` with `{"comment_html": "<p>...</p>"}`.
- **Apply / remove labels**: `PATCH .../work-items/{id}/` with the full desired `labels` array
  (list of label ids — fetch/create labels via `.../project-labels/`).
- **Close**: `PATCH .../work-items/{id}/` with `{"state": "<Done-or-Cancelled-id>"}`.

## When a skill says "publish to the issue tracker"

Create a Plane work item in the TODO project.

## When a skill says "fetch the relevant ticket"

`GET .../work-items/{id}/` plus its comments.

## Wayfinding operations

Used by `/wayfinder`. The **map** is a single work item with **child** work items as tickets,
using Plane's native `parent` field rather than a GitHub-style task-list hack.

- **Map**: a work item labelled `wayfinder:map`, holding the Notes / Decisions-so-far / Fog body.
- **Child ticket**: a work item created with `"parent": "<map-id>"`. Labels: `wayfinder:<type>`
  (`research`/`prototype`/`grilling`/`task`). Once claimed, set `assignees` to the driving dev.
- **Blocking**: `POST .../work-items/{child-id}/relations/` with
  `{"relation_type": "blocked_by", "issues": ["<blocker-id>", ...]}`. Read the live gate via
  `GET .../work-items/{id}/relations/` → `blocked_by` (filter to blockers whose `state.group` is
  not `completed`/`cancelled` — the endpoint returns all blockers regardless of state, unlike
  GitHub's `issue_dependencies_summary` which counted open ones only). A ticket is unblocked when
  every blocker's state group is `completed` or `cancelled`.
- **Frontier query**: list work items with `parent == <map-id>`, drop any whose `blocked_by`
  relations include a not-yet-done item, or that already have an assignee; first in map order
  (`sequence_id`) wins.
- **Claim**: `PATCH .../work-items/{id}/` with `{"assignees": ["<your-plane-user-id>"]}` — the
  session's first write.
- **Resolve**: comment the answer on the ticket, `PATCH` its state to Done, then append a context
  pointer (gist + link) to the map's Decisions-so-far.

## Pull requests as a triage surface

Code review still happens on GitHub (`mykola-blonskyi/todo`) — only tickets/specs moved to Plane.
Use the `gh pr` CLI for all PR operations; PRs no longer share a number space with issues, so a
bare `#42` is unambiguously a PR now.

**PRs as a request surface: no.** _(Set to `yes` if this repo treats external PRs as feature
requests; `/triage` reads this flag.)_

- **Read a PR**: `gh pr view <number> --comments` and `gh pr diff <number>` for the diff.
- **List external PRs for triage**: `gh pr list --state open --json number,title,body,labels,author,authorAssociation,comments` then keep only `authorAssociation` of `CONTRIBUTOR`, `FIRST_TIME_CONTRIBUTOR`, or `NONE` (drop `OWNER`/`MEMBER`/`COLLABORATOR`).
- **Comment / label / close**: `gh pr comment`, `gh pr edit --add-label`/`--remove-label`, `gh pr close`.
