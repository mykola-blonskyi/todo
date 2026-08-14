'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@ui/components/button';
import { syncListToCalendarAction } from './actions';

interface SyncToCalendarButtonProps {
  listId: string;
}

export function SyncToCalendarButton({ listId }: SyncToCalendarButtonProps) {
  const t = useTranslations('CalendarSync');
  const [isPending, startTransition] = useTransition();
  const [syncedCount, setSyncedCount] = useState<number | null>(null);
  const [hasError, setHasError] = useState(false);

  return (
    <div className="flex items-center gap-3">
      <Button
        type="button"
        variant="outline"
        disabled={isPending}
        onClick={() => {
          startTransition(async () => {
            try {
              const count = await syncListToCalendarAction(listId);
              setSyncedCount(count);
              setHasError(false);
            } catch {
              // Realistic failure mode, not just a fluke - e.g. the user
              // revoked calendar access on Google's side since connecting,
              // or the refresh token stopped working. Surface it inline
              // rather than letting it crash the whole page.
              setHasError(true);
            }
          });
        }}
      >
        {t('syncButton')}
      </Button>
      {hasError ? (
        <span className="text-sm text-destructive">{t('syncError')}</span>
      ) : syncedCount !== null ? (
        <span className="text-sm text-muted-foreground">
          {t('syncResult', { count: syncedCount })}
        </span>
      ) : null}
    </div>
  );
}
