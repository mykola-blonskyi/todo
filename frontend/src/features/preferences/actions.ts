'use server';

import { cookies } from 'next/headers';
import { graphqlFetch } from '@shared/lib/graphql-client';
import type { Locale } from '@shared/lib/i18n/config';
import { currentPreferenceOwner } from './server';
import {
  LAYOUT_COOKIE,
  OWNER_COOKIE,
  PALETTE_COOKIE,
  PREFERENCE_COOKIE_MAX_AGE,
  isLayout,
  isPalette,
  type Layout,
  type Mode,
  type Palette,
} from './types';

// Fire-and-forget persistence, matching the hub's own setTheme/setLocale
// pattern - the client-side switch (next-themes / navigation) already
// happened by the time these are called, so a slow or failed persist should
// never block the UI.
async function persist(description: string, run: Promise<unknown>) {
  try {
    await run;
  } catch (error) {
    console.error(`Could not persist ${description}:`, error);
  }
}

export async function updateThemeAction(theme: Mode) {
  await persist(
    'theme',
    graphqlFetch(
      `mutation UpdateTheme($theme: UserTheme!) { updateTheme(theme: $theme) { id } }`,
      { theme },
    ),
  );
}

export async function updateLocaleAction(locale: Locale) {
  await persist(
    'locale',
    graphqlFetch(
      `mutation UpdateLocale($locale: UserLocale!) { updateLocale(locale: $locale) { id } }`,
      { locale },
    ),
  );
}

// Palette and layout differ from theme/locale: the server renders them
// (the palette class on <html>, the whole shell for layout), so the cookie is
// the source of truth for rendering and is written FIRST - Next.js re-renders
// the current route after a Server Action that set cookies, which is what
// swaps the shell without a full reload. The User row is only the cross-
// device backup (read once when a browser has no cookie yet - see
// features/preferences/server.ts).
//
// Not httpOnly: PreferenceCookieSync and ModeToggle write the same cookies
// from the client (see preferences/write-cookie.ts, which mirrors these
// attributes), and a cookie written from JS can never be httpOnly.
function cookieOptions() {
  return {
    path: '/',
    maxAge: PREFERENCE_COOKIE_MAX_AGE,
    sameSite: 'lax' as const,
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
  };
}

export async function updatePaletteAction(palette: Palette) {
  if (!isPalette(palette)) return;
  const cookieStore = await cookies();
  cookieStore.set(PALETTE_COOKIE, palette, cookieOptions());
  cookieStore.set(
    OWNER_COOKIE,
    await currentPreferenceOwner(),
    cookieOptions(),
  );
  await persist(
    'palette',
    graphqlFetch(
      `mutation UpdatePalette($palette: UserPalette!) { updatePalette(palette: $palette) { id } }`,
      { palette },
    ),
  );
}

export async function updateLayoutAction(layout: Layout) {
  if (!isLayout(layout)) return;
  const cookieStore = await cookies();
  cookieStore.set(LAYOUT_COOKIE, layout, cookieOptions());
  cookieStore.set(
    OWNER_COOKIE,
    await currentPreferenceOwner(),
    cookieOptions(),
  );
  await persist(
    'layout',
    graphqlFetch(
      `mutation UpdateLayout($layout: UserLayout!) { updateLayout(layout: $layout) { id } }`,
      { layout },
    ),
  );
}
