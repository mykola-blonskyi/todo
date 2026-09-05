import { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

export interface Identity {
  userId: string;
  email: string;
}

const AUTH_SECRET = process.env.AUTH_SECRET!;

// Shared by proxy.ts and the /api/google/calendar/connect route - both
// build "this app's own sign-in page, for this locale" as a redirect
// target. `appUrl` is passed in rather than read from process.env here so
// each caller keeps using its own already-validated env var name.
export function signInUrl(locale: string, appUrl: string): URL {
  return new URL(`/${locale}/login`, appUrl);
}

// Shared by proxy.ts (page requests) and the /api/google/calendar routes
// (which the proxy's matcher deliberately excludes, see proxy.ts) - both
// need to independently decode the caller's own todolist Auth.js JWT.
// A valid token already implies authorization: login.blonskyi.dev only
// issues one after the approved-status + client_members grant checks for
// `todolist` (docs/decisions.md), so there's no separate allow/deny call to
// make here the way resolveIdentity() used to call the hub's /validate.
export async function getIdentity(
  request: NextRequest,
): Promise<Identity | null> {
  const token = await getToken({
    req: request,
    secret: AUTH_SECRET,
    // Must match auth.ts's own cookies.sessionToken.name/secure exactly -
    // see the comment there.
    cookieName: 'authjs.session-token',
    secureCookie: process.env.NODE_ENV === 'production',
  });

  if (!token?.userId || !token.email) {
    return null;
  }

  return { userId: token.userId, email: token.email };
}
