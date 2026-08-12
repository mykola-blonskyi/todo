import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithIntl } from './setup/render';
import { TemplateRow } from '@/features/list-templates/TemplateRow';
import {
  pauseListTemplateAction,
  resumeListTemplateAction,
  deleteListTemplateAction,
} from '@/features/list-templates/actions';
import type { ListTemplate } from '@/features/list-templates/types';

vi.mock('@/features/list-templates/actions', () => ({
  pauseListTemplateAction: vi.fn(),
  resumeListTemplateAction: vi.fn(),
  deleteListTemplateAction: vi.fn(),
}));

const activeTemplate: ListTemplate = {
  id: 'template-1',
  title: 'Weekly Cleaning',
  taskTitles: ['Vacuum', 'Dishes'],
  recurrenceType: 'daily',
  weekDays: [],
  dayOfMonth: null,
  intervalDays: null,
  timezone: 'UTC',
  status: 'active',
  collaborators: [],
};

describe('TemplateRow', () => {
  it('renders the title, active status, and a link to the template', () => {
    renderWithIntl(<TemplateRow template={activeTemplate} />);

    expect(screen.getByText('Weekly Cleaning')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByRole('link')).toHaveAttribute(
      'href',
      '/templates/template-1',
    );
  });

  it('shows Pause for an active template and calls pauseListTemplateAction', async () => {
    const user = userEvent.setup();
    renderWithIntl(<TemplateRow template={activeTemplate} />);

    await user.click(screen.getByRole('button', { name: 'Pause' }));

    expect(pauseListTemplateAction).toHaveBeenCalledWith('template-1');
  });

  it('shows Resume for a paused template and calls resumeListTemplateAction', async () => {
    const user = userEvent.setup();
    renderWithIntl(
      <TemplateRow template={{ ...activeTemplate, status: 'paused' }} />,
    );

    expect(screen.getByText('Paused')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Resume' }));

    expect(resumeListTemplateAction).toHaveBeenCalledWith('template-1');
  });

  it('deletes only after the confirm dialog is accepted', async () => {
    const user = userEvent.setup();
    vi.spyOn(window, 'confirm').mockReturnValueOnce(false);
    renderWithIntl(<TemplateRow template={activeTemplate} />);

    await user.click(screen.getByRole('button', { name: 'Delete' }));
    expect(deleteListTemplateAction).not.toHaveBeenCalled();

    vi.spyOn(window, 'confirm').mockReturnValueOnce(true);
    await user.click(screen.getByRole('button', { name: 'Delete' }));
    expect(deleteListTemplateAction).toHaveBeenCalledWith('template-1');

    vi.restoreAllMocks();
  });
});
