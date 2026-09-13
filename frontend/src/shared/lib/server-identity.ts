import { cache } from 'react';
import { headers } from 'next/headers';
import { identityFromRequestLike, type Identity } from './identity';

// The caller's identity inside a Server Component or Server Action, read from
// the signed session cookie.
//
// Deliberately NOT the x-user-id/x-user-email request headers proxy.ts used to
// set: a header the proxy does not overwrite is whatever the client sent, and
// the proxy does not run on every route (public pages, and any path its
// matcher skips). Those headers reached the backend, which trusts them
// absolutely (ADR-003), so anyone could act as any user by sending their
// email. Only the session cookie is signed, so only the session cookie can
// carry identity.
//
// Kept in its own module so middleware never pulls `next/headers` in through
// identity.ts.
export const getServerIdentity = cache(async (): Promise<Identity | null> =>
  identityFromRequestLike({ headers: await headers() }),
);
