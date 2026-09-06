'use client';

import { useSyncExternalStore } from 'react';
import { useTheme } from 'next-themes';
import { useTranslations } from 'next-intl';
import { updateThemeAction } from './actions';
import { modes, isMode, type Mode } from './types';
import { preferenceSelectClassName } from './select-class';

interface ModeToggleProps {
  className?: string;
}

// Light / dark / system. next-themes owns the client state (localStorage +
// the `dark` class on <html>); the backend mirror is fire-and-forget.
export function ModeToggle({ className }: ModeToggleProps) {
  const { theme, setTheme } = useTheme();
  const t = useTranslations('ThemeSwitcher');
  // next-themes only knows the stored value after hydration - render the
  // default until then so server and client markup match.
  const mounted = useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false,
  );

  function handleChange(event: React.ChangeEvent<HTMLSelectElement>) {
    const next = event.target.value;
    if (!isMode(next)) return;
    setTheme(next); // immediate client-side update, no flash/reload
    void updateThemeAction(next); // persist in the background
  }

  const current: Mode = mounted && isMode(theme) ? theme : 'light';

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
