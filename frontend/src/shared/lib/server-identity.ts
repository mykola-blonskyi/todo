import { cache } from 'react';
import { headers } from 'next/headers';
import { identityFromRequestLike, type Identity } from './identity';

// Kept in its own module so middleware never pulls `next/headers` in through
// identity.ts.
export const getServerIdentity = cache(async (): Promise<Identity | null> =>
  identityFromRequestLike({ headers: await headers() }),
);
