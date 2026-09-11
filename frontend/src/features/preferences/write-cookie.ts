'use client';

import { PREFERENCE_COOKIE_MAX_AGE } from './types';

// Client-side twin of preferences/actions.ts's cookieOptions(): same name,
// path, max-age and samesite, so a preference written from the browser and
// one written by a Server Action are the same cookie. `httpOnly` is the one
// attribute that can't match - a cookie written from JS never can be, which
// is why those actions don't set it either. `secure` keys off the actual
// protocol rather than NODE_ENV; the two agree in practice (prod is https,
// local dev is http) and the browser is the honest source here.
export function writePreferenceCookie(name: string, value: string) {
  const secure = window.location.protocol === 'https:' ? '; secure' : '';
  document.cookie =
    `${name}=${value}; path=/; max-age=${PREFERENCE_COOKIE_MAX_AGE}; samesite=lax` +
    secure;
}
