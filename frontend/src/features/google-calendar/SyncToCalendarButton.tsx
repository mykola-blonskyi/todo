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
  const [result, setResult] = useState<'success' | 'error' | null>(null);

  return (
    <div className="flex items-center gap-3">
      <Button
        type="button"
        variant="outline"
        disabled={isPending}
        onClick={() => {
          startTransition(async () => {
            try {
              await syncListToCalendarAction(listId);
              setResult('success');
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
      {result === 'error' ? (
        <span className="text-sm text-destructive">{t('syncError')}</span>
      ) : null}
    </div>
  );
}
