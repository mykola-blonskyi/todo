'use client';

import { useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { UserRound } from 'lucide-react';
import { Button } from '@ui/components/button';
import { removeTemplateCollaboratorAction } from './actions';
import type { Collaborator } from '@features/list-sharing';

interface TemplateCollaboratorRowProps {
  templateId: string;
  collaborator: Collaborator;
}

// Owner-only view (Rule 12: a ListTemplate has no collaborator role of its
// own, unlike List/ListShare) - so unlike CollaboratorRow there's no "leave"
// branch, only remove.
export function TemplateCollaboratorRow({
  templateId,
  collaborator,
}: TemplateCollaboratorRowProps) {
  const t = useTranslations('ListTemplates');
  const [isPending, startTransition] = useTransition();

  return (
    <li className="flex items-center gap-3 rounded-lg border p-3">
      {collaborator.image ? (
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
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={isPending}
        onClick={() =>
          startTransition(() => {
            void removeTemplateCollaboratorAction(templateId, collaborator.id);
          })
        }
      >
        {t('removeCollaboratorButton')}
      </Button>
    </li>
  );
}
