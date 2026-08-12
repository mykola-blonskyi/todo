'use client';

import { useTranslations } from 'next-intl';
import { TemplateCollaboratorRow } from './TemplateCollaboratorRow';
import type { Collaborator } from '@features/list-sharing';

interface TemplateCollaboratorsListProps {
  templateId: string;
  collaborators: Collaborator[];
}

// No empty state - same call as CollaboratorsList (list-sharing).
export function TemplateCollaboratorsList({
  templateId,
  collaborators,
}: TemplateCollaboratorsListProps) {
  const t = useTranslations('ListTemplates');

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
          <TemplateCollaboratorRow
            key={collaborator.id}
            templateId={templateId}
            collaborator={collaborator}
          />
        ))}
      </ul>
    </section>
  );
}
