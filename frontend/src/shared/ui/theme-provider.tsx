'use client';

import * as React from 'react';
import { ThemeProvider as NextThemesProvider } from 'next-themes';
import type { Mode } from '@features/preferences';

interface ThemeProviderProps {
  // What the server resolved for this request: this device's mode cookie,
  // else the User row (preferences/server.ts). next-themes inlines it into
  // its pre-paint script as the fallback for an empty localStorage, which is
  // how a fresh device lands on the persisted mode without a flash.
  mode: Mode;
  children: React.ReactNode;
}

// The app's one next-themes configuration. It lives here rather than in the
// root layout so the wiring has a seam that can be tested, and so the layout
// doesn't have to know how a mode gets applied.
export function ThemeProvider({ mode, children }: ThemeProviderProps) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme={mode}
      enableSystem
      themes={['light', 'dark']}
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}
