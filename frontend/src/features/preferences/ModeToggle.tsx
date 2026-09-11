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

// Light / dark / system. next-themes owns the client state (localStorage +
// the `dark` class on <html>); the backend mirror is fire-and-forget, and the
// cookie is what lets the server render the right mode on the next request.
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
    setTheme(next); // immediate client-side update, no flash/reload
    writePreferenceCookie(MODE_COOKIE, next); // so the server renders it too
    void updateThemeAction(next); // persist in the background
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
