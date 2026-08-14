'use server';

import { revalidatePath } from 'next/cache';
import { graphqlFetch } from '@shared/lib/graphql-client';

export async function syncListToCalendarAction(
  listId: string,
): Promise<number> {
  const data = await graphqlFetch<{ syncListToCalendar: number }>(
    `mutation SyncListToCalendar($listId: ID!) {
      syncListToCalendar(listId: $listId)
    }`,
    { listId },
  );

  revalidatePath('/[locale]/lists/[id]', 'page');

  return data.syncListToCalendar;
}
