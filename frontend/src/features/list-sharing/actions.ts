'use server';

import { revalidatePath } from 'next/cache';
import { graphqlFetch } from '@shared/lib/graphql-client';
import type { ShareCandidate } from './types';

export async function searchShareCandidatesAction(
  listId: string,
  q: string,
): Promise<ShareCandidate[]> {
  if (!q.trim()) {
    return [];
  }

  const data = await graphqlFetch<{
    searchShareCandidates: ShareCandidate[];
  }>(
    `query SearchShareCandidates($listId: ID!, $q: String!) {
      searchShareCandidates(listId: $listId, q: $q) {
        hubUserId
        email
        name
        image
      }
    }`,
    { listId, q },
  );

  return data.searchShareCandidates;
}

export async function inviteToListAction(
  listId: string,
  candidate: ShareCandidate,
) {
  await graphqlFetch(
    `mutation InviteToList($listId: ID!, $candidate: ShareCandidateInput!) {
      inviteToList(listId: $listId, candidate: $candidate) { id }
    }`,
    { listId, candidate },
  );

  revalidatePath('/[locale]/lists/[id]', 'page');
}
