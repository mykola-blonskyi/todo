'use server';

import { cookies } from 'next/headers';
import { graphqlFetch } from '@shared/lib/graphql-client';
import type { Locale } from '@shared/lib/i18n/config';
import {
  LAYOUT_COOKIE,
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
export async function updateThemeAction(theme: Mode) {
  await graphqlFetch(
    `mutation UpdateTheme($theme: UserTheme!) { updateTheme(theme: $theme) { id } }`,
    { theme },
  );
}

export async function updateLocaleAction(locale: Locale) {
  await graphqlFetch(
    `mutation UpdateLocale($locale: UserLocale!) { updateLocale(locale: $locale) { id } }`,
    { locale },
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
// Not httpOnly: PreferenceCookieSync writes the same cookies from the client
// when it back-fills them from the User row.
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
  await graphqlFetch(
    `mutation UpdatePalette($palette: UserPalette!) { updatePalette(palette: $palette) { id } }`,
    { palette },
  );
}

export async function updateLayoutAction(layout: Layout) {
  if (!isLayout(layout)) return;
  const cookieStore = await cookies();
  cookieStore.set(LAYOUT_COOKIE, layout, cookieOptions());
  await graphqlFetch(
    `mutation UpdateLayout($layout: UserLayout!) { updateLayout(layout: $layout) { id } }`,
    { layout },
  );
}
