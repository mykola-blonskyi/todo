'use client';

import { useTransition } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { usePathname, useRouter } from '@shared/lib/i18n/navigation';
import { locales, type Locale } from '@shared/lib/i18n/config';
import { updateLocaleAction } from './actions';
import { preferenceSelectClassName } from './select-class';

// Unlike the hub's own LocaleSwitcher (which always redirects to a fixed
// page), this navigates to the *same* pathname under the new locale prefix -
// this header is used from deep List pages, where the hub's shortcut would
// lose the User's place.
interface LocaleSwitcherProps {
  className?: string;
}

export function LocaleSwitcher({ className }: LocaleSwitcherProps = {}) {
  const pathname = usePathname();
  const router = useRouter();
  const currentLocale = useLocale();
  const t = useTranslations('LocaleSwitcher');
  const [isPending, startTransition] = useTransition();

  function handleChange(event: React.ChangeEvent<HTMLSelectElement>) {
    const nextLocale = event.target.value as Locale;
    startTransition(() => {
      void updateLocaleAction(nextLocale);
      router.replace(pathname, { locale: nextLocale });
    });
  }

  return (
    <select
      value={currentLocale}
      onChange={handleChange}
      disabled={isPending}
      aria-label={t('label')}
      className={preferenceSelectClassName(className)}
    >
      {locales.map((loc) => (
        <option key={loc} value={loc}>
          {t(loc)}
        </option>
      ))}
    </select>
  );
}
