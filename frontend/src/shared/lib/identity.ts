import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import {
  SESSION_COOKIE_NAME,
  SESSION_COOKIE_SECURE,
} from '@features/auth/lib/session-cookie';
import type { Locale } from './i18n/config';

export interface Identity {
  userId: string;
  email: string;
}

const AUTH_SECRET = process.env.AUTH_SECRET!;

// "This app's own sign-in page, for this locale" - shared by proxy.ts and the
// /api/google/calendar/connect route.
//
// Takes a Locale, not a string: this interpolates into a relative URL, and an
// unvalidated NEXT_LOCALE of "/evil.com" made it resolve off-origin. The type
// is what stops a caller passing the raw cookie.
export function signInUrl(locale: Locale): URL {
  return new URL(`/${locale}/login`, process.env.APP_URL!);
}

// The one place a session token becomes an Identity. Shared with
// server-identity.ts, which resolves the same token outside middleware.
export async function identityFromRequestLike(
  req: NextRequest | { headers: Headers },
): Promise<Identity | null> {
  const token = await getToken({
    req,
    secret: AUTH_SECRET,
    cookieName: SESSION_COOKIE_NAME,
    secureCookie: SESSION_COOKIE_SECURE,
  });

  if (!token?.userId || !token.email) {
    return null;
  }

  return { userId: token.userId, email: token.email };
}

// Shared by proxy.ts (page requests) and the /api/google/calendar routes,
// which proxy() skips by path. A valid token already
// implies authorization - login only issues one after its approved-status and
// `todolist` client_members checks (docs/decisions.md ADR-016) - so there's no
// separate allow/deny call the way resolveIdentity() used to make.
export function getIdentity(request: NextRequest): Promise<Identity | null> {
  return identityFromRequestLike(request);
}
