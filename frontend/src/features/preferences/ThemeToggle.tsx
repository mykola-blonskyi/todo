'use client';

import { useTheme } from 'next-themes';
import { useTranslations } from 'next-intl';
import { updateThemeAction } from './actions';
import { themes, type Theme } from './types';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const t = useTranslations('ThemeSwitcher');

  function handleChange(event: React.ChangeEvent<HTMLSelectElement>) {
    const nextTheme = event.target.value as Theme;
    setTheme(nextTheme); // immediate client-side update, no flash/reload
    void updateThemeAction(nextTheme); // persist in the background
  }

  function label(value: Theme) {
    if (value === 'dark') return t('dark');
    if (value === 'theme-rose') return t('rose');
    return t('light');
  }

  return (
    <select
      value={theme}
      onChange={handleChange}
      aria-label={t('toggleTheme')}
      className="h-9 rounded-md border border-input bg-background px-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      {themes.map((value) => (
        <option key={value} value={value}>
          {label(value)}
        </option>
      ))}
    </select>
  );
}
