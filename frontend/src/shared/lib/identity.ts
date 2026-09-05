import { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import {
  SESSION_COOKIE_NAME,
  SESSION_COOKIE_SECURE,
} from '@features/auth/lib/session-cookie';

export interface Identity {
  userId: string;
  email: string;
}

const AUTH_SECRET = process.env.AUTH_SECRET!;

// "This app's own sign-in page, for this locale" - shared by proxy.ts and the
// /api/google/calendar/connect route.
export function signInUrl(locale: string): URL {
  return new URL(`/${locale}/login`, process.env.APP_URL!);
}

// Shared by proxy.ts (page requests) and the /api/google/calendar routes,
// which proxy.ts's matcher deliberately excludes. A valid token already
// implies authorization - login only issues one after its approved-status and
// `todolist` client_members checks (docs/decisions.md ADR-016) - so there's no
// separate allow/deny call the way resolveIdentity() used to make.
export async function getIdentity(
  request: NextRequest,
): Promise<Identity | null> {
  const token = await getToken({
    req: request,
    secret: AUTH_SECRET,
    cookieName: SESSION_COOKIE_NAME,
    secureCookie: SESSION_COOKIE_SECURE,
  });

  if (!token?.userId || !token.email) {
    return null;
  }

  return { userId: token.userId, email: token.email };
}
