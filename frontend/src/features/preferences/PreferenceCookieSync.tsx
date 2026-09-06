'use client';

import { useEffect } from 'react';
import {
  LAYOUT_COOKIE,
  PALETTE_COOKIE,
  PREFERENCE_COOKIE_MAX_AGE,
  type Appearance,
} from './types';

// Rendered only when the server had to fall back to the User row because
// this browser carried no preference cookies (see preferences/server.ts).
// Writes them so the next request is cookie-only again. Renders nothing.
export function PreferenceCookieSync({ palette, layout }: Appearance) {
  useEffect(() => {
    const attrs = `; path=/; max-age=${PREFERENCE_COOKIE_MAX_AGE}; samesite=lax`;
    document.cookie = `${PALETTE_COOKIE}=${palette}${attrs}`;
    document.cookie = `${LAYOUT_COOKIE}=${layout}${attrs}`;
  }, [palette, layout]);

  return null;
}
