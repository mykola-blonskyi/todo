import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithIntl } from './setup/render';
import { GoogleCalendarSettings } from '@/features/google-calendar/GoogleCalendarSettings';
import { disconnectGoogleCalendarAction } from '@/features/google-calendar/actions';

vi.mock('@/features/google-calendar/actions', () => ({
  disconnectGoogleCalendarAction: vi.fn(),
}));

const disconnectMock = vi.mocked(disconnectGoogleCalendarAction);

describe('GoogleCalendarSettings', () => {
  it('offers Disconnect (and no Connect link) once connected', () => {
    renderWithIntl(<GoogleCalendarSettings connected banner={null} />);

    expect(screen.getByText('Connected')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Disconnect' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: 'Connect Google Calendar' }),
    ).not.toBeInTheDocument();
  });

  it('offers Connect (and no Disconnect button) while not connected', () => {
    renderWithIntl(<GoogleCalendarSettings connected={false} banner={null} />);

    expect(
      screen.getByRole('link', { name: 'Connect Google Calendar' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Disconnect' }),
    ).not.toBeInTheDocument();
  });

  it('asks for a reconnect instead of claiming Connected once the grant is revoked', () => {
    renderWithIntl(
      <GoogleCalendarSettings connected needsReconnect banner={null} />,
    );

    expect(screen.getByText('Reconnect needed')).toBeInTheDocument();
    expect(screen.queryByText('Connected')).not.toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Reconnect Google Calendar' }),
    ).toHaveAttribute('href', '/api/google/calendar/connect');
    // Still connected as far as our own row goes, so disconnecting for good
    // stays available next to the reconnect.
    expect(
      screen.getByRole('button', { name: 'Disconnect' }),
    ).toBeInTheDocument();
  });

  it('does not disconnect when the confirm dialog is dismissed', async () => {
    const user = userEvent.setup();
    disconnectMock.mockResolvedValue(undefined);
    vi.spyOn(window, 'confirm').mockReturnValueOnce(false);

    renderWithIntl(<GoogleCalendarSettings connected banner={null} />);
    await user.click(screen.getByRole('button', { name: 'Disconnect' }));

    expect(disconnectMock).not.toHaveBeenCalled();
    vi.restoreAllMocks();
  });

  it('disconnects when the confirm dialog is accepted', async () => {
    const user = userEvent.setup();
    disconnectMock.mockResolvedValue(undefined);
    vi.spyOn(window, 'confirm').mockReturnValueOnce(true);

    renderWithIntl(<GoogleCalendarSettings connected banner={null} />);
    await user.click(screen.getByRole('button', { name: 'Disconnect' }));

    expect(disconnectMock).toHaveBeenCalled();
    vi.restoreAllMocks();
  });

  it('shows an inline error instead of crashing when disconnecting fails', async () => {
    const user = userEvent.setup();
    disconnectMock.mockRejectedValue(new Error('boom'));
    vi.spyOn(window, 'confirm').mockReturnValueOnce(true);

    renderWithIntl(<GoogleCalendarSettings connected banner={null} />);
    await user.click(screen.getByRole('button', { name: 'Disconnect' }));

    expect(
      await screen.findByText(
        "Couldn't disconnect Google Calendar. Please try again.",
      ),
    ).toBeInTheDocument();
    vi.restoreAllMocks();
  });
});
