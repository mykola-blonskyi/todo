import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithIntl } from './setup/render';
import { SyncToCalendarButton } from '@/features/google-calendar/SyncToCalendarButton';
import { syncListToCalendarAction } from '@/features/google-calendar/actions';

vi.mock('@/features/google-calendar/actions', () => ({
  syncListToCalendarAction: vi.fn(),
}));

const syncMock = vi.mocked(syncListToCalendarAction);

describe('SyncToCalendarButton', () => {
  it('calls syncListToCalendarAction with the list id and shows success', async () => {
    const user = userEvent.setup();
    syncMock.mockResolvedValue(undefined);

    renderWithIntl(<SyncToCalendarButton listId="list-1" />);

    expect(
      screen.queryByText('Synced to Google Calendar.'),
    ).not.toBeInTheDocument();

    await user.click(
      screen.getByRole('button', { name: 'Sync to Google Calendar' }),
    );

    expect(syncMock).toHaveBeenCalledWith('list-1');
    expect(
      await screen.findByText('Synced to Google Calendar.'),
    ).toBeInTheDocument();
  });

  it('shows an inline error instead of crashing when the sync fails', async () => {
    const user = userEvent.setup();
    syncMock.mockRejectedValue(new Error('boom'));

    renderWithIntl(<SyncToCalendarButton listId="list-1" />);

    await user.click(
      screen.getByRole('button', { name: 'Sync to Google Calendar' }),
    );

    expect(
      await screen.findByText(
        "Couldn't sync to Google Calendar. Make sure the list has a due date, then try again.",
      ),
    ).toBeInTheDocument();
  });
});
