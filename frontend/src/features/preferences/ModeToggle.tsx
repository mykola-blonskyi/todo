'use client';

import { useSyncExternalStore } from 'react';
import { useTheme } from 'next-themes';
import { useTranslations } from 'next-intl';
import { updateThemeAction } from './actions';
import { MODE_COOKIE, modes, isMode, type Mode } from './types';
import { writePreferenceCookie } from './write-cookie';
import { preferenceSelectClassName } from './select-class';

interface ModeToggleProps {
  // What the server resolved for this request (cookie, else the User row) -
  // the value to show until next-themes reports what this device has stored.
  mode: Mode;
  className?: string;
}

export function applyMode(mode: Mode, setTheme: (mode: Mode) => void) {
  setTheme(mode);
  writePreferenceCookie(MODE_COOKIE, mode);
  void updateThemeAction(mode);
}

// Light / dark / system.
export function ModeToggle({ mode, className }: ModeToggleProps) {
  const { theme, setTheme } = useTheme();
  const t = useTranslations('ThemeSwitcher');
  // next-themes only knows what this device stored after hydration - render
  // the server's value until then, so server and client markup match and a
  // fresh device doesn't flash the default (TODO-61).
  const mounted = useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false,
  );

  function handleChange(event: React.ChangeEvent<HTMLSelectElement>) {
    const next = event.target.value;
    if (!isMode(next)) return;
    applyMode(next, setTheme);
  }

  const current: Mode = mounted && isMode(theme) ? theme : mode;

  return (
    <select
      value={current}
      onChange={handleChange}
      aria-label={t('toggleTheme')}
      className={preferenceSelectClassName(className)}
    >
      {modes.map((value) => (
        <option key={value} value={value}>
          {t(value)}
        </option>
      ))}
    </select>
  );
}

function subscribeNoop() {
  return () => {};
}
