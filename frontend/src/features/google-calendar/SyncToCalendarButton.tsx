'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@ui/components/button';
import { Link } from '@shared/lib/i18n/navigation';
import { syncListToCalendarAction, type SyncResult } from './actions';

interface SyncToCalendarButtonProps {
  listId: string;
}

export function SyncToCalendarButton({ listId }: SyncToCalendarButtonProps) {
  const t = useTranslations('CalendarSync');
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<SyncResult | null>(null);

  return (
    <div className="flex items-center gap-3">
      <Button
        type="button"
        variant="outline"
        disabled={isPending}
        onClick={() => {
          startTransition(async () => {
            try {
              setResult(await syncListToCalendarAction(listId));
            } catch {
              // Realistic failure modes, not just a fluke - e.g. no due date
              // set yet, or the connection was revoked on Google's side
              // since connecting. Surface it inline rather than crashing.
              setResult('error');
            }
          });
        }}
      >
        {t('syncButton')}
      </Button>
      {result === 'success' ? (
        <span className="text-sm text-muted-foreground">
          {t('syncSuccess')}
        </span>
      ) : null}
      {result === 'reconnect' ? (
        <span className="text-sm text-destructive">
          {t('syncRevoked')}{' '}
          <Link href="/settings" className="underline underline-offset-4">
            {t('syncRevokedLink')}
          </Link>
        </span>
      ) : null}
      {result === 'error' ? (
        <span className="text-sm text-destructive">{t('syncError')}</span>
      ) : null}
    </div>
  );
}
