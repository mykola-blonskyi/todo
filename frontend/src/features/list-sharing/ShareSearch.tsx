'use client';

import { useTranslations } from 'next-intl';
import { CandidateSearch } from './CandidateSearch';
import { searchShareCandidatesAction, inviteToListAction } from './actions';

interface ShareSearchProps {
  listId: string;
}

export function ShareSearch({ listId }: ShareSearchProps) {
  const t = useTranslations('Sharing');

  return (
    <CandidateSearch
      inputId="share-search"
      queryKey={['shareCandidates', listId]}
      labels={{
        search: t('searchLabel'),
        placeholder: t('searchPlaceholder'),
        searchError: t('searchError'),
        noResults: (query) => t('noResults', { query }),
        confirmed: (name) => t('invited', { name }),
        selectError: t('inviteError'),
      }}
      search={(query) => searchShareCandidatesAction(listId, query)}
      select={(candidate) => inviteToListAction(listId, candidate)}
    />
  );
}
