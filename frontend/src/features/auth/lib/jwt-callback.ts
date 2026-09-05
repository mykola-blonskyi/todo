import type { JWT } from 'next-auth/jwt';

declare module 'next-auth/jwt' {
  interface JWT {
    userId?: string;
  }
}

// Split out from auth.ts so it's testable without triggering NextAuth()'s own
// module-scope initialization, which vitest's jsdom environment can't resolve.
// Must read `profile.sub`, never `user.id` - see auth.ts and ADR-016.
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
