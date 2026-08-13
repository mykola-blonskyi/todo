import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithIntl } from './setup/render';
import { TemplatesList } from '@/features/list-templates/TemplatesList';
import type { ListTemplate } from '@/features/list-templates/types';

vi.mock('@/features/list-templates/actions', () => ({
  pauseListTemplateAction: vi.fn(),
  resumeListTemplateAction: vi.fn(),
  deleteListTemplateAction: vi.fn(),
}));

describe('TemplatesList', () => {
  it('shows an empty state when there are no templates', () => {
    renderWithIntl(<TemplatesList templates={[]} />);

    expect(
      screen.getByText(
        'No templates yet. Create one to start generating recurring lists.',
      ),
    ).toBeInTheDocument();
  });

  it('renders a row per template and a create link', () => {
    const templates: ListTemplate[] = [
      {
        id: 'template-1',
        title: 'Weekly Cleaning',
        taskTitles: ['Vacuum'],
        recurrenceType: 'daily',
        weekDays: [],
        dayOfMonth: null,
        intervalDays: null,
        streakDays: null,
        streakStartDate: null,
        timezone: 'UTC',
        status: 'active',
        collaborators: [],
      },
      {
        id: 'template-2',
        title: 'Monthly Bills',
        taskTitles: ['Pay rent'],
        recurrenceType: 'monthly',
        weekDays: [],
        dayOfMonth: 1,
        intervalDays: null,
        streakDays: null,
        streakStartDate: null,
        timezone: 'UTC',
        status: 'paused',
        collaborators: [],
      },
    ];

    renderWithIntl(<TemplatesList templates={templates} />);

    expect(screen.getByText('Weekly Cleaning')).toBeInTheDocument();
    expect(screen.getByText('Monthly Bills')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'New template' })).toHaveAttribute(
      'href',
      '/templates/new',
    );
  });
});
