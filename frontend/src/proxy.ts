import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import createMiddleware from 'next-intl/middleware';
import { routing } from '@/lib/i18n/routing';

const intlMiddleware = createMiddleware(routing);

const API_URL = process.env.API_URL!;
const AUTH_SECRET = process.env.AUTH_SECRET!;
const PROJECT_SLUG = process.env.PROJECT_SLUG ?? 'todolist';

interface Identity {
  userId: string;
  email: string;
}

// The `.blonskyi.dev` cookie domain doesn't resolve on localhost, and there's
// no way to reach a real deployed hub from local dev (see the hub's own
// boilerplates/subdomain-app.md "Local dev limitation" note, which explicitly
// suggests mocking the validate call in a local-only branch). Gated on
// non-production + an explicit opt-in env var so it can never accidentally
// activate anywhere real.
function devBypassIdentity(): Identity | null {
  if (process.env.NODE_ENV === 'production' || process.env.DEV_BYPASS_AUTH !== 'true') {
    return null;
  }
  const userId = process.env.DEV_USER_ID;
  const email = process.env.DEV_USER_EMAIL;
  return userId && email ? { userId, email } : null;
}

async function resolveIdentity(request: NextRequest): Promise<Identity | null> {
  const bypass = devBypassIdentity();
  if (bypass) {
    return bypass;
  }

  try {
    const res = await fetch(`${API_URL}/api/auth/validate?project=${PROJECT_SLUG}`, {
      headers: { cookie: request.headers.get('cookie') ?? '' },
      cache: 'no-store',
    });

    if (!res.ok) {
      return null;
    }

    const body = (await res.json()) as { allowed: boolean; userId?: string; email?: string };
    return body.allowed && body.userId && body.email
      ? { userId: body.userId, email: body.email }
      : null;
  } catch {
    return null;
  }
}

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/_vercel') ||
    /\.[^/]+$/.test(pathname)
  ) {
    return NextResponse.next();
  }

  const locale = request.cookies.get('NEXT_LOCALE')?.value ?? routing.defaultLocale;
  const loginUrl = new URL(`${API_URL}/${locale}/login`);
  loginUrl.searchParams.set('callbackUrl', request.url);

  if (!devBypassIdentity()) {
    const token = await getToken({
      req: request,
      secret: AUTH_SECRET,
      cookieName:
        process.env.NODE_ENV === 'production'
          ? '__Secure-authjs.session-token'
          : 'authjs.session-token',
      secureCookie: process.env.NODE_ENV === 'production',
    });

    if (!token) {
      return NextResponse.redirect(loginUrl);
    }
  }

  const identity = await resolveIdentity(request);
  if (!identity) {
    return NextResponse.redirect(loginUrl);
  }

  const intlResponse = intlMiddleware(request);

  // A redirect (locale-prefix correction) never reaches a Server Component -
  // nothing to forward identity into, return it as-is.
  if (!intlResponse.ok) {
    return intlResponse;
  }

  // The documented mechanism for making middleware-derived data visible to
  // Server Components via headers(). Carries over any cookies next-intl's
  // own response set (e.g. NEXT_LOCALE) so that side effect isn't lost.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-user-id', identity.userId);
  requestHeaders.set('x-user-email', identity.email);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  intlResponse.cookies.getAll().forEach((cookie) => {
    response.cookies.set(cookie);
  });

  return response;
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|_vercel|.*\\..*).*)'],
};
