import { useTranslations } from 'next-intl';
import { AppearanceSettings } from '@features/preferences';
import { GoogleCalendarSettings } from '@features/google-calendar';
import { AccountSettings } from '@features/auth/components/AccountSettings';
import type { SettingsPageProps } from '../types';

export function SettingsPage({
  nav,
  locale,
  appearance,
  googleCalendarBanner,
}: SettingsPageProps) {
  const t = useTranslations('Settings');

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
      <h1 className="text-xl font-extrabold tracking-tight">{t('title')}</h1>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <section className="flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-sm md:row-span-2">
          <h2 className="text-sm font-bold">{t('appearanceTitle')}</h2>
          <AppearanceSettings
            mode={appearance.mode}
            palette={appearance.palette}
            layout={appearance.layout}
            rowClassName="border-b last:border-b-0"
          />
        </section>
        <section className="flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-sm">
          <h2 className="text-sm font-bold">{t('googleCalendarTitle')}</h2>
          <GoogleCalendarSettings
            connected={nav.user.googleCalendarConnected}
            needsReconnect={nav.user.googleCalendarNeedsReconnect}
            banner={googleCalendarBanner}
          />
        </section>
        <section className="flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-sm">
          <h2 className="text-sm font-bold">{t('accountTitle')}</h2>
          <AccountSettings
            locale={locale}
            email={nav.user.email}
            name={nav.user.name}
          />
        </section>
      </div>
    </div>
  );
}
