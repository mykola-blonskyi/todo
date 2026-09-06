import { getAppearance } from '@features/preferences/server';
import { getLayoutViews } from '@/layouts/registry';
import { fetchNavData } from '@/layouts/data';

interface SettingsPageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ googleCalendar?: string }>;
}

export default async function SettingsPage({
  params,
  searchParams,
}: SettingsPageProps) {
  const [{ locale }, { googleCalendar }, nav, appearance] = await Promise.all([
    params,
    searchParams,
    fetchNavData(),
    getAppearance(),
  ]);
  const { SettingsPage: View } = getLayoutViews(appearance.layout);

  const banner =
    googleCalendar === 'connected'
      ? 'connected'
      : googleCalendar === 'error'
        ? 'error'
        : null;

  return (
    <View
      nav={nav}
      locale={locale}
      appearance={appearance}
      googleCalendarBanner={banner}
    />
  );
}
