'use client';

import { useTranslations } from 'next-intl';
import { CandidateSearch } from '@features/list-sharing/CandidateSearch';
import {
  searchTemplateCandidatesAction,
  addTemplateCollaboratorAction,
} from './actions';

interface TemplateCollaboratorSearchProps {
  templateId: string;
}

export function TemplateCollaboratorSearch({
  templateId,
}: TemplateCollaboratorSearchProps) {
  const t = useTranslations('ListTemplates');

  return (
    <CandidateSearch
      inputId="template-collaborator-search"
      queryKey={['templateCandidates', templateId]}
      labels={{
        search: t('collaboratorSearchLabel'),
        placeholder: t('collaboratorSearchPlaceholder'),
        searchError: t('collaboratorSearchError'),
        noResults: (query) => t('noResults', { query }),
        confirmed: (name) => t('added', { name }),
        selectError: t('addCollaboratorError'),
      }}
      search={(query) => searchTemplateCandidatesAction(templateId, query)}
      select={(candidate) =>
        addTemplateCollaboratorAction(templateId, candidate)
      }
    />
  );
}
