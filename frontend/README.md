# frontend

Next.js app for the todolist UI. Acts as the sole public entry point and BFF — it's the only thing
that talks to the backend's internal GraphQL API (see [docs/decisions.md](../docs/decisions.md)
ADR-003).

**Status**: still the default `create-next-app` scaffold plus test tooling (prettier, Vitest +
React Testing Library, matching the hub's conventions — see ADR-008). No real pages, auth
middleware, or theme yet; see [plans/current.md](../plans/current.md) Phase 3 for what's next.

## Local development

```bash
pnpm --filter frontend dev     # http://localhost:3000
```

## Available commands

```bash
pnpm lint            # ESLint
pnpm format           # Prettier, write
pnpm format:check     # Prettier, check only (CI)
pnpm test             # Vitest (component tests; none exist yet, passWithNoTests)
pnpm build            # production build
pnpm start            # serve production build
```

## Notes

- Pinned to **Tailwind CSS v4** for now (the `create-next-app` default) — planned downgrade to v3
  to reuse the hub's shadcn theme tokens directly, see ADR-007 (not done yet).
- No component tests exist yet — `vitest.config.ts` sets `passWithNoTests: true` until Phase 3
  delivers real client components to test. Async Server Components can't render under React
  Testing Library at all (same finding as the hub's own README) — those get Playwright e2e coverage
  once that's wired up (Phase 7).

See the [repo root README](../README.md) and [docs/](../docs/) for the full architecture and plan.
