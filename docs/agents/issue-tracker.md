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
