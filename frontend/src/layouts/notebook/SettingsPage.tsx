import { useTranslations } from 'next-intl';
import { AppearanceSettings } from '@features/preferences';
import { GoogleCalendarSettings } from '@features/google-calendar';
import { AccountSettings } from '@features/auth/components/AccountSettings';
import type { SettingsPageProps } from '../types';
import { Spread } from './Spread';

export function SettingsPage({
  nav,
  locale,
  appearance,
  googleCalendarBanner,
}: SettingsPageProps) {
  const t = useTranslations('Settings');

  return (
    <Spread
      left={
        <>
          <h2 className="nb-hand text-4xl font-semibold leading-8">
            {t('appearanceTitle')}
          </h2>
          <AppearanceSettings
            palette={appearance.palette}
            layout={appearance.layout}
            className="mt-6 text-sm"
            rowClassName="min-h-8 border-b border-dotted border-muted-foreground/40 py-1"
          />
        </>
      }
      right={
        <>
          <h2 className="nb-hand text-4xl font-semibold leading-8">
            {t('googleCalendarTitle')}
          </h2>
          <GoogleCalendarSettings
            connected={nav.user.googleCalendarConnected}
            needsReconnect={nav.user.googleCalendarNeedsReconnect}
            banner={googleCalendarBanner}
            className="mt-6 text-sm"
          />
          <h2 className="nb-hand mt-12 text-4xl font-semibold leading-8">
            {t('accountTitle')}
          </h2>
          <AccountSettings
            locale={locale}
            email={nav.user.email}
            name={nav.user.name}
            className="mt-6"
          />
        </>
      }
    />
  );
}
