'use server';

import { graphqlFetch } from '@shared/lib/graphql-client';
import type { Theme } from './types';
import type { Locale } from '@shared/lib/i18n/config';

// Fire-and-forget persistence, matching the hub's own setTheme/setLocale
// pattern - the client-side switch (next-themes / navigation) already
// happened by the time these are called, so a slow or failed persist should
// never block the UI.
export async function updateThemeAction(theme: Theme) {
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
