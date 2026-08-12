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

  it('does not show weekday/day-of-month/interval fields by default (daily)', () => {
    renderWithIntl(<TemplateForm onSubmit={vi.fn()} submitLabel="Create" />);

    expect(screen.queryByText('On these days')).not.toBeInTheDocument();
    expect(screen.queryByText('Day of month')).not.toBeInTheDocument();
    expect(screen.queryByText('Interval (days)')).not.toBeInTheDocument();
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

  it('shows the interval field when editing an every-N-days template', () => {
    renderWithIntl(
      <TemplateForm
        onSubmit={vi.fn()}
        submitLabel="Save"
        initialValues={{
          title: 'Watering',
          taskTitles: ['Water plants'],
          recurrenceType: 'everyNDays',
          intervalDays: 3,
          timezone: 'UTC',
        }}
      />,
    );

    expect(screen.getByLabelText('Interval (days)')).toHaveValue(3);
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
      timezone: 'Europe/Kyiv',
    });
  });
});
