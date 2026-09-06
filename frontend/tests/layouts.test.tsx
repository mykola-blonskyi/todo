import { describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import { renderWithProviders } from './setup/render';
import { nav, listDetail, template } from './setup/fixtures';
import { layouts } from '@/features/preferences/types';
import { getLayoutViews } from '@/layouts/registry';

// Server Actions are `'use server'` modules that reach for next/headers -
// stand them all in so the pages (sync Server Components, renderable under
// RTL) can bind them without a request context.
vi.mock('next-themes', () => ({
  useTheme: () => ({ theme: 'light', setTheme: vi.fn() }),
}));
vi.mock('@/features/todos-list/actions', () => ({
  createListAction: vi.fn(),
  createListInCategoryAction: vi.fn(),
}));
vi.mock('@/features/todo-list/actions', () => ({
  renameListAction: vi.fn(),
  updateListDueDateAction: vi.fn(),
  deleteListAction: vi.fn(),
  createTaskAction: vi.fn(),
  toggleTaskDoneAction: vi.fn(),
  updateTaskAction: vi.fn(),
  deleteTaskAction: vi.fn(),
  assignCategoryAction: vi.fn(),
  unassignCategoryAction: vi.fn(),
  moveTaskAction: vi.fn(),
}));
vi.mock('@/features/list-sharing/actions', () => ({
  searchShareCandidatesAction: vi.fn(),
  inviteToListAction: vi.fn(),
  acceptInviteAction: vi.fn(),
  declineInviteAction: vi.fn(),
  removeCollaboratorAction: vi.fn(),
  leaveListAction: vi.fn(),
}));
vi.mock('@/features/comments/actions', () => ({
  addListCommentAction: vi.fn(),
  addTaskCommentAction: vi.fn(),
}));
vi.mock('@/features/categories/actions', () => ({
  createCategoryAction: vi.fn(),
  renameCategoryAction: vi.fn(),
  deleteCategoryAction: vi.fn(),
}));
vi.mock('@/features/list-templates/actions', () => ({
  createListTemplateAction: vi.fn(),
  updateListTemplateAction: vi.fn(),
  pauseListTemplateAction: vi.fn(),
  resumeListTemplateAction: vi.fn(),
  deleteListTemplateAction: vi.fn(),
  searchTemplateCandidatesAction: vi.fn(),
  addTemplateCollaboratorAction: vi.fn(),
  removeTemplateCollaboratorAction: vi.fn(),
}));
vi.mock('@/features/google-calendar/actions', () => ({
  syncListToCalendarAction: vi.fn(),
}));
// Async Server Component (getTranslations) - RTL can't render those; a
// plain button stands in for the sign-out form.
vi.mock('@/features/auth/components/LoginSignOutButton', () => ({
  LoginSignOutButton: () => <button type="button">Sign out</button>,
}));
vi.mock('@/features/auth/actions', () => ({ signOutAction: vi.fn() }));
vi.mock('next-auth/react', () => ({
  getCsrfToken: () => Promise.resolve('csrf'),
}));
vi.mock('@/features/preferences/actions', () => ({
  updateThemeAction: vi.fn(),
  updateLocaleAction: vi.fn(),
  updatePaletteAction: vi.fn(),
  updateLayoutAction: vi.fn(),
}));

const appearance = { palette: 'classic', layout: 'workspace' } as const;

describe.each(layouts)('layout: %s', (layout) => {
  const views = getLayoutViews(layout);

  it('implements every screen', () => {
    for (const key of [
      'Shell',
      'ListsPage',
      'ListDetailPage',
      'TemplatesPage',
      'TemplateFormPage',
      'CategoriesPage',
      'SettingsPage',
      'LoginPage',
    ] as const) {
      expect(typeof views[key]).toBe('function');
    }
  });

  it('lists page links to every list and surfaces the pending invite', () => {
    const { ListsPage } = views;
    renderWithProviders(
      <ListsPage
        nav={nav}
        lists={nav.lists}
        filter={{ categoryId: null, uncategorizedOnly: false }}
      />,
    );

    for (const list of nav.lists) {
      const links = screen
        .getAllByRole('link')
        .filter((a) => a.getAttribute('href') === `/lists/${list.id}`);
      expect(links.length, `${layout}: link to ${list.title}`).toBeGreaterThan(
        0,
      );
    }
    expect(screen.getAllByText('Q4 planning').length).toBeGreaterThan(0);
    expect(
      screen.getAllByRole('button', { name: 'Accept' }).length,
    ).toBeGreaterThan(0);
  });

  it('list detail page shows the tasks, the comment and the sharing controls', () => {
    const { ListDetailPage } = views;
    renderWithProviders(<ListDetailPage nav={nav} list={listDetail} />);

    expect(
      screen.getAllByDisplayValue('Launch todo v2').length,
    ).toBeGreaterThan(0);
    expect(screen.getAllByText('Write release notes').length).toBeGreaterThan(
      0,
    );
    expect(screen.getAllByText('Fix drag-reorder').length).toBeGreaterThan(0);
    expect(screen.getAllByRole('checkbox').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText(/Safari date input looks off/)).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText('Search by name or email'),
    ).toBeInTheDocument();
    expect(
      screen.getAllByRole('button', { name: 'Delete' }).length,
    ).toBeGreaterThan(0);
  });

  it('templates pages render the template and its editor', () => {
    const { TemplatesPage, TemplateFormPage } = views;
    const first = renderWithProviders(
      <TemplatesPage nav={nav} templates={[template]} />,
    );
    expect(
      within(first.container).getAllByText('Weekly review').length,
    ).toBeGreaterThan(0);
    first.unmount();

    renderWithProviders(
      <TemplateFormPage nav={nav} template={template} templates={[template]} />,
    );
    expect(screen.getByDisplayValue('Weekly review')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Clear inbox')).toBeInTheDocument();
  });

  it('categories page renders every category with its edit controls', () => {
    const { CategoriesPage } = views;
    renderWithProviders(
      <CategoriesPage nav={nav} categories={nav.categories} />,
    );

    expect(screen.getAllByText('Work').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Home').length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: 'Edit' })).toHaveLength(2);
    expect(
      screen.getByPlaceholderText('New category name'),
    ).toBeInTheDocument();
  });

  it('settings page exposes layout, palette, mode and language controls', () => {
    const { SettingsPage } = views;
    renderWithProviders(
      <SettingsPage
        nav={nav}
        locale="en"
        appearance={appearance}
        googleCalendarBanner={null}
      />,
    );

    expect(screen.getByRole('combobox', { name: 'Layout' })).toHaveValue(
      'workspace',
    );
    expect(screen.getByRole('combobox', { name: 'Palette' })).toHaveValue(
      'classic',
    );
    expect(screen.getByRole('combobox', { name: 'Mode' })).toBeInTheDocument();
    expect(
      screen.getByRole('combobox', { name: 'Switch language' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Connect Google Calendar' }),
    ).toBeInTheDocument();
  });

  it('login page renders the sign-in form', async () => {
    const { LoginPage } = views;
    renderWithProviders(<LoginPage locale="en" appearance={appearance} />);

    expect(
      await screen.findByRole('button', {
        name: 'Continue to login.blonskyi.dev',
      }),
    ).toBeInTheDocument();
  });
});
