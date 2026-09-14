import type { Request } from 'express';
import { Identity } from './identity.types';

// Shared by IdentityGuard and the currentUser DataLoader (src/graphql/loaders.ts)
// - both need to parse the same trusted headers, but the loader can't depend on
// the guard having already run (see loaders.ts for why). Returns null instead of
// throwing so each caller picks its own error.
export function parseIdentity(req: Request): Identity | null {
  const identitySub = req.headers['x-user-id'];
  const email = req.headers['x-user-email'];

  if (
    typeof identitySub !== 'string' ||
    !identitySub ||
    typeof email !== 'string' ||
    !email
  ) {
    return null;
  }

  return {
    identitySub,
    email,
    name: decodeHeader(req.headers['x-user-name']),
    image: decodeHeader(req.headers['x-user-image']),
  };
}

// A header value may only carry latin-1, so the frontend percent-encodes these
// two - a name like "Микола" cannot be sent raw.
function decodeHeader(value: string | string[] | undefined) {
  if (typeof value !== 'string' || !value) {
    return undefined;
  }
  try {
    return decodeURIComponent(value);
  } catch {
    return undefined;
  }
}
