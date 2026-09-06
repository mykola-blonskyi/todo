'use client';

import { useOptimistic, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { updatePaletteAction } from './actions';
import { palettes, isPalette, paletteClassName, type Palette } from './types';
import { preferenceSelectClassName } from './select-class';

interface PaletteSwitcherProps {
  palette: Palette;
  className?: string;
}

// Swaps the `.theme-*` class on <html> synchronously so the new palette is
// visible on the very next frame, then lets the Server Action write the
// cookie (which is what keeps it across reloads) and the User row.
export function applyPaletteClass(palette: Palette) {
  const root = document.documentElement;
  for (const existing of Array.from(root.classList)) {
    if (existing.startsWith('theme-')) root.classList.remove(existing);
  }
  const next = paletteClassName(palette);
  if (next) root.classList.add(next);
}

export function PaletteSwitcher({ palette, className }: PaletteSwitcherProps) {
  const t = useTranslations('PaletteSwitcher');
  const [isPending, startTransition] = useTransition();
  const [optimistic, setOptimistic] = useOptimistic(palette);

  function handleChange(event: React.ChangeEvent<HTMLSelectElement>) {
    const next = event.target.value;
    if (!isPalette(next)) return;
    applyPaletteClass(next);
    startTransition(async () => {
      setOptimistic(next);
      await updatePaletteAction(next);
    });
  }

  return (
    <select
      value={optimistic}
      onChange={handleChange}
      disabled={isPending}
      aria-label={t('label')}
      className={preferenceSelectClassName(className)}
    >
      {palettes.map((value) => (
        <option key={value} value={value}>
          {t(value)}
        </option>
      ))}
    </select>
  );
}
