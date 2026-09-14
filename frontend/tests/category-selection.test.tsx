import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithIntl } from './setup/render';
import { CategoryRow } from '@/features/categories/CategoryRow';
import { nav } from './setup/fixtures';
import {
  CategorySelectionBar,
  CategorySelectionCheckbox,
  CategorySelectionProvider,
  CategorySelectionToggle,
} from '@/features/categories/CategorySelection';
import { deleteCategoriesAction } from '@/features/categories/actions';

vi.mock('@/features/categories/actions', () => ({
  deleteCategoriesAction: vi.fn(),
}));

const deleteCategories = vi.mocked(deleteCategoriesAction);

function CategoriesView({
  categories = nav.categories,
}: { categories?: typeof nav.categories } = {}) {
  return (
    <CategorySelectionProvider categories={categories}>
      <CategorySelectionToggle />
      <CategorySelectionBar />
      <ul>
        {categories.map((category) => (
          <li key={category.id}>
            <CategorySelectionCheckbox category={category} />
            {category.name}
          </li>
        ))}
      </ul>
    </CategorySelectionProvider>
  );
}

describe('Category selection', () => {
  beforeEach(() => {
    deleteCategories.mockReset();
    deleteCategories.mockResolvedValue({ succeededIds: [], failedIds: [] });
  });

  it('shows no checkboxes and no bar until selection mode is entered', () => {
    renderWithIntl(<CategoriesView />);

    expect(screen.queryAllByRole('checkbox')).toHaveLength(0);
    expect(
      screen.queryByRole('button', { name: 'Delete' }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Select' })).toBeInTheDocument();
  });

  it('offers a checkbox for every category', async () => {
    const user = userEvent.setup();
    renderWithIntl(<CategoriesView />);

    await user.click(screen.getByRole('button', { name: 'Select' }));

    expect(
      screen.getByRole('checkbox', { name: 'Select Work' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('checkbox', { name: 'Select Home' }),
    ).toBeInTheDocument();
  });

  it('keeps a selected category checkable while it is being renamed', async () => {
    const user = userEvent.setup();
    renderWithIntl(
      <CategorySelectionProvider categories={nav.categories}>
        <CategorySelectionToggle />
        <ul>
          {nav.categories.map((category) => (
            <CategoryRow key={category.id} category={category} />
          ))}
        </ul>
      </CategorySelectionProvider>,
    );

    await user.click(screen.getByRole('button', { name: 'Select' }));
    await user.click(screen.getByRole('checkbox', { name: 'Select Work' }));
    await user.click(screen.getAllByRole('button', { name: 'Edit' })[0]);

    expect(screen.getByDisplayValue('Work')).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Select Work' })).toBeChecked();
    expect(
      screen.getByRole('textbox', { name: 'Rename Work' }),
    ).toBeInTheDocument();
  });

  it('hides the toggle when there are no categories', () => {
    renderWithIntl(<CategoriesView categories={[]} />);

    expect(
      screen.queryByRole('button', { name: 'Select' }),
    ).not.toBeInTheDocument();
  });

  it('counts the selection and select-all covers every category', async () => {
    const user = userEvent.setup();
    renderWithIntl(<CategoriesView />);

    await user.click(screen.getByRole('button', { name: 'Select' }));
    expect(screen.getByText('No categories selected')).toBeInTheDocument();

    await user.click(screen.getByRole('checkbox', { name: 'Select Home' }));
    expect(screen.getByText('1 category selected')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Select all 2' }));
    expect(screen.getByText('2 categories selected')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Clear' }));
    expect(screen.getByText('No categories selected')).toBeInTheDocument();
  });

  it('does not delete anything when the confirm dialog is dismissed', async () => {
    const user = userEvent.setup();
    vi.spyOn(window, 'confirm').mockReturnValueOnce(false);
    renderWithIntl(<CategoriesView />);

    await user.click(screen.getByRole('button', { name: 'Select' }));
    await user.click(screen.getByRole('button', { name: 'Select all 2' }));
    await user.click(screen.getByRole('button', { name: 'Delete' }));

    expect(deleteCategories).not.toHaveBeenCalled();
    vi.restoreAllMocks();
  });

  it('warns in the confirm copy that the lists survive, then deletes', async () => {
    const user = userEvent.setup();
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
    deleteCategories.mockResolvedValue({
      succeededIds: ['c-work', 'c-home'],
      failedIds: [],
    });
    renderWithIntl(<CategoriesView />);

    await user.click(screen.getByRole('button', { name: 'Select' }));
    await user.click(screen.getByRole('button', { name: 'Select all 2' }));
    await user.click(screen.getByRole('button', { name: 'Delete' }));

    expect(confirm).toHaveBeenCalledWith(
      "Delete 2 categories? The lists assigned to them aren't deleted — they just become uncategorized. This can't be undone.",
    );
    expect(deleteCategories).toHaveBeenCalledWith(['c-work', 'c-home']);
    expect(screen.getByRole('button', { name: 'Select' })).toBeInTheDocument();
    vi.restoreAllMocks();
  });

  it('reports a thrown mutation instead of failing silently', async () => {
    const user = userEvent.setup();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    deleteCategories.mockRejectedValue(new Error('network'));
    renderWithIntl(<CategoriesView />);

    await user.click(screen.getByRole('button', { name: 'Select' }));
    await user.click(screen.getByRole('button', { name: 'Select all 2' }));
    await user.click(screen.getByRole('button', { name: 'Delete' }));

    expect(
      await screen.findByText(
        "Couldn't delete the selected categories. Please try again.",
      ),
    ).toBeInTheDocument();
    vi.restoreAllMocks();
  });

  it('reports a partial failure instead of looking like a clean delete', async () => {
    const user = userEvent.setup();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    deleteCategories.mockResolvedValue({
      succeededIds: ['c-work'],
      failedIds: ['c-home'],
    });
    renderWithIntl(<CategoriesView />);

    await user.click(screen.getByRole('button', { name: 'Select' }));
    await user.click(screen.getByRole('button', { name: 'Select all 2' }));
    await user.click(screen.getByRole('button', { name: 'Delete' }));

    expect(
      await screen.findByText(
        "1 category deleted; 1 category couldn't be deleted",
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    vi.restoreAllMocks();
  });

  it('does not carry a failure report into the next selection', async () => {
    const user = userEvent.setup();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    deleteCategories.mockResolvedValue({
      succeededIds: ['c-work'],
      failedIds: ['c-home'],
    });
    renderWithIntl(<CategoriesView />);

    await user.click(screen.getByRole('button', { name: 'Select' }));
    await user.click(screen.getByRole('button', { name: 'Select all 2' }));
    await user.click(screen.getByRole('button', { name: 'Delete' }));
    await screen.findByText(
      "1 category deleted; 1 category couldn't be deleted",
    );

    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    await user.click(screen.getByRole('button', { name: 'Select' }));

    expect(
      screen.queryByText("1 category deleted; 1 category couldn't be deleted"),
    ).not.toBeInTheDocument();
    vi.restoreAllMocks();
  });
});
