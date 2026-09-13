import { cache } from 'react';
import { cookies, headers } from 'next/headers';
import { graphqlFetch } from '@shared/lib/graphql-client';
import { ANON_OWNER, preferenceOwner, type PreferenceOwner } from './owner';
import {
  DEFAULT_LAYOUT,
  DEFAULT_MODE,
  DEFAULT_PALETTE,
  LAYOUT_COOKIE,
  MODE_COOKIE,
  OWNER_COOKIE,
  PALETTE_COOKIE,
  PREFERENCE_COOKIES,
  UNKNOWN_MODE,
  parseLayout,
  parseMode,
  parsePalette,
  type Appearance,
  type Mode,
} from './types';

export interface ResolvedAppearance extends Appearance {
  // True when at least one value came from the User row rather than a cookie
  // - the client then back-fills the cookies (PreferenceCookieSync) so the
  // next request doesn't pay for the lookup again.
  fromBackend: boolean;
}

export async function currentPreferenceOwner(): Promise<PreferenceOwner> {
  return preferenceOwner((await headers()).get('x-user-id'));
}

// Server Components only. Cookie-first avoids a network hop and a flash.
// Per-request cached so the layout and the page share one call.
export const getAppearance = cache(async (): Promise<ResolvedAppearance> => {
  const cookieStore = await cookies();
  const modeCookie = cookieStore.get(MODE_COOKIE)?.value;
  const paletteCookie = cookieStore.get(PALETTE_COOKIE)?.value;
  const layoutCookie = cookieStore.get(LAYOUT_COOKIE)?.value;
  const stampCookie = cookieStore.get(OWNER_COOKIE)?.value;

  const headerList = await headers();
  const userId = headerList.get('x-user-id');
  const owner = preferenceOwner(userId);

  // A foreign or missing stamp means these cookies are someone else's.
  const trusted =
    stampCookie !== undefined && stampCookie === owner && owner !== ANON_OWNER;

  function defaults(mode: Mode = DEFAULT_MODE): ResolvedAppearance {
    return {
      mode,
      palette: DEFAULT_PALETTE,
      layout: DEFAULT_LAYOUT,
      owner,
      fromBackend: false,
    };
  }

  // Behind `trusted` only: this device's own choice beats the row.
  function fromTrustedCookies(): ResolvedAppearance {
    return {
      mode: parseMode(modeCookie),
      palette: parsePalette(paletteCookie),
      layout: parseLayout(layoutCookie),
      owner,
      fromBackend: false,
    };
  }

  if (
    trusted &&
    modeCookie !== undefined &&
    paletteCookie !== undefined &&
    layoutCookie !== undefined
  ) {
    return fromTrustedCookies();
  }

  // No identity to ask, and a borrowed cookie must not stand in for the row.
  if (userId === null) {
    return defaults(UNKNOWN_MODE);
  }

  try {
    const { me } = await graphqlFetch<{
      me: { theme: string; palette: string; layout: string };
    }>(`query Appearance { me { theme palette layout } }`);
    return {
      mode: parseMode(trusted ? (modeCookie ?? me.theme) : me.theme),
      palette: parsePalette(
        trusted ? (paletteCookie ?? me.palette) : me.palette,
      ),
      layout: parseLayout(trusted ? (layoutCookie ?? me.layout) : me.layout),
      owner,
      fromBackend: true,
    };
  } catch {
    // Never take the page down. Untrusted cookies stay unused even here, or
    // the unreachable row becomes the gap the previous user slips through.
    return trusted ? fromTrustedCookies() : defaults();
  }
});

// A delete only removes a cookie when its path matches the one it was set
// with. Not in actions.ts: every export there is a public endpoint.
export async function clearAppearanceCookies(): Promise<void> {
  const cookieStore = await cookies();
  for (const name of PREFERENCE_COOKIES) {
    cookieStore.delete({ name, path: '/' });
  }
}
