import { NextRequest, NextResponse } from 'next/server';
import createMiddleware from 'next-intl/middleware';
import { routing } from '@shared/lib/i18n/routing';
import { locales } from '@shared/lib/i18n/config';
import { getIdentity, signInUrl } from '@shared/lib/identity';

const intlMiddleware = createMiddleware(routing);

const APP_URL = process.env.APP_URL!;

// Built from the same locale list next-intl's routing config uses, so a
// future locale addition can't silently fall out of sync with this pattern.
// next-intl's localePrefix is 'always', so the sign-in page is always
// /<locale>/login.
const LOGIN_PATH_PATTERN = new RegExp(
  `^/(?:${locales.join('|')})/login(?:/|$)`,
);

// The path's own locale prefix comes first: on a first-ever visit there is no
// NEXT_LOCALE cookie yet, and falling straight to the default would send
// /uk/lists/42 to /en/login.
function redirectLocale(request: NextRequest): string {
  const fromPath = request.nextUrl.pathname.split('/')[1];
  if ((locales as readonly string[]).includes(fromPath)) {
    return fromPath;
  }
  return request.cookies.get('NEXT_LOCALE')?.value ?? routing.defaultLocale;
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

  // The sign-in page itself must never be gated - otherwise an
  // unauthenticated visit redirects to /login, which redirects to /login,
  // forever.
  if (LOGIN_PATH_PATTERN.test(pathname)) {
    return intlMiddleware(request);
  }

  const loginUrl = signInUrl(redirectLocale(request));
  // Don't use request.url here - behind Coolify/Traefik it resolves to the
  // container's internal bind address, not the public origin (same gotcha the
  // hub's own post-login/route.ts documents). Combine the actual path/query
  // with our own known-public origin instead.
  const currentUrl = new URL(
    request.nextUrl.pathname + request.nextUrl.search,
    APP_URL,
  );
  loginUrl.searchParams.set('callbackUrl', currentUrl.toString());

  const identity = await getIdentity(request);
  if (!identity) {
    return NextResponse.redirect(loginUrl);
  }

  // Set on the request *before* handing off to next-intl, not on a fresh
  // NextResponse afterwards: next-intl carries the resolved locale on the
  // response it builds internally, so rebuilding one here dropped it and every
  // non-default-locale URL rendered in English (TODO-48).
  request.headers.set('x-user-id', identity.userId);
  request.headers.set('x-user-email', identity.email);

  return intlMiddleware(request);
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|_vercel|.*\\..*).*)'],
};
