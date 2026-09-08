import { headers } from 'next/headers';
import { hubSessionCookie } from '@features/auth/lib/session-cookie';
import type { Identity } from './identity';

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
// proxy already validated (ADR-003). An explicit `identity` is only needed
// from routes the proxy's matcher excludes (e.g.
// /api/google/calendar/callback), which resolve it themselves.
export async function graphqlFetch<T>(
  query: string,
  variables?: Record<string, unknown>,
  identity?: Identity,
): Promise<T> {
  let userId: string | null = identity?.userId ?? null;
  let email: string | null = identity?.email ?? null;
  let cookie: string | null = null;
  if (!identity) {
    const headerList = await headers();
    userId = headerList.get('x-user-id');
    email = headerList.get('x-user-email');
    // Forwarded on to the hub by searchShareCandidates, which needs the
    // caller's own .blonskyi.dev session (TODO-54). Only that cookie is
    // passed through: nothing else here is the hub's to receive, least of
    // all this app's own session state.
    const incomingCookie = headerList.get('cookie');
    cookie = incomingCookie ? hubSessionCookie(incomingCookie) : null;
  }

  const res = await fetch(process.env.BACKEND_URL!, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(userId ? { 'x-user-id': userId } : {}),
      ...(email ? { 'x-user-email': email } : {}),
      ...(cookie ? { cookie } : {}),
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
