import { useTranslations } from 'next-intl';
import { AppearanceSettings } from '@features/preferences';
import { GoogleCalendarSettings } from '@features/google-calendar';
import { AccountSettings } from '@features/auth/components/AccountSettings';
import type { SettingsPageProps } from '../types';

// Settings as a two-column ledger: setting · value.
export function SettingsPage({
  nav,
  locale,
  appearance,
  googleCalendarBanner,
}: SettingsPageProps) {
  const t = useTranslations('Settings');

  return (
    <div className="flex flex-col">
      <div className="border-b px-4 py-2">
        <h1 className="font-semibold">{t('title')}</h1>
      </div>
      <div className="max-w-3xl p-4">
        <div className="overflow-hidden rounded-md border bg-card">
          <div className="bg-muted/60 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t('appearanceTitle')}
          </div>
          <AppearanceSettings
            {...appearance}
            className="px-4"
            rowClassName="grid grid-cols-[10rem_1fr] justify-items-start border-b py-2 last:border-b-0"
          />
          <div className="bg-muted/60 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t('googleCalendarTitle')}
          </div>
          <GoogleCalendarSettings
            connected={nav.user.googleCalendarConnected}
            needsReconnect={nav.user.googleCalendarNeedsReconnect}
            banner={googleCalendarBanner}
            className="px-4 py-3"
          />
          <div className="bg-muted/60 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t('accountTitle')}
          </div>
          <AccountSettings
            locale={locale}
            email={nav.user.email}
            name={nav.user.name}
            className="px-4 py-3"
          />
        </div>
      </div>
    </div>
  );
}
