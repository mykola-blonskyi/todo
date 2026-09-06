import { cache } from 'react';
import { cookies, headers } from 'next/headers';
import { graphqlFetch } from '@shared/lib/graphql-client';
import {
  LAYOUT_COOKIE,
  PALETTE_COOKIE,
  parseLayout,
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
  const paletteCookie = cookieStore.get(PALETTE_COOKIE)?.value;
  const layoutCookie = cookieStore.get(LAYOUT_COOKIE)?.value;

  if (paletteCookie !== undefined && layoutCookie !== undefined) {
    return {
      palette: parsePalette(paletteCookie),
      layout: parseLayout(layoutCookie),
      fromBackend: false,
    };
  }

  const headerList = await headers();
  if (headerList.get('x-user-id') === null) {
    return {
      palette: parsePalette(paletteCookie),
      layout: parseLayout(layoutCookie),
      fromBackend: false,
    };
  }

  try {
    const { me } = await graphqlFetch<{
      me: { palette: string; layout: string };
    }>(`query Appearance { me { palette layout } }`);
    return {
      palette: parsePalette(paletteCookie ?? me.palette),
      layout: parseLayout(layoutCookie ?? me.layout),
      fromBackend: true,
    };
  } catch {
    // Appearance must never take the page down - fall back to defaults and
    // let the next request try again.
    return {
      palette: parsePalette(paletteCookie),
      layout: parseLayout(layoutCookie),
      fromBackend: false,
    };
  }
});
