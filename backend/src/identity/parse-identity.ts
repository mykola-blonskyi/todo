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

  const name = req.headers['x-user-name'];
  const image = req.headers['x-user-image'];

  return {
    identitySub,
    email,
    name: typeof name === 'string' ? name : undefined,
    image: typeof image === 'string' ? image : undefined,
  };
}
