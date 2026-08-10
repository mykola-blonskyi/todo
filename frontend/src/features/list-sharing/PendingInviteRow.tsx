'use client';

import { useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@ui/components/button';
import { Card, CardContent } from '@ui/components/card';
import { acceptInviteAction, declineInviteAction } from './actions';
import type { PendingInvite } from './types';

interface PendingInviteRowProps {
  invite: PendingInvite;
}

export function PendingInviteRow({ invite }: PendingInviteRowProps) {
  const t = useTranslations('Sharing');
  const [isPending, startTransition] = useTransition();

  return (
    <li>
      <Card>
        <CardContent className="flex items-center justify-between gap-3 p-4">
          <span className="truncate font-medium">{invite.list.title}</span>
          <div className="flex shrink-0 gap-2">
            <Button
              type="button"
              size="sm"
              disabled={isPending}
              onClick={() =>
                startTransition(() => {
                  void acceptInviteAction(invite.id);
                })
              }
            >
              {t('acceptButton')}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isPending}
              onClick={() =>
                startTransition(() => {
                  void declineInviteAction(invite.id);
                })
              }
            >
              {t('declineButton')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </li>
  );
}
