import { useTranslations } from 'next-intl';
import { Badge } from '@ui/components/badge';
import { buttonVariants } from '@ui/components/button';
import { cn } from '@shared/lib/utils';
import { DisconnectGoogleCalendarButton } from './DisconnectGoogleCalendarButton';

interface GoogleCalendarSettingsProps {
  connected: boolean;
  // Connected, but Google no longer honours the grant - the User revoked it
  // from their Google Account (Rule 29). Only a reconnect fixes it, so the
  // section says so instead of showing a plain "Connected" badge.
  needsReconnect?: boolean;
  banner: 'connected' | 'error' | null;
  className?: string;
}

// Connection status + connect/disconnect + the post-OAuth-redirect banner.
// The section heading is left to the layout so it can match its own idiom.
export function GoogleCalendarSettings({
  connected,
  needsReconnect = false,
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
      {!connected ? (
        <ConnectLink label={t('connectButton')} />
      ) : needsReconnect ? (
        <>
          <Badge variant="destructive" className="self-start">
            {t('reconnectNeeded')}
          </Badge>
          <p className="text-sm text-muted-foreground">
            {t('reconnectExplanation')}
          </p>
          <ConnectLink label={t('reconnectButton')} />
          <DisconnectGoogleCalendarButton />
        </>
      ) : (
        <>
          <Badge variant="secondary" className="self-start">
            {t('connected')}
          </Badge>
          <DisconnectGoogleCalendarButton />
        </>
      )}
    </div>
  );
}

// A plain route, not a page - must trigger a real navigation into the OAuth
// redirect chain, not next/link's client-side transition. Reconnecting uses
// the same route as a first connect; `prompt=consent` there is what gets a
// fresh refresh token out of Google (Rule 26).
function ConnectLink({ label }: { label: string }) {
  return (
    // eslint-disable-next-line @next/next/no-html-link-for-pages
    <a
      href="/api/google/calendar/connect"
      className={buttonVariants({ className: 'self-start' })}
    >
      {label}
    </a>
  );
}
