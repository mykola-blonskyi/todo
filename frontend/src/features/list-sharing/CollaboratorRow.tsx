'use client';

import { useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { UserRound } from 'lucide-react';
import { Button } from '@ui/components/button';
import { removeCollaboratorAction, leaveListAction } from './actions';
import type { Collaborator } from './types';

interface CollaboratorRowProps {
  listId: string;
  collaborator: Collaborator;
  isOwnerView: boolean;
  isSelf: boolean;
}

export function CollaboratorRow({
  listId,
  collaborator,
  isOwnerView,
  isSelf,
}: CollaboratorRowProps) {
  const t = useTranslations('Sharing');
  const [isPending, startTransition] = useTransition();

  return (
    <li className="flex items-center gap-3 rounded-lg border p-3">
      {collaborator.image ? (
        // next/image requires allowlisting the hub's external avatar host in
        // next.config; out of scope here for a 32px avatar (same call as
        // ShareSearch's candidate rows).
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={collaborator.image}
          alt=""
          className="h-8 w-8 shrink-0 rounded-full"
        />
      ) : (
        <UserRound className="h-8 w-8 shrink-0 rounded-full bg-muted p-1.5 text-muted-foreground" />
      )}
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-sm font-medium">
          {collaborator.name ?? collaborator.email}
        </span>
        {collaborator.name ? (
          <span className="truncate text-xs text-muted-foreground">
            {collaborator.email}
          </span>
        ) : null}
      </span>
      {isOwnerView ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={isPending}
          onClick={() =>
            startTransition(() => {
              void removeCollaboratorAction(listId, collaborator.id);
            })
          }
        >
          {t('removeButton')}
        </Button>
      ) : isSelf ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={isPending}
          onClick={() =>
            startTransition(() => {
              void leaveListAction(listId);
            })
          }
        >
          {t('leaveButton')}
        </Button>
      ) : null}
    </li>
  );
}
