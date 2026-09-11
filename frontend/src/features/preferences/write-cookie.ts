import { PREFERENCE_COOKIE_MAX_AGE } from './types';

// Client-side only (touches document.cookie). Same attributes the palette /
// layout server actions use, except `httpOnly` - a cookie written from JS
// can never be httpOnly, which is exactly why those actions don't set it
// either (see preferences/actions.ts).
export function writePreferenceCookie(name: string, value: string) {
  const secure = window.location.protocol === 'https:' ? '; secure' : '';
  document.cookie =
    `${name}=${value}; path=/; max-age=${PREFERENCE_COOKIE_MAX_AGE}; samesite=lax` +
    secure;
}
