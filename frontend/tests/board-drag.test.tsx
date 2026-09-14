import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithIntl } from './setup/render';
import { nav } from './setup/fixtures';
import { BoardColumns } from '@/layouts/board/BoardColumns';
import {
  boardDragReducer,
  draggedMove,
  idleDrag,
  type BoardDrag,
} from '@/layouts/board/board-drag';
import {
  assignCategoryAction,
  unassignCategoryAction,
} from '@/features/todo-list/actions';

vi.mock('@/features/todo-list/actions', () => ({
  assignCategoryAction: vi.fn(),
  unassignCategoryAction: vi.fn(),
}));

const assignCategory = vi.mocked(assignCategoryAction);
const unassignCategory = vi.mocked(unassignCategoryAction);

const COLUMN_WIDTH = 100;

function renderBoard() {
  renderWithIntl(
    <BoardColumns categories={nav.categories} lists={nav.lists} />,
  );

  const sections = Array.from(
    document.querySelectorAll<HTMLElement>('[data-column-key]'),
  );
  document.elementFromPoint = (x: number) =>
    sections[Math.floor(x / COLUMN_WIDTH)]?.querySelector('header') ?? null;
}

// The x of a point inside the nth column, matching the elementFromPoint stub.
function columnX(index: number) {
  return index * COLUMN_WIDTH + COLUMN_WIDTH / 2;
}

function grip(title: string) {
  return screen.getByRole('button', { name: `Move ${title}` });
}

function touchDrag(title: string, from: number, to: number) {
  const handle = grip(title);
  fireEvent.pointerDown(handle, {
    pointerId: 1,
    pointerType: 'touch',
    clientX: columnX(from),
    clientY: 20,
  });
  fireEvent.pointerMove(handle, {
    pointerId: 1,
    pointerType: 'touch',
    clientX: columnX(to),
    clientY: 20,
  });
  fireEvent.pointerUp(handle, {
    pointerId: 1,
    pointerType: 'touch',
    clientX: columnX(to),
    clientY: 20,
  });
}

function stubDataTransfer() {
  const data: Record<string, string> = {};
  return {
    effectAllowed: '',
    setData: (type: string, value: string) => {
      data[type] = value;
    },
    getData: (type: string) => data[type] ?? '',
  };
}

describe('board drag reducer', () => {
  const pointerDrag: BoardDrag = {
    mode: 'pointer',
    listId: 'l-launch',
    fromKey: 'c-work',
    overKey: 'c-work',
    x: 10,
    y: 20,
  };
  const keyboardDrag: BoardDrag = {
    mode: 'keyboard',
    listId: 'l-launch',
    fromKey: 'c-work',
    overKey: 'c-work',
  };
  const columnKeys = ['c-work', 'c-home', '__uncategorized__'];

  it('grabs a card at the pointer, starting over its own column', () => {
    expect(
      boardDragReducer(idleDrag, {
        type: 'grab',
        listId: 'l-launch',
        fromKey: 'c-work',
        x: 10,
        y: 20,
      }),
    ).toEqual(pointerDrag);
  });

  it('tracks the pointer and the column under it', () => {
    expect(
      boardDragReducer(pointerDrag, {
        type: 'move',
        x: 30,
        y: 40,
        overKey: 'c-home',
      }),
    ).toEqual({ ...pointerDrag, overKey: 'c-home', x: 30, y: 40 });
  });

  it('keeps the last column when a move hits none', () => {
    const over = { ...pointerDrag, overKey: 'c-home' };

    expect(
      boardDragReducer(over, { type: 'move', x: 30, y: 40, overKey: null }),
    ).toEqual({ ...over, x: 30, y: 40 });
  });

  it('ignores a move with no drag in flight', () => {
    expect(
      boardDragReducer(idleDrag, {
        type: 'move',
        x: 30,
        y: 40,
        overKey: 'c-home',
      }),
    ).toBe(idleDrag);
  });

  it('picks a card up for the keyboard', () => {
    expect(
      boardDragReducer(idleDrag, {
        type: 'pick',
        listId: 'l-launch',
        fromKey: 'c-work',
      }),
    ).toEqual(keyboardDrag);
  });

  it('steps the keyboard target through the columns', () => {
    const right = boardDragReducer(keyboardDrag, {
      type: 'step',
      delta: 1,
      columnKeys,
    });
    expect(right).toEqual({ ...keyboardDrag, overKey: 'c-home' });
    expect(
      boardDragReducer(right, { type: 'step', delta: -1, columnKeys }),
    ).toEqual(keyboardDrag);
  });

  it('stops stepping at either end of the board', () => {
    const last = { ...keyboardDrag, overKey: '__uncategorized__' };

    expect(
      boardDragReducer(keyboardDrag, { type: 'step', delta: -1, columnKeys }),
    ).toBe(keyboardDrag);
    expect(boardDragReducer(last, { type: 'step', delta: 1, columnKeys })).toBe(
      last,
    );
  });

  it('ignores a step outside keyboard mode', () => {
    expect(
      boardDragReducer(pointerDrag, { type: 'step', delta: 1, columnKeys }),
    ).toBe(pointerDrag);
  });

  it('releases back to idle from either mode', () => {
    expect(boardDragReducer(pointerDrag, { type: 'release' })).toBe(idleDrag);
    expect(boardDragReducer(keyboardDrag, { type: 'release' })).toBe(idleDrag);
  });

  it('retargets on hover only when the column actually changed', () => {
    expect(
      boardDragReducer(pointerDrag, { type: 'hover', overKey: 'c-home' }),
    ).toMatchObject({ overKey: 'c-home', x: 10, y: 20 });
    expect(
      boardDragReducer(pointerDrag, { type: 'hover', overKey: 'c-work' }),
    ).toBe(pointerDrag);
    expect(
      boardDragReducer(pointerDrag, { type: 'hover', overKey: null }),
    ).toBe(pointerDrag);
    expect(
      boardDragReducer(keyboardDrag, { type: 'hover', overKey: 'c-home' }),
    ).toBe(keyboardDrag);
  });

  it('reports a move only when the target column changed', () => {
    expect(draggedMove(idleDrag)).toBeNull();
    expect(draggedMove(pointerDrag)).toBeNull();
    expect(draggedMove({ ...keyboardDrag, overKey: 'c-home' })).toEqual({
      listId: 'l-launch',
      columnKey: 'c-home',
    });
  });
});

describe('Board touch drag', () => {
  beforeEach(() => {
    assignCategory.mockReset();
    unassignCategory.mockReset();
  });

  it('re-files a list dragged onto another category', async () => {
    renderBoard();

    touchDrag('Launch todo v2', 0, 1);

    await waitFor(() =>
      expect(assignCategory).toHaveBeenCalledWith('l-launch', 'c-home'),
    );
  });

  it('unassigns a list dragged onto the uncategorized column', async () => {
    renderBoard();

    touchDrag('Launch todo v2', 0, 2);

    await waitFor(() =>
      expect(unassignCategory).toHaveBeenCalledWith('l-launch'),
    );
    expect(assignCategory).not.toHaveBeenCalled();
  });

  it('commits nothing when the drag ends on its own column', () => {
    renderBoard();

    touchDrag('Launch todo v2', 0, 0);

    expect(assignCategory).not.toHaveBeenCalled();
    expect(unassignCategory).not.toHaveBeenCalled();
  });

  it('starts no drag for a mouse pointer', () => {
    renderBoard();
    const handle = grip('Launch todo v2');

    fireEvent.pointerDown(handle, {
      pointerId: 1,
      pointerType: 'mouse',
      clientX: columnX(0),
      clientY: 20,
    });
    fireEvent.pointerMove(handle, {
      pointerId: 1,
      pointerType: 'mouse',
      clientX: columnX(1),
      clientY: 20,
    });
    fireEvent.pointerUp(handle, { pointerId: 1, pointerType: 'mouse' });

    expect(handle).toHaveAttribute('aria-pressed', 'false');
    expect(assignCategory).not.toHaveBeenCalled();
  });

  it('keeps the drag handle focusable without a coarse pointer', () => {
    renderBoard();
    const handle = grip('Launch todo v2');

    expect(handle).not.toHaveAttribute('disabled');
    expect(handle).not.toHaveAttribute('tabindex', '-1');
    expect(handle.className).not.toMatch(/(^| )hidden( |$)/);

    handle.focus();

    expect(handle).toHaveFocus();
  });
});

describe('Board mouse drag', () => {
  beforeEach(() => {
    assignCategory.mockReset();
    unassignCategory.mockReset();
  });

  it('still re-files a list through the HTML5 drag events', async () => {
    renderBoard();
    const card = screen.getByText('Launch todo v2').closest('article');
    const home = screen.getByRole('region', { name: 'Home' });
    const dataTransfer = stubDataTransfer();

    fireEvent.dragStart(card!, { dataTransfer });
    fireEvent.dragOver(home, { dataTransfer });

    expect(screen.getByText('Drop to move here')).toBeInTheDocument();

    fireEvent.drop(home, { dataTransfer });

    await waitFor(() =>
      expect(assignCategory).toHaveBeenCalledWith('l-launch', 'c-home'),
    );
  });
});

describe('Board add-list form', () => {
  it('names each column add-list input after its own column', async () => {
    const user = userEvent.setup();
    renderBoard();

    const workColumn = screen.getByRole('region', { name: 'Work' });
    await user.click(
      within(workColumn).getByRole('button', { name: '+ Add list' }),
    );

    expect(
      screen.getByRole('textbox', { name: 'Add a list to Work' }),
    ).toBeInTheDocument();
  });
});

describe('Board keyboard drag', () => {
  beforeEach(() => {
    assignCategory.mockReset();
    unassignCategory.mockReset();
  });

  it('picks a card up, walks to a column and commits there', async () => {
    renderBoard();
    const handle = grip('Launch todo v2');
    handle.focus();

    fireEvent.keyDown(handle, { key: 'Enter' });

    expect(handle).toHaveAttribute('aria-pressed', 'true');
    expect(
      screen.getByText(
        'Moving Launch todo v2 to Work. Press Enter to confirm, Escape to cancel.',
      ),
    ).toBeInTheDocument();

    fireEvent.keyDown(handle, { key: 'ArrowRight' });
    fireEvent.keyDown(handle, { key: 'Enter' });

    expect(
      screen
        .getByRole('region', { name: 'Home' })
        .querySelector('[data-drag-grip="l-launch"]'),
    ).toHaveFocus();

    await waitFor(() =>
      expect(assignCategory).toHaveBeenCalledWith('l-launch', 'c-home'),
    );
    expect(
      screen.getByText('Launch todo v2 moved to Home.'),
    ).toBeInTheDocument();
  });

  it('cancels the move on Escape', () => {
    renderBoard();
    const handle = grip('Launch todo v2');
    handle.focus();

    fireEvent.keyDown(handle, { key: 'Enter' });
    fireEvent.keyDown(handle, { key: 'ArrowRight' });
    fireEvent.keyDown(handle, { key: 'Escape' });

    expect(assignCategory).not.toHaveBeenCalled();
    expect(screen.getByText('Move cancelled.')).toBeInTheDocument();
  });
});

describe('Board edge auto-scroll', () => {
  const BOARD_WIDTH = 200;

  beforeEach(() => {
    assignCategory.mockReset();
    unassignCategory.mockReset();
  });

  it('retargets as a column scrolls under a held finger', async () => {
    renderWithIntl(
      <BoardColumns categories={nav.categories} lists={nav.lists} />,
    );
    const sections = Array.from(
      document.querySelectorAll<HTMLElement>('[data-column-key]'),
    );
    const board = sections[0].parentElement as HTMLElement;

    let scrollLeft = 0;
    Object.defineProperty(board, 'scrollWidth', {
      value: 300,
      configurable: true,
    });
    Object.defineProperty(board, 'clientWidth', {
      value: BOARD_WIDTH,
      configurable: true,
    });
    Object.defineProperty(board, 'scrollLeft', {
      get: () => scrollLeft,
      set: (value: number) => {
        scrollLeft = Math.max(0, Math.min(100, value));
      },
      configurable: true,
    });
    board.getBoundingClientRect = () =>
      ({ left: 0, right: BOARD_WIDTH, width: BOARD_WIDTH }) as DOMRect;
    document.elementFromPoint = (x: number) =>
      sections[Math.floor((x + scrollLeft) / COLUMN_WIDTH)]?.querySelector(
        'header',
      ) ?? null;

    const handle = grip('Launch todo v2');
    const edgeX = BOARD_WIDTH - 10;
    fireEvent.pointerDown(handle, {
      pointerId: 1,
      pointerType: 'touch',
      clientX: columnX(0),
      clientY: 20,
    });
    fireEvent.pointerMove(handle, {
      pointerId: 1,
      pointerType: 'touch',
      clientX: edgeX,
      clientY: 20,
    });

    await waitFor(() => expect(scrollLeft).toBe(100));

    fireEvent.pointerUp(handle, {
      pointerId: 1,
      pointerType: 'touch',
      clientX: edgeX,
      clientY: 20,
    });

    await waitFor(() =>
      expect(unassignCategory).toHaveBeenCalledWith('l-launch'),
    );
    expect(assignCategory).not.toHaveBeenCalled();
  });
});
