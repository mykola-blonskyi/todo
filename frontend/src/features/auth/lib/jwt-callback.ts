import type { JWT } from 'next-auth/jwt';

declare module 'next-auth/jwt' {
  interface JWT {
    userId?: string;
  }
}

// Split out from auth.ts so it's testable without triggering NextAuth()'s
// own module-scope initialization (which pulls in next/server in a way
// vitest's jsdom environment can't resolve). See the comment on its use in
// auth.ts, and docs/decisions.md ADR-016, for why this must read
// `profile.sub` and never `user.id`.
export function jwtCallback({
  token,
  profile,
}: {
  token: JWT;
  profile?: Record<string, unknown>;
}): JWT {
  if (profile?.sub) {
    token.userId = profile.sub as string;
  }
  return token;
}
