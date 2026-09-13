import type { BrowserContext } from '@playwright/test';
import { encode } from 'next-auth/jwt';
import { preferenceOwner } from '../../frontend/src/features/preferences/owner';
import {
  LAYOUT_COOKIE,
  MODE_COOKIE,
  OWNER_COOKIE,
  PALETTE_COOKIE,
  type Appearance,
} from '../../frontend/src/features/preferences/types';
import { AUTH_SECRET, E2E_USER, SESSION_COOKIE_NAME } from './constants';

export type AppearancePin = Pick<Appearance, 'mode' | 'palette' | 'layout'>;

function appearanceCookie(name: string, value: string) {
  return {
    name,
    value,
    domain: 'localhost',
    path: '/',
    httpOnly: false,
    secure: false,
    sameSite: 'Lax' as const,
  };
}

export async function signIn(
  context: BrowserContext,
  appearance?: AppearancePin,
): Promise<void> {
  const token = await encode({
    token: {
      userId: E2E_USER.identitySub,
      email: E2E_USER.email,
      name: E2E_USER.name,
    },
    secret: AUTH_SECRET,
    // getToken() derives its decryption key from secret + salt and defaults
    // salt to the cookie name - minting with any other salt decrypts to
    // nothing and every request just looks logged out.
    salt: SESSION_COOKIE_NAME,
  });

  await context.addCookies([
    {
      name: SESSION_COOKIE_NAME,
      value: token,
      domain: 'localhost',
      path: '/',
      httpOnly: true,
      secure: false,
      sameSite: 'Lax',
    },
  ]);

  if (!appearance) {
    return;
  }

  // getAppearance() drops the other three cookies unless the owner stamp
  // equals preferenceOwner(x-user-id), and says nothing when it does - the
  // pinned appearance would quietly render as the backend's or the default.
  await context.addCookies([
    appearanceCookie(MODE_COOKIE, appearance.mode),
    appearanceCookie(PALETTE_COOKIE, appearance.palette),
    appearanceCookie(LAYOUT_COOKIE, appearance.layout),
    appearanceCookie(OWNER_COOKIE, preferenceOwner(E2E_USER.identitySub)),
  ]);
}
