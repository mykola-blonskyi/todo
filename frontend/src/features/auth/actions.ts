'use server';

import { signOut } from './lib/auth';

export async function signOutAction(locale: string) {
  // Absolute URL: signOut()'s own host detection resolves to the container's
  // internal bind address behind Coolify/Traefik, the same gotcha proxy.ts
  // documents for request.url.
  await signOut({ redirectTo: `${process.env.APP_URL}/${locale}/login` });
}
