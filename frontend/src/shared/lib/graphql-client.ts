import { headers } from 'next/headers';
import { hubSessionCookie } from '@features/auth/lib/session-cookie';
import type { Identity } from './identity';
import { getServerIdentity } from './server-identity';

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

// "This page is not yours to see", as distinct from "the backend failed".
// Both arrive as a GraphQLRequestError, and treating every one of them as a
// 404 told a user whose backend had restarted that their own list no longer
// existed.
export function isMissing(error: unknown): boolean {
  return (
    error instanceof GraphQLRequestError &&
    (error.code === 'NOT_FOUND' || error.code === 'FORBIDDEN')
  );
}

// Sends the caller's identity to the backend, which trusts it absolutely
// (ADR-003), so this is the trust boundary: the identity must come from the
// signed session and never from a request header a client can set. An
// explicit `identity` is for callers that have already resolved one and have
// no `headers()` of their own - proxy.ts, which runs before a Server
// Component exists, and the /api/google/calendar routes.
export async function graphqlFetch<T>(
  query: string,
  variables?: Record<string, unknown>,
  identity?: Identity,
): Promise<T> {
  const caller = identity ?? (await getServerIdentity());
  const userId = caller?.userId ?? null;
  const email = caller?.email ?? null;
  let cookie: string | null = null;
  if (!identity) {
    // Forwarded on to the hub by searchShareCandidates, which needs the
    // caller's own .blonskyi.dev session (TODO-54). Only that cookie is
    // passed through: nothing else here is the hub's to receive, least of
    // all this app's own session state.
    const incomingCookie = (await headers()).get('cookie');
    cookie = incomingCookie ? hubSessionCookie(incomingCookie) : null;
  }

  const res = await fetch(process.env.BACKEND_URL!, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(userId ? { 'x-user-id': userId } : {}),
      ...(email ? { 'x-user-email': email } : {}),
      // Percent-encoded because a header value may only carry latin-1 and
      // these are real names: undici rejects "Микола" outright.
      ...(caller?.name
        ? { 'x-user-name': encodeURIComponent(caller.name) }
        : {}),
      ...(caller?.image
        ? { 'x-user-image': encodeURIComponent(caller.image) }
        : {}),
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
