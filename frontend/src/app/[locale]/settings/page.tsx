import { getTranslations } from 'next-intl/server';
import { Badge } from '@ui/components/badge';
import { buttonVariants } from '@ui/components/button';
import { graphqlFetch } from '@shared/lib/graphql-client';

interface SettingsPageProps {
  searchParams: Promise<{ googleCalendar?: string }>;
}

export default async function SettingsPage({
  searchParams,
}: SettingsPageProps) {
  const t = await getTranslations('Settings');
  const { googleCalendar } = await searchParams;

  const { me } = await graphqlFetch<{
    me: { googleCalendarConnected: boolean };
  }>(`query { me { googleCalendarConnected } }`);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 p-8">
      <h1 className="text-3xl font-semibold tracking-tight">{t('title')}</h1>

      {googleCalendar === 'connected' ? (
        <p className="text-sm text-emerald-600">{t('connectSuccess')}</p>
      ) : null}
      {googleCalendar === 'error' ? (
        <p className="text-sm text-destructive">{t('connectError')}</p>
      ) : null}

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-muted-foreground">
          {t('googleCalendarTitle')}
        </h2>
        {me.googleCalendarConnected ? (
          <Badge variant="secondary" className="self-start">
            {t('connected')}
          </Badge>
        ) : (
          // A plain route, not a page - must trigger a real navigation into
          // the OAuth redirect chain, not next/link's client-side transition.
          // eslint-disable-next-line @next/next/no-html-link-for-pages
          <a
            href="/api/google/calendar/connect"
            className={buttonVariants({ className: 'self-start' })}
          >
            {t('connectButton')}
          </a>
        )}
      </section>
    </div>
  );
}
