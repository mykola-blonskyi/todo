'use client';

import { useTranslations } from 'next-intl';
import { cn } from '@shared/lib/utils';
import { LayoutSwitcher } from './LayoutSwitcher';
import { PaletteSwitcher } from './PaletteSwitcher';
import { ModeToggle } from './ModeToggle';
import { LocaleSwitcher } from './LocaleSwitcher';
import type { Appearance } from './types';

interface AppearanceSettingsProps extends Appearance {
  className?: string;
  // Row/label styling hook for the layouts - the control set itself is the
  // same everywhere so every shell exposes every preference.
  rowClassName?: string;
  labelClassName?: string;
}

// Layout · Palette · Mode · Language, as labelled rows. Each layout's
// SettingsPage places this inside its own idiom; the header/quick controls
// in the shells use the individual switchers instead.
export function AppearanceSettings({
  mode,
  palette,
  layout,
  className,
  rowClassName,
  labelClassName,
}: AppearanceSettingsProps) {
  const t = useTranslations('Appearance');
  const row = cn('flex items-center justify-between gap-4 py-2', rowClassName);
  const label = cn('text-sm', labelClassName);

  return (
    <div className={cn('flex flex-col', className)}>
      <label className={row}>
        <span className={label}>
          {t('layout')}
          <span className="block text-xs text-muted-foreground">
            {t(`layoutHint.${layout}`)}
          </span>
        </span>
        <LayoutSwitcher layout={layout} />
      </label>
      <label className={row}>
        <span className={label}>{t('palette')}</span>
        <PaletteSwitcher palette={palette} />
      </label>
      <label className={row}>
        <span className={label}>{t('mode')}</span>
        <ModeToggle mode={mode} />
      </label>
      <label className={row}>
        <span className={label}>{t('language')}</span>
        <LocaleSwitcher />
      </label>
    </div>
  );
}
