'use client';

import { useEffect } from 'react';
import { LAYOUT_COOKIE, MODE_COOKIE, PALETTE_COOKIE } from './types';
import type { Appearance } from './types';
import { writePreferenceCookie } from './write-cookie';

// Rendered only when the server had to fall back to the User row because
// this browser carried no preference cookies (see preferences/server.ts).
// Writes them so the next request is cookie-only again. Renders nothing.
export function PreferenceCookieSync({ mode, palette, layout }: Appearance) {
  useEffect(() => {
    writePreferenceCookie(MODE_COOKIE, mode);
    writePreferenceCookie(PALETTE_COOKIE, palette);
    writePreferenceCookie(LAYOUT_COOKIE, layout);
  }, [mode, palette, layout]);

  return null;
}
