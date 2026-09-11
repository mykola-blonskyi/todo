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

  const sections = [
    { id: 'appearance', label: t('appearanceTitle') },
    { id: 'google-calendar', label: t('googleCalendarTitle') },
    { id: 'account', label: t('accountTitle') },
  ];

  return (
    <div className="flex flex-1 flex-col md:flex-row">
      <nav
        aria-label={t('title')}
        className="flex w-full shrink-0 flex-col gap-0.5 border-b p-4 md:w-80 md:border-b-0 md:border-r"
      >
        <h2 className="mb-2 text-sm font-semibold">{t('title')}</h2>
        {sections.map((section) => (
          <a
            key={section.id}
            href={`#${section.id}`}
            className="rounded-md px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
          >
            {section.label}
          </a>
        ))}
      </nav>
      <div className="flex max-w-2xl flex-1 flex-col gap-10 p-6 md:p-8">
        <section id="appearance" className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold">{t('appearanceTitle')}</h2>
          <AppearanceSettings
            palette={appearance.palette}
            layout={appearance.layout}
            rowClassName="border-b last:border-b-0"
          />
        </section>
        <section id="google-calendar" className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold">{t('googleCalendarTitle')}</h2>
          <GoogleCalendarSettings
            connected={nav.user.googleCalendarConnected}
            needsReconnect={nav.user.googleCalendarNeedsReconnect}
            banner={googleCalendarBanner}
          />
        </section>
        <section id="account" className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold">{t('accountTitle')}</h2>
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
