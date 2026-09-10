'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@ui/components/button';
import { disconnectGoogleCalendarAction } from './actions';

export function DisconnectGoogleCalendarButton() {
  const t = useTranslations('Settings');
  const [isPending, startTransition] = useTransition();
  const [failed, setFailed] = useState(false);

  return (
    <div className="flex items-center gap-3">
      <Button
        type="button"
        variant="destructive"
        disabled={isPending}
        onClick={() => {
          if (!window.confirm(t('disconnectConfirm'))) {
            return;
          }
          startTransition(async () => {
            setFailed(false);
            try {
              await disconnectGoogleCalendarAction();
            } catch {
              // Only the request can fail: a refused revocation still
              // reports success (Rule 27).
              setFailed(true);
            }
          });
        }}
      >
        {t('disconnectButton')}
      </Button>
      {failed ? (
        <span className="text-sm text-destructive">{t('disconnectError')}</span>
      ) : null}
    </div>
  );
}
