import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithIntl } from './setup/render';
import { TemplateForm } from '@/features/list-templates/TemplateForm';

describe('TemplateForm', () => {
  it('renders the title, checklist, recurrence, and timezone fields', () => {
    renderWithIntl(<TemplateForm onSubmit={vi.fn()} submitLabel="Create" />);

    expect(screen.getByLabelText('Title')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Task title')).toBeInTheDocument();
    expect(screen.getByText('Repeats')).toBeInTheDocument();
    expect(screen.getByLabelText('Timezone')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create' })).toBeInTheDocument();
  });

  it('does not show weekday/day-of-month/streak fields by default (daily)', () => {
    renderWithIntl(<TemplateForm onSubmit={vi.fn()} submitLabel="Create" />);

    expect(screen.queryByText('On these days')).not.toBeInTheDocument();
    expect(screen.queryByText('Day of month')).not.toBeInTheDocument();
    expect(
      screen.queryByText('Rest days between streaks'),
    ).not.toBeInTheDocument();
    expect(screen.queryByText('Days in a row')).not.toBeInTheDocument();
  });

  it('shows the weekday picker when editing a weekly template', () => {
    renderWithIntl(
      <TemplateForm
        onSubmit={vi.fn()}
        submitLabel="Save"
        initialValues={{
          title: 'Weekly Cleaning',
          taskTitles: ['Vacuum'],
          recurrenceType: 'weekly',
          weekDays: [1, 3],
          timezone: 'UTC',
        }}
      />,
    );

    expect(screen.getByText('On these days')).toBeInTheDocument();
    expect(screen.queryByText('Day of month')).not.toBeInTheDocument();
  });

  it('shows the day-of-month field when editing a monthly template', () => {
    renderWithIntl(
      <TemplateForm
        onSubmit={vi.fn()}
        submitLabel="Save"
        initialValues={{
          title: 'Monthly Bills',
          taskTitles: ['Pay rent'],
          recurrenceType: 'monthly',
          dayOfMonth: 15,
          timezone: 'UTC',
        }}
      />,
    );

    expect(screen.getByText('Day of month')).toBeInTheDocument();
  });

  it('shows the streak fields when editing an every-N-days template', () => {
    renderWithIntl(
      <TemplateForm
        onSubmit={vi.fn()}
        submitLabel="Save"
        initialValues={{
          title: 'Watering',
          taskTitles: ['Water plants'],
          recurrenceType: 'everyNDays',
          intervalDays: 3,
          streakDays: 2,
          streakStartDate: '2026-03-10T00:00:00.000Z',
          timezone: 'UTC',
        }}
      />,
    );

    expect(screen.getByLabelText('Rest days between streaks')).toHaveValue(3);
    expect(screen.getByLabelText('Days in a row')).toHaveValue(2);
    expect(screen.getByLabelText('Start date (optional)')).toHaveValue(
      '2026-03-10',
    );
  });

  it('defaults streakDays to 1 and leaves the start date blank for a new every-N-days template', () => {
    renderWithIntl(
      <TemplateForm
        onSubmit={vi.fn()}
        submitLabel="Create"
        initialValues={{
          title: 'Watering',
          taskTitles: ['Water plants'],
          recurrenceType: 'everyNDays',
          intervalDays: 0,
          timezone: 'UTC',
        }}
      />,
    );

    expect(screen.getByLabelText('Days in a row')).toHaveValue(1);
    expect(screen.getByLabelText('Start date (optional)')).toHaveValue('');
  });

  it('adds and removes task title rows', async () => {
    const user = userEvent.setup();
    renderWithIntl(<TemplateForm onSubmit={vi.fn()} submitLabel="Create" />);

    expect(screen.getAllByPlaceholderText('Task title')).toHaveLength(1);

    await user.click(screen.getByRole('button', { name: 'Add task' }));
    expect(screen.getAllByPlaceholderText('Task title')).toHaveLength(2);

    await user.click(screen.getAllByRole('button', { name: 'Remove task' })[0]);
    expect(screen.getAllByPlaceholderText('Task title')).toHaveLength(1);
  });

  it('submits the daily default with the entered title and task', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderWithIntl(<TemplateForm onSubmit={onSubmit} submitLabel="Create" />);

    await user.type(screen.getByLabelText('Title'), 'Weekly Cleaning');
    await user.type(screen.getByPlaceholderText('Task title'), 'Vacuum');
    await user.clear(screen.getByLabelText('Timezone'));
    await user.type(screen.getByLabelText('Timezone'), 'Europe/Kyiv');
    await user.click(screen.getByRole('button', { name: 'Create' }));

    expect(onSubmit).toHaveBeenCalledWith({
      title: 'Weekly Cleaning',
      taskTitles: ['Vacuum'],
      recurrenceType: 'daily',
      weekDays: undefined,
      dayOfMonth: undefined,
      intervalDays: undefined,
      streakDays: undefined,
      streakStartDate: undefined,
      timezone: 'Europe/Kyiv',
    });
  });

  it('submits streakDays/intervalDays/streakStartDate for an every-N-days template', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderWithIntl(
      <TemplateForm
        onSubmit={onSubmit}
        submitLabel="Save"
        initialValues={{
          title: 'Watering',
          taskTitles: ['Water plants'],
          recurrenceType: 'everyNDays',
          intervalDays: 2,
          streakDays: 2,
          timezone: 'UTC',
        }}
      />,
    );

    await user.type(
      screen.getByLabelText('Start date (optional)'),
      '2026-03-10',
    );
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        recurrenceType: 'everyNDays',
        streakDays: 2,
        intervalDays: 2,
        streakStartDate: '2026-03-10',
      }),
    );
  });
  it('keeps each checklist row on its own element when an earlier one is deleted', async () => {
    const user = userEvent.setup();
    renderWithIntl(
      <TemplateForm
        onSubmit={vi.fn()}
        submitLabel="Save"
        initialValues={{
          title: 'Cleaning',
          taskTitles: ['Vacuum', 'Dishes', 'Laundry'],
          recurrenceType: 'daily',
          timezone: 'UTC',
        }}
      />,
    );

    const laundryBefore = screen.getByDisplayValue('Laundry');

    await user.click(screen.getAllByRole('button', { name: 'Remove task' })[0]);

    expect(screen.queryByDisplayValue('Vacuum')).not.toBeInTheDocument();
    expect(screen.getByDisplayValue('Laundry')).toBe(laundryBefore);
  });

  // The backend rejects streakDays or intervalDays below 1, so a form that
  // offers 0 sends a value the server refuses and the user gets the error
  // boundary instead of a field message.
  it('offers no recurrence number the backend would reject', () => {
    renderWithIntl(
      <TemplateForm
        onSubmit={vi.fn()}
        submitLabel="Save"
        initialValues={{
          title: 'Every other day',
          taskTitles: ['Vacuum'],
          recurrenceType: 'everyNDays',
          intervalDays: 2,
          streakDays: 1,
          timezone: 'UTC',
        }}
      />,
    );

    for (const label of ['Days in a row', 'Rest days between streaks']) {
      expect(screen.getByLabelText(label)).toHaveAttribute('min', '1');
    }
  });
});
