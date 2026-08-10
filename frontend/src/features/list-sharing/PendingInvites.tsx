'use client';

import { useTranslations } from 'next-intl';
import { PendingInviteRow } from './PendingInviteRow';
import type { PendingInvite } from './types';

interface PendingInvitesProps {
  invites: PendingInvite[];
}

// No empty state - unlike Tasks/Lists, this is a notification-style section
// (Rule 7: pull-based, surfaced next time the invitee opens the app), so it
// simply doesn't render when there's nothing pending.
export function PendingInvites({ invites }: PendingInvitesProps) {
  const t = useTranslations('Sharing');

  if (invites.length === 0) {
    return null;
  }

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-sm font-medium text-muted-foreground">
        {t('pendingInvitesTitle')}
      </h2>
      <ul className="flex flex-col gap-2">
        {invites.map((invite) => (
          <PendingInviteRow key={invite.id} invite={invite} />
        ))}
      </ul>
    </section>
  );
}
