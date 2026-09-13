import { NextRequest, NextResponse } from 'next/server';
import createMiddleware from 'next-intl/middleware';
import { routing } from '@shared/lib/i18n/routing';
import {
  isLocale,
  LOCALE_COOKIE,
  locales,
  parseLocale,
  type Locale,
} from '@shared/lib/i18n/config';
import { getIdentity, signInUrl, type Identity } from '@shared/lib/identity';
import { graphqlFetch } from '@shared/lib/graphql-client';

const intlMiddleware = createMiddleware(routing);

const APP_URL = process.env.APP_URL!;

// Built from the same locale list next-intl's routing config uses, so a
// future locale addition can't silently fall out of sync with this pattern.
// next-intl's localePrefix is 'always', so these pages are always at
// /<locale>/login and /<locale>/privacy.
//
// /privacy is public for the same reason /login is: Google's OAuth consent
// screen links to it as the app's Privacy Policy for the calendar.events
// scope (see docs/decisions.md ADR-004), and Google's review - like any
// visitor reading it before signing in - has to be able to load it logged
// out.
const PUBLIC_PATH_PATTERN = new RegExp(
  `^/(?:${locales.join('|')})/(?:login|privacy)(?:/|$)`,
);

function pathLocale(pathname: string): Locale | null {
  const first = pathname.split('/')[1];
  return isLocale(first) ? first : null;
}

// The path's own locale prefix comes first: on a first-ever visit there is no
// NEXT_LOCALE cookie yet, and falling straight to the default would send
// /uk/lists/42 to /en/login.
function redirectLocale(request: NextRequest): Locale {
  return (
    pathLocale(request.nextUrl.pathname) ??
    parseLocale(request.cookies.get(LOCALE_COOKIE)?.value) ??
    routing.defaultLocale
  );
}

const LOCALE_FETCH_TIMEOUT_MS = 1000;

// Best-effort only: this must never block navigation, so a slow or failing
// backend just falls through to next-intl's own Prio 3/4 resolution instead
// of the stored locale.
async function fetchStoredLocale(identity: Identity): Promise<Locale | null> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new Error('locale lookup timed out')),
      LOCALE_FETCH_TIMEOUT_MS,
    );
  });
  try {
    const { me } = await Promise.race([
      graphqlFetch<{ me: { locale: string } }>(
        `query Locale { me { locale } }`,
        undefined,
        identity,
      ),
      timeout,
    ]);
    return isLocale(me.locale) ? me.locale : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // A dot in the path used to be enough to skip the gate, which also skipped
  // it for a page: /en/lists/foo.bar rendered ungated. localePrefix is
  // 'always', so a real page always carries a locale prefix and a static file
  // never does - that, not the dot alone, is what separates them.
  if (
    pathname === '/api' ||
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/_vercel/') ||
    (pathLocale(pathname) === null && /\.[^/]+$/.test(pathname))
  ) {
    return NextResponse.next();
  }

  // The sign-in page itself must never be gated - otherwise an
  // unauthenticated visit redirects to /login, which redirects to /login,
  // forever. /privacy rides along for the reason above.
  if (PUBLIC_PATH_PATTERN.test(pathname)) {
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

  // Only a prefixless, cookieless request reaches the stored preference:
  // localePrefix is 'always', so every in-app navigation already carries a
  // prefix that wins ahead of this in next-intl's own resolution order. This
  // is the cold path (a bare /, a bookmark), not the hot one.
  if (!pathLocale(pathname) && !request.cookies.has(LOCALE_COOKIE)) {
    const storedLocale = await fetchStoredLocale(identity);
    if (storedLocale) {
      request.cookies.set(LOCALE_COOKIE, storedLocale);
    }
  }

  return intlMiddleware(request);
}

// Only the two pure-asset paths are excluded here; every other skip is
// decided in one place, at the top of proxy(), so the two can't disagree.
export const config = {
  matcher: ['/((?!_next/static|_next/image).*)'],
};
