import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import createMiddleware from 'next-intl/middleware';
import { routing } from '@shared/lib/i18n/routing';

const intlMiddleware = createMiddleware(routing);

const API_URL = process.env.API_URL!;
const APP_URL = process.env.APP_URL!;
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
  if (
    process.env.NODE_ENV === 'production' ||
    process.env.DEV_BYPASS_AUTH !== 'true'
  ) {
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
    const res = await fetch(
      `${API_URL}/api/auth/validate?project=${PROJECT_SLUG}`,
      {
        headers: { cookie: request.headers.get('cookie') ?? '' },
        cache: 'no-store',
      },
    );

    if (!res.ok) {
      return null;
    }

    const body = (await res.json()) as {
      allowed: boolean;
      userId?: string;
      email?: string;
    };
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

  const locale =
    request.cookies.get('NEXT_LOCALE')?.value ?? routing.defaultLocale;
  const loginUrl = new URL(`${API_URL}/${locale}/login`);
  // Don't use request.url here - behind Coolify/Traefik it resolves to the
  // container's internal bind address (e.g. 0.0.0.0:3000), not the public
  // origin (same gotcha the hub's own post-login/route.ts documents). Combine
  // the actual path/query with our own known-public origin instead.
  const currentUrl = new URL(
    request.nextUrl.pathname + request.nextUrl.search,
    APP_URL,
  );
  loginUrl.searchParams.set('callbackUrl', currentUrl.toString());

  if (!devBypassIdentity()) {
    const token = await getToken({
      req: request,
      secret: AUTH_SECRET,
      // The hub's own auth.ts pins this cookie name unconditionally (no
      // __Secure- prefix, even in production) - must match exactly here.
      cookieName: 'authjs.session-token',
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

  // Mutate the request's own headers before handing off to next-intl's
  // middleware, rather than building a fresh NextResponse afterwards from
  // request.headers - next-intl's middleware carries the locale it resolved
  // forward via a header on the NextResponse *it* constructs internally,
  // which isn't readable back out. Rebuilding a response afterward (the
  // previous approach here) silently dropped that header on every request,
  // so getRequestConfig always fell back to the default locale downstream -
  // confirmed via raw SSR HTML: non-default-locale URLs rendered English
  // content despite the correct NEXT_LOCALE cookie being set (TODO-48).
  // Mutating request.headers here, before intlMiddleware reads them, means
  // next-intl's own header ends up in the same response it returns, and
  // that response (redirect or next()) can just be returned directly - no
  // separate rebuild or manual cookie-copying required.
  request.headers.set('x-user-id', identity.userId);
  request.headers.set('x-user-email', identity.email);

  return intlMiddleware(request);
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|_vercel|.*\\..*).*)'],
};
