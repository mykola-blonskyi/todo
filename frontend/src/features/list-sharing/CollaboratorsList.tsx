'use client';

import { useTranslations } from 'next-intl';
import { CollaboratorRow } from './CollaboratorRow';
import type { Collaborator } from './types';

interface CollaboratorsListProps {
  listId: string;
  collaborators: Collaborator[];
  isOwner: boolean;
  myUserId: string;
}

// No empty state - a solo-owned list (the common case) shouldn't carry a
// permanent "Collaborators (0)" section, same call as PendingInvites.
export function CollaboratorsList({
  listId,
  collaborators,
  isOwner,
  myUserId,
}: CollaboratorsListProps) {
  const t = useTranslations('Sharing');

  if (collaborators.length === 0) {
    return null;
  }

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-sm font-medium text-muted-foreground">
        {t('collaboratorsTitle')}
      </h2>
      <ul className="flex flex-col gap-2">
        {collaborators.map((collaborator) => (
          <CollaboratorRow
            key={collaborator.id}
            listId={listId}
            collaborator={collaborator}
            isOwnerView={isOwner}
            isSelf={collaborator.id === myUserId}
          />
        ))}
      </ul>
    </section>
  );
}
