import { useTranslations } from 'next-intl';
import { Badge } from '@ui/components/badge';
import { buttonVariants } from '@ui/components/button';
import { cn } from '@shared/lib/utils';

interface GoogleCalendarSettingsProps {
  connected: boolean;
  banner: 'connected' | 'error' | null;
  className?: string;
}

// Connection status + connect button + the post-OAuth-redirect banner. The
// section heading is left to the layout so it can match its own idiom.
export function GoogleCalendarSettings({
  connected,
  banner,
  className,
}: GoogleCalendarSettingsProps) {
  const t = useTranslations('Settings');
  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {banner === 'connected' ? (
        <p className="text-sm text-emerald-600">{t('connectSuccess')}</p>
      ) : null}
      {banner === 'error' ? (
        <p className="text-sm text-destructive">{t('connectError')}</p>
      ) : null}
      {connected ? (
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
    </div>
  );
}
