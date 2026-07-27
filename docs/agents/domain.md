# Domain Docs

How the engineering skills should consume this repo's domain documentation when exploring the
codebase.

## Layout: single-context, non-standard paths

This repo predates the `CONTEXT.md` / `docs/adr/` convention and already has its own established
documentation layout (see the repo's own `CLAUDE.md`, which explicitly forbids duplicate docs). Use
these files instead of looking for `CONTEXT.md` or `docs/adr/` — they don't exist here and shouldn't
be created:

- **Glossary / domain model**: [`knowledge/glossary.md`](../../knowledge/glossary.md) (canonical
  terminology) and [`knowledge/domain-model.md`](../../knowledge/domain-model.md) (entities, fields,
  relationships) — together, these are this repo's `CONTEXT.md` equivalent
- **Business rules**: [`knowledge/business-rules.md`](../../knowledge/business-rules.md) — numbered
  rules, not part of the standard template but load-bearing here
- **ADRs**: [`docs/decisions.md`](../decisions.md) — a single file with all ADRs (`ADR-001`, `ADR-002`,
  …), not a `docs/adr/` directory of one-file-per-decision
- **Architecture overview**: [`docs/architecture.md`](../architecture.md) — components, data flow,
  deployment topology; not part of the standard template but read before touching infra/deploy
- **Phased plan**: [`plans/current.md`](../../plans/current.md) — what's built vs. still open, by
  phase

This is a single bounded context (todolist). The `pnpm-workspace.yaml` at the repo root splits
`backend`/`frontend` as separately *deployable* services (see ADR-003 in `docs/decisions.md`), not
separate domain contexts — it is not a signal for the multi-context (`CONTEXT-MAP.md`) layout.

## Use the glossary's vocabulary

When your output names a domain concept (an issue title, a spec, a test name), use the term as
defined in `knowledge/glossary.md` — e.g. **List** (not "todo list" or "project" — "project" is
reserved for the hub's own registration concept), **Collaborator** (not "member" or "invitee" once
accepted), **ListShare** for the invitation/membership record itself.

If the concept you need isn't in the glossary yet, that's a signal — either you're inventing
language the project doesn't use (reconsider) or there's a real gap (note it for `/domain-modeling`).

## Flag ADR / business-rule conflicts

If your output contradicts an existing ADR in `docs/decisions.md` or a rule in
`knowledge/business-rules.md`, surface it explicitly rather than silently overriding:

> _Contradicts ADR-003 (internal-only backend) — but worth reopening because…_
