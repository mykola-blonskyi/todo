import { headers } from 'next/headers';
import type { Identity } from './hub-identity';

interface GraphQLErrorPayload {
  message: string;
  extensions?: { code?: string };
}

export class GraphQLRequestError extends Error {
  code?: string;

  constructor(errors: GraphQLErrorPayload[]) {
    super(errors[0]?.message ?? 'GraphQL request failed');
    this.code = errors[0]?.extensions?.code;
  }
}

// Server Components/Actions only - forwards the trusted identity headers the
// proxy already validated (ADR-003, the backend is internal-only and never
// re-verifies a JWT itself). An explicit `identity` is only needed from
// routes the proxy's matcher excludes (e.g. /api/google/calendar/callback -
// see proxy.ts), which resolve it themselves instead of relying on
// proxy-injected headers.
export async function graphqlFetch<T>(
  query: string,
  variables?: Record<string, unknown>,
  identity?: Identity,
): Promise<T> {
  let userId: string | null = identity?.userId ?? null;
  let email: string | null = identity?.email ?? null;
  if (!identity) {
    const headerList = await headers();
    userId = headerList.get('x-user-id');
    email = headerList.get('x-user-email');
  }

  const res = await fetch(process.env.BACKEND_URL!, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(userId ? { 'x-user-id': userId } : {}),
      ...(email ? { 'x-user-email': email } : {}),
    },
    body: JSON.stringify({ query, variables }),
    cache: 'no-store',
  });

  const json = (await res.json()) as {
    data: T | null;
    errors?: GraphQLErrorPayload[];
  };

  if (json.errors) {
    throw new GraphQLRequestError(json.errors);
  }

  return json.data as T;
}
