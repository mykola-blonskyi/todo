'use server';

import { revalidatePath } from 'next/cache';
import { getLocale } from 'next-intl/server';
import { redirect } from '@shared/lib/i18n/navigation';
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

export async function acceptInviteAction(shareId: string) {
  await graphqlFetch(
    `mutation AcceptInvite($shareId: ID!) { acceptInvite(shareId: $shareId) { id } }`,
    { shareId },
  );

  revalidatePath('/[locale]', 'page');
}

export async function declineInviteAction(shareId: string) {
  await graphqlFetch(
    `mutation DeclineInvite($shareId: ID!) { declineInvite(shareId: $shareId) { id } }`,
    { shareId },
  );

  revalidatePath('/[locale]', 'page');
}

export async function removeCollaboratorAction(
  listId: string,
  targetUserId: string,
) {
  await graphqlFetch(
    `mutation RemoveCollaborator($listId: ID!, $targetUserId: ID!) {
      removeCollaborator(listId: $listId, targetUserId: $targetUserId)
    }`,
    { listId, targetUserId },
  );

  revalidatePath('/[locale]/lists/[id]', 'page');
}

export async function leaveListAction(listId: string) {
  await graphqlFetch(
    `mutation LeaveList($listId: ID!) { leaveList(listId: $listId) }`,
    { listId },
  );

  revalidatePath('/[locale]', 'page');
  const locale = await getLocale();
  redirect({ href: '/', locale });
}
