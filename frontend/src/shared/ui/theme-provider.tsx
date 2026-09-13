'use client';

import * as React from 'react';
import { ThemeProvider as NextThemesProvider } from 'next-themes';
import {
  modeStorageKey,
  type Mode,
  type PreferenceOwner,
} from '@features/preferences';

interface ThemeProviderProps {
  // What the server resolved for this request: this device's mode cookie,
  // else the User row (preferences/server.ts). next-themes inlines it into
  // its pre-paint script as the fallback for an empty localStorage, which is
  // how a fresh device lands on the persisted mode without a flash.
  mode: Mode;
  owner: PreferenceOwner;
  children: React.ReactNode;
}

// The app's one next-themes configuration. It lives here rather than in the
// root layout so the wiring has a seam that can be tested, and so the layout
// doesn't have to know how a mode gets applied.
export function ThemeProvider({ mode, owner, children }: ThemeProviderProps) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme={mode}
      enableSystem
      themes={['light', 'dark']}
      disableTransitionOnChange
      // Owner-scoped: the next user reads an empty key, not the previous
      // user's mode, so next-themes falls back to defaultTheme.
      storageKey={modeStorageKey(owner)}
    >
      {children}
    </NextThemesProvider>
  );
}
