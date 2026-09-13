'use client';

import { useEffect } from 'react';
import { useTheme } from 'next-themes';
import {
  LAYOUT_COOKIE,
  MODE_COOKIE,
  OWNER_COOKIE,
  PALETTE_COOKIE,
  isMode,
} from './types';
import type { Appearance } from './types';
import { writePreferenceCookie } from './write-cookie';

// Mode is deliberately absent: it comes from next-themes below, not from the
// server-resolved value the other two axes use.
type PreferenceCookieSyncProps = Pick<
  Appearance,
  'palette' | 'layout' | 'owner'
>;

// Rendered only when the server had to fall back to the User row because
// this browser carried no preference cookies (see preferences/server.ts).
// Writes them so the next request is cookie-only again. Renders nothing.
export function PreferenceCookieSync({
  palette,
  layout,
  owner,
}: PreferenceCookieSyncProps) {
  // Mode is the one axis with a second client-side source of truth: this
  // device's localStorage, which next-themes applies before paint and which
  // beats the row. Back-filling the cookie from the server value would pin
  // the row's mode into a cookie the device then contradicts on every load -
  // so write what next-themes actually resolved instead. `theme` is the
  // stored preference (`system` stays `system`), not the resolved colour,
  // and it is undefined until next-themes has read storage.
  const { theme } = useTheme();

  useEffect(() => {
    if (isMode(theme)) {
      writePreferenceCookie(MODE_COOKIE, theme);
    }
  }, [theme]);

  useEffect(() => {
    writePreferenceCookie(PALETTE_COOKIE, palette);
    writePreferenceCookie(LAYOUT_COOKIE, layout);
    writePreferenceCookie(OWNER_COOKIE, owner);
  }, [palette, layout, owner]);

  return null;
}
