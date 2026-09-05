import NextAuth from 'next-auth';
import { jwtCallback } from './jwt-callback';

// No adapter: todolist keeps its own Prisma User shadow table
// (findOrCreateByIdentity, populated from the trusted x-user-id/x-user-email
// headers proxy.ts forwards) - see docs/decisions.md ADR-016. Without an
// adapter there's no Auth.js-managed accounts table to link
// against, so unlike the hub (ADR-024 in its own repo) todolist needs no
// allowDangerousEmailAccountLinking flag either - login.blonskyi.dev is the
// only provider that will ever exist here.
export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  providers: [
    {
      id: 'login',
      name: 'login.blonskyi.dev',
      type: 'oidc',
      issuer: process.env.OIDC_ISSUER!,
      clientId: 'todolist',
      clientSecret: process.env.OIDC_CLIENT_SECRET!,
      checks: ['pkce', 'state'],
      // Maps the ID token's standard claims onto `user` for email/name/image.
      // NOT relied on for the identity value itself, though: verified live
      // against a real login instance that without a database adapter,
      // Auth.js discards whatever `id` a bare inline provider's profile()
      // returns and assigns `user.id` (and therefore the default
      // `token.sub`) a fresh random id on every sign-in instead - it has no
      // adapter-backed user record to treat as canonical. The jwt()
      // callback below reads the stable id from `profile.sub`/
      // `account.providerAccountId` directly instead, never from `user.id`.
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
  },
  cookies: {
    sessionToken: {
      // Pinned to the unprefixed name unconditionally (matching the hub's
      // own auth.ts) so it always matches getIdentity()'s explicit
      // `cookieName` on the read side - Auth.js's own automatic `__Secure-`
      // prefixing depends on protocol detection that's unreliable behind
      // Coolify/Traefik (the same class of gotcha proxy.ts's APP_URL
      // comment documents for request.url). No `domain` set - host-only,
      // unlike the hub's old `.blonskyi.dev`-scoped cookie; todolist's
      // session is never shared with another service.
      name: 'authjs.session-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
  },
  callbacks: {
    jwt: jwtCallback,
  },
  // No session/redirect callbacks: getIdentity() reads the raw token via
  // getToken(), never session(), so no session() callback is needed. No
  // redirect override either - todolist only ever redirects to its own
  // origin (Auth.js's default same-origin check already covers that),
  // unlike the hub, which has to validate arbitrary *.blonskyi.dev targets.
});
