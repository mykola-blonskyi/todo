import { describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from './setup/render';
import {
  archivedList,
  nav,
  navWithArchived,
  listDetail,
  template,
} from './setup/fixtures';
import { ListSelectionProvider } from '@/features/todos-list/ListSelection';
import { CategorySelectionProvider } from '@/features/categories/CategorySelection';
import { layouts } from '@/features/preferences/types';
import { getLayoutViews } from '@/layouts/registry';
import { applyCategoryFilter } from '@/layouts/shared/category-filter';

// Server Actions are `'use server'` modules that reach for next/headers -
// stand them all in so the pages (sync Server Components, renderable under
// RTL) can bind them without a request context.
vi.mock('next-themes', () => ({
  useTheme: () => ({ theme: 'light', setTheme: vi.fn() }),
}));
vi.mock('@/features/todos-list/actions', () => ({
  createListAction: vi.fn(),
  createListInCategoryAction: vi.fn(),
  deleteListsAction: vi.fn(),
}));
vi.mock('@/features/todo-list/actions', () => ({
  renameListAction: vi.fn(),
  updateListDueDateAction: vi.fn(),
  deleteListAction: vi.fn(),
  unarchiveListAction: vi.fn(),
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
  deleteCategoriesAction: vi.fn(),
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

const unfiltered = {
  categoryId: null,
  uncategorizedOnly: false,
  archivedOnly: false,
};
const archiveOnly = { ...unfiltered, archivedOnly: true };

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
      <ListsPage nav={nav} lists={nav.lists} filter={unfiltered} />,
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

  it('lists page dates template-spawned lists, and only those', () => {
    const { ListsPage } = views;
    renderWithProviders(
      <ListsPage nav={nav} lists={nav.lists} filter={unfiltered} />,
    );

    // Groceries is spawned (createdAt 2026-09-04); Garage cleanup is a manual
    // List created 2026-08-20 and must carry no occurrence date.
    expect(
      screen.getAllByText(/Sep 4/).length,
      `${layout}: occurrence date on the spawned list`,
    ).toBeGreaterThan(0);
    expect(
      screen.queryAllByText(/Aug 20/),
      `${layout}: no date on a manually-created list`,
    ).toHaveLength(0);
  });

  // Rule 28. Shell and page are rendered together because each layout hosts
  // the archive filter in its own surface - a chip row for some, the shell's
  // category nav for others.
  it('hides archived lists from the overview and offers the archive filter', () => {
    const { Shell, ListsPage } = views;
    renderWithProviders(
      <Shell locale="en" appearance={appearance} nav={navWithArchived}>
        <ListsPage
          nav={navWithArchived}
          lists={applyCategoryFilter(navWithArchived.lists, unfiltered)}
          filter={unfiltered}
        />
      </Shell>,
    );

    expect(
      screen
        .getAllByRole('link')
        .filter((a) => a.getAttribute('href') === `/lists/${archivedList.id}`),
      `${layout}: archived list hidden by default`,
    ).toHaveLength(0);
    expect(
      screen
        .getAllByRole('link')
        .filter((a) => a.getAttribute('href') === '/?archived=true'),
      `${layout}: archive filter link`,
    ).not.toHaveLength(0);
    expect(
      screen.queryAllByRole('button', { name: 'Restore' }),
      `${layout}: no restore control outside the archive`,
    ).toHaveLength(0);
  });

  it('keeps archived lists out of the detail page rail', () => {
    // The rails reuse the overview's list components, so an unfiltered
    // nav.lists puts every archived Occurrence beside whatever list you open.
    const { ListDetailPage } = views;
    renderWithProviders(
      <ListDetailPage nav={navWithArchived} list={listDetail} />,
    );

    expect(
      screen
        .queryAllByRole('link')
        .filter((a) => a.getAttribute('href') === `/lists/${archivedList.id}`),
      `${layout}: archived list in the rail`,
    ).toHaveLength(0);
    expect(
      screen.queryAllByRole('button', { name: 'Restore' }),
      `${layout}: restore control in the rail`,
    ).toHaveLength(0);
  });

  it('lists the archived list under the archive filter, with a restore control', () => {
    const { ListsPage } = views;
    renderWithProviders(
      <ListsPage
        nav={navWithArchived}
        lists={applyCategoryFilter(navWithArchived.lists, archiveOnly)}
        filter={archiveOnly}
      />,
    );

    expect(
      screen
        .getAllByRole('link')
        .filter((a) => a.getAttribute('href') === `/lists/${archivedList.id}`)
        .length,
      `${layout}: link to the archived list`,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByRole('button', { name: 'Restore' }).length,
      `${layout}: restore control`,
    ).toBeGreaterThan(0);
  });

  it('lists page offers bulk selection for owned lists only', async () => {
    const user = userEvent.setup();
    const { ListsPage } = views;
    renderWithProviders(
      <ListSelectionProvider lists={nav.lists}>
        <ListsPage nav={nav} lists={nav.lists} filter={unfiltered} />
      </ListSelectionProvider>,
    );

    expect(
      screen.queryAllByRole('checkbox'),
      `${layout}: no checkboxes before selection mode`,
    ).toHaveLength(0);

    await user.click(screen.getByRole('button', { name: 'Select' }));

    expect(
      screen.getByRole('checkbox', { name: 'Select Launch todo v2' }),
      `${layout}: checkbox on an owned list`,
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('checkbox', { name: 'Select Garage cleanup' }),
      `${layout}: no checkbox on a list the user doesn't own`,
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Select all 2' }),
      `${layout}: select-all counts only the owned lists`,
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Delete' }),
      `${layout}: bulk delete in the action bar`,
    ).toBeInTheDocument();
  });

  it('list detail page dates a spawned list beside the template badge', () => {
    const { ListDetailPage } = views;
    renderWithProviders(
      <ListDetailPage
        nav={nav}
        list={{ ...listDetail, templateId: 't-weekly' }}
      />,
    );

    const badges = screen.getAllByText(/Generated from a recurring template/);
    expect(badges.length, `${layout}: template badge`).toBeGreaterThan(0);
    expect(badges[0].textContent).toMatch(/Sep 1\b/);
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

  it('categories page offers bulk selection with the count in view', async () => {
    const user = userEvent.setup();
    const { CategoriesPage } = views;
    renderWithProviders(
      <CategorySelectionProvider categories={nav.categories}>
        <CategoriesPage nav={nav} categories={nav.categories} />
      </CategorySelectionProvider>,
    );

    expect(
      screen.queryAllByRole('checkbox'),
      `${layout}: no checkboxes before selection mode`,
    ).toHaveLength(0);

    await user.click(screen.getByRole('button', { name: 'Select' }));

    expect(
      screen.getByRole('checkbox', { name: 'Select Work' }),
      `${layout}: checkbox on the category row`,
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Select all 2' }),
      `${layout}: select-all counts the categories`,
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Clear' }),
      `${layout}: bulk action bar`,
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
