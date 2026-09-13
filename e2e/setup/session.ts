import type { BrowserContext } from '@playwright/test';
import { encode } from 'next-auth/jwt';
import { AUTH_SECRET, E2E_USER, SESSION_COOKIE_NAME } from './constants';

export async function signIn(context: BrowserContext): Promise<void> {
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
}
