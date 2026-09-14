import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithIntl } from './setup/render';
import { nav } from './setup/fixtures';
import {
  ListSelectionBar,
  ListSelectionCheckbox,
  ListSelectionProvider,
  ListSelectionToggle,
} from '@/features/todos-list/ListSelection';
import { deleteListsAction } from '@/features/todos-list/actions';

vi.mock('@/features/todos-list/actions', () => ({
  deleteListsAction: vi.fn(),
}));

const deleteLists = vi.mocked(deleteListsAction);

function Overview({ lists = nav.lists }: { lists?: typeof nav.lists } = {}) {
  return (
    <ListSelectionProvider lists={lists}>
      <ListSelectionToggle />
      <ListSelectionBar />
      <ul>
        {lists.map((list) => (
          <li key={list.id}>
            <ListSelectionCheckbox list={list} />
            {list.title}
          </li>
        ))}
      </ul>
    </ListSelectionProvider>
  );
}

describe('List selection', () => {
  beforeEach(() => {
    deleteLists.mockReset();
    deleteLists.mockResolvedValue({ succeededIds: [], failedIds: [] });
  });

  it('shows no checkboxes and no bar until selection mode is entered', () => {
    renderWithIntl(<Overview />);

    expect(screen.queryAllByRole('checkbox')).toHaveLength(0);
    expect(
      screen.queryByRole('button', { name: 'Delete' }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Select' })).toBeInTheDocument();
  });

  it('mounts the selection status region before selection mode starts', async () => {
    const user = userEvent.setup();
    renderWithIntl(<Overview />);

    const status = document.querySelector('[role="status"][aria-live]');
    expect(status).not.toBeNull();
    expect(status).toHaveTextContent('');

    await user.click(screen.getByRole('button', { name: 'Select' }));

    // The same node's text changed, rather than a new live region mounting
    // together with its first message - the shape several screen readers
    // fail to announce.
    expect(document.querySelector('[role="status"][aria-live]')).toBe(status);
    expect(status).toHaveTextContent('No lists selected');
  });

  it('offers a checkbox for owned lists only', async () => {
    const user = userEvent.setup();
    renderWithIntl(<Overview />);

    await user.click(screen.getByRole('button', { name: 'Select' }));

    expect(
      screen.getByRole('checkbox', { name: 'Select Launch todo v2' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('checkbox', { name: 'Select Groceries' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('checkbox', { name: 'Select Garage cleanup' }),
    ).not.toBeInTheDocument();
  });

  it('hides the toggle when the user owns none of the visible lists', () => {
    renderWithIntl(
      <Overview lists={nav.lists.filter((list) => !list.isOwner)} />,
    );

    expect(
      screen.queryByRole('button', { name: 'Select' }),
    ).not.toBeInTheDocument();
  });

  it('counts the selection and select-all covers only the selectable lists', async () => {
    const user = userEvent.setup();
    renderWithIntl(<Overview />);

    await user.click(screen.getByRole('button', { name: 'Select' }));
    expect(screen.getByText('No lists selected')).toBeInTheDocument();

    await user.click(
      screen.getByRole('checkbox', { name: 'Select Groceries' }),
    );
    expect(screen.getByText('1 list selected')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Select all 2' }));
    expect(screen.getByText('2 lists selected')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Clear' }));
    expect(screen.getByText('No lists selected')).toBeInTheDocument();
  });

  it('leaves selection mode when the toggle is pressed again', async () => {
    const user = userEvent.setup();
    renderWithIntl(<Overview />);

    await user.click(screen.getByRole('button', { name: 'Select' }));
    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(screen.queryAllByRole('checkbox')).toHaveLength(0);
    expect(screen.getByRole('button', { name: 'Select' })).toBeInTheDocument();
  });

  it('does not delete anything when the confirm dialog is dismissed', async () => {
    const user = userEvent.setup();
    vi.spyOn(window, 'confirm').mockReturnValueOnce(false);
    renderWithIntl(<Overview />);

    await user.click(screen.getByRole('button', { name: 'Select' }));
    await user.click(screen.getByRole('button', { name: 'Select all 2' }));
    await user.click(screen.getByRole('button', { name: 'Delete' }));

    expect(deleteLists).not.toHaveBeenCalled();
    vi.restoreAllMocks();
  });

  it('deletes the selected ids once the confirm dialog is accepted', async () => {
    const user = userEvent.setup();
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
    deleteLists.mockResolvedValue({
      succeededIds: ['l-launch', 'l-groceries'],
      failedIds: [],
    });
    renderWithIntl(<Overview />);

    await user.click(screen.getByRole('button', { name: 'Select' }));
    await user.click(screen.getByRole('button', { name: 'Select all 2' }));
    await user.click(screen.getByRole('button', { name: 'Delete' }));

    expect(confirm).toHaveBeenCalledWith(
      "Delete 2 lists? This can't be undone.",
    );
    expect(deleteLists).toHaveBeenCalledWith(['l-launch', 'l-groceries']);
    expect(screen.getByRole('button', { name: 'Select' })).toBeInTheDocument();
    vi.restoreAllMocks();
  });

  it('reports a thrown mutation instead of failing silently', async () => {
    const user = userEvent.setup();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    deleteLists.mockRejectedValue(new Error('network'));
    renderWithIntl(<Overview />);

    await user.click(screen.getByRole('button', { name: 'Select' }));
    await user.click(screen.getByRole('button', { name: 'Select all 2' }));
    await user.click(screen.getByRole('button', { name: 'Delete' }));

    expect(
      await screen.findByText(
        "Couldn't delete the selected lists. Please try again.",
      ),
    ).toBeInTheDocument();
    vi.restoreAllMocks();
  });

  it('does not carry a failure report into the next selection', async () => {
    const user = userEvent.setup();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    deleteLists.mockResolvedValue({
      succeededIds: ['l-launch'],
      failedIds: ['l-groceries'],
    });
    renderWithIntl(<Overview />);

    await user.click(screen.getByRole('button', { name: 'Select' }));
    await user.click(screen.getByRole('button', { name: 'Select all 2' }));
    await user.click(screen.getByRole('button', { name: 'Delete' }));
    await screen.findByText("1 list deleted; 1 list couldn't be deleted");

    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    await user.click(screen.getByRole('button', { name: 'Select' }));

    expect(
      screen.queryByText("1 list deleted; 1 list couldn't be deleted"),
    ).not.toBeInTheDocument();
    vi.restoreAllMocks();
  });

  it('reports a partial failure instead of looking like a clean delete', async () => {
    const user = userEvent.setup();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    deleteLists.mockResolvedValue({
      succeededIds: ['l-launch'],
      failedIds: ['l-groceries'],
    });
    renderWithIntl(<Overview />);

    await user.click(screen.getByRole('button', { name: 'Select' }));
    await user.click(screen.getByRole('button', { name: 'Select all 2' }));
    await user.click(screen.getByRole('button', { name: 'Delete' }));

    expect(
      await screen.findByText("1 list deleted; 1 list couldn't be deleted"),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    vi.restoreAllMocks();
  });
});
