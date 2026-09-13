'use server';

import { cookies } from 'next/headers';
import { clearAppearanceCookies } from '@features/preferences/server';
import { LOCALE_COOKIE } from '@shared/lib/i18n/config';
import { signOut } from './lib/auth';

export async function signOutAction(locale: string) {
  // signOut redirects by throwing; nothing after it runs.
  await clearAppearanceCookies();
  // Owned by next-intl, not the preferences feature, so it's cleared here
  // rather than folded into clearAppearanceCookies.
  (await cookies()).delete({ name: LOCALE_COOKIE, path: '/' });
  // Absolute URL: signOut()'s own host detection resolves to the container's
  // internal bind address behind Coolify/Traefik, the same gotcha proxy.ts
  // documents for request.url.
  await signOut({ redirectTo: `${process.env.APP_URL}/${locale}/login` });
}
