import { cache } from 'react';
import { cookies, headers } from 'next/headers';
import { graphqlFetch } from '@shared/lib/graphql-client';
import {
  LAYOUT_COOKIE,
  MODE_COOKIE,
  PALETTE_COOKIE,
  parseLayout,
  parseMode,
  parsePalette,
  type Appearance,
} from './types';

export interface ResolvedAppearance extends Appearance {
  // True when at least one value came from the User row rather than a cookie
  // - the client then back-fills the cookies (PreferenceCookieSync) so the
  // next request doesn't pay for the lookup again.
  fromBackend: boolean;
}

// Server Components only. Cookie first (no network, no flash); the User row
// only when a browser has no cookie yet (fresh device, cleared cookies) AND
// the request is authenticated - the login page has no identity to ask for.
// Per-request cached so the root layout and the page can both call it.
export const getAppearance = cache(async (): Promise<ResolvedAppearance> => {
  const cookieStore = await cookies();
  const modeCookie = cookieStore.get(MODE_COOKIE)?.value;
  const paletteCookie = cookieStore.get(PALETTE_COOKIE)?.value;
  const layoutCookie = cookieStore.get(LAYOUT_COOKIE)?.value;

  function fromCookies(): ResolvedAppearance {
    return {
      mode: parseMode(modeCookie),
      palette: parsePalette(paletteCookie),
      layout: parseLayout(layoutCookie),
      fromBackend: false,
    };
  }

  // Any one cookie missing is enough to ask: a browser that predates the
  // mode cookie carries the other two, and its stored mode is exactly what
  // this lookup is for. One query, then PreferenceCookieSync back-fills all
  // three and the next request is cookie-only again.
  if (
    modeCookie !== undefined &&
    paletteCookie !== undefined &&
    layoutCookie !== undefined
  ) {
    return fromCookies();
  }

  const headerList = await headers();
  if (headerList.get('x-user-id') === null) {
    return fromCookies();
  }

  try {
    const { me } = await graphqlFetch<{
      me: { theme: string; palette: string; layout: string };
    }>(`query Appearance { me { theme palette layout } }`);
    return {
      // A cookie beats the row: it is this device's own explicit choice,
      // and for mode it is what next-themes' localStorage already applied.
      mode: parseMode(modeCookie ?? me.theme),
      palette: parsePalette(paletteCookie ?? me.palette),
      layout: parseLayout(layoutCookie ?? me.layout),
      fromBackend: true,
    };
  } catch {
    // Appearance must never take the page down - fall back to defaults and
    // let the next request try again.
    return fromCookies();
  }
});
