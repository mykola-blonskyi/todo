'use server';

import { revalidatePath } from 'next/cache';
import { graphqlFetch } from '@shared/lib/graphql-client';

// 'reconnect' is the one failure the User can actually fix from here: the
// Google-side grant is gone and only a reconnect brings sync back (Rule 29).
export type SyncResult = 'success' | 'reconnect' | 'error';

export async function syncListToCalendarAction(
  listId: string,
): Promise<SyncResult> {
  try {
    await graphqlFetch<{ syncListToCalendar: boolean }>(
      `mutation SyncListToCalendar($listId: ID!) {
        syncListToCalendar(listId: $listId)
      }`,
      { listId },
    );
  } catch {
    // Sync also fails for mundane reasons (no due date yet), so ask the
    // backend which case this was instead of matching on the message - the
    // same failed call is what flags the connection server-side.
    const { me } = await graphqlFetch<{
      me: { googleCalendarNeedsReconnect: boolean };
    }>(
      `query GoogleCalendarReconnectNeeded {
        me { googleCalendarNeedsReconnect }
      }`,
    );
    return me.googleCalendarNeedsReconnect ? 'reconnect' : 'error';
  }

  revalidatePath('/[locale]/lists/[id]', 'page');
  return 'success';
}

export async function disconnectGoogleCalendarAction(): Promise<void> {
  await graphqlFetch<{ disconnectGoogleCalendar: boolean }>(
    `mutation DisconnectGoogleCalendar {
      disconnectGoogleCalendar
    }`,
  );

  // No success banner needed: Settings re-renders with the Connect button.
  revalidatePath('/[locale]/settings', 'page');
}
