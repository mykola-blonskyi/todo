import { useTranslations } from 'next-intl';
import { AppearanceSettings } from '@features/preferences';
import { GoogleCalendarSettings } from '@features/google-calendar';
import { AccountSettings } from '@features/auth/components/AccountSettings';
import type { SettingsPageProps } from '../types';
import { TuiHeading } from './Shell';

export function SettingsPage({
  nav,
  locale,
  appearance,
  googleCalendarBanner,
}: SettingsPageProps) {
  const t = useTranslations('Settings');

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <h1 className="font-bold">
        <span className="text-muted-foreground"># </span>
        {t('title').toLowerCase()}
      </h1>
      <section>
        <TuiHeading>{t('appearanceTitle').toLowerCase()}</TuiHeading>
        <AppearanceSettings
          palette={appearance.palette}
          layout={appearance.layout}
          className="mt-1"
          rowClassName="border-b border-dashed py-1.5 last:border-b-0"
          labelClassName="before:mr-2 before:text-muted-foreground before:content-['$']"
        />
      </section>
      <section>
        <TuiHeading>{t('googleCalendarTitle').toLowerCase()}</TuiHeading>
        <GoogleCalendarSettings
          connected={nav.user.googleCalendarConnected}
          needsReconnect={nav.user.googleCalendarNeedsReconnect}
          banner={googleCalendarBanner}
          className="mt-2"
        />
      </section>
      <section>
        <TuiHeading>{t('accountTitle').toLowerCase()}</TuiHeading>
        <AccountSettings
          locale={locale}
          email={nav.user.email}
          name={nav.user.name}
          className="mt-2"
        />
      </section>
    </div>
  );
}
