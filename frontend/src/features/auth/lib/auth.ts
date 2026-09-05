import NextAuth from 'next-auth';
import { jwtCallback } from './jwt-callback';
import { SESSION_COOKIE_NAME, SESSION_COOKIE_SECURE } from './session-cookie';

// No database adapter: todolist keeps its own Prisma User shadow table, so
// there's no Auth.js-managed accounts table to link against either
// (docs/decisions.md ADR-016).
export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  providers: [
    {
      // Auth.js mounts this provider at /api/auth/signin/login, which reads
      // like the /[locale]/login page but isn't - proxy.ts's
      // LOGIN_PATH_PATTERN is what keeps the two apart.
      id: 'login',
      name: 'login.blonskyi.dev',
      type: 'oidc',
      issuer: process.env.OIDC_ISSUER!,
      clientId: 'todolist',
      clientSecret: process.env.OIDC_CLIENT_SECRET!,
      checks: ['pkce', 'state'],
      // Maps the ID token's standard claims onto `user` for email/name/image,
      // but NOT for the identity itself: without an adapter Auth.js discards
      // this `id` and assigns `user.id` a fresh random value on every sign-in,
      // so the jwt() callback reads `profile.sub` instead (ADR-016).
      profile(profile) {
        return {
          id: profile.sub as string,
          email: profile.email as string,
          name: profile.name as string,
          image: profile.picture as string,
        };
      },
    },
  ],
  session: {
    strategy: 'jwt',
    // 24h, matching login's own IdP session and refresh-token TTLs. True
    // per-request revocation would need login's RFC 7662 introspection
    // endpoint (its ADR-006, opt-in per client) - deferred, not enabled here.
    maxAge: 60 * 60 * 24,
  },
  cookies: {
    sessionToken: {
      // Pinned explicitly rather than left to Auth.js's automatic `__Secure-`
      // prefixing, whose protocol detection is unreliable behind
      // Coolify/Traefik. No `domain` - host-only, never shared with the hub.
      name: SESSION_COOKIE_NAME,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: SESSION_COOKIE_SECURE,
      },
    },
  },
  callbacks: {
    jwt: jwtCallback,
  },
});
