import { useTranslations } from 'next-intl';
import { AppearanceSettings } from '@features/preferences';
import { GoogleCalendarSettings } from '@features/google-calendar';
import { AccountSettings } from '@features/auth/components/AccountSettings';
import type { SettingsPageProps } from '../types';
import { Group } from './BackLink';

export function SettingsPage({
  nav,
  locale,
  appearance,
  googleCalendarBanner,
}: SettingsPageProps) {
  const t = useTranslations('Settings');

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-3xl font-extrabold tracking-tight">{t('title')}</h1>
      <Group title={t('appearanceTitle')}>
        <AppearanceSettings
          mode={appearance.mode}
          palette={appearance.palette}
          layout={appearance.layout}
          rowClassName="border-b py-2.5 font-bold last:border-b-0"
        />
      </Group>
      <Group title={t('googleCalendarTitle')}>
        <GoogleCalendarSettings
          connected={nav.user.googleCalendarConnected}
          needsReconnect={nav.user.googleCalendarNeedsReconnect}
          banner={googleCalendarBanner}
        />
      </Group>
      <Group title={t('accountTitle')}>
        <AccountSettings
          locale={locale}
          email={nav.user.email}
          name={nav.user.name}
        />
      </Group>
    </div>
  );
}
