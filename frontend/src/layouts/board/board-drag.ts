import { useEffect, useReducer, useRef } from 'react';
import type {
  ComponentPropsWithoutRef,
  KeyboardEvent as ReactKeyboardEvent,
  PointerEvent as ReactPointerEvent,
} from 'react';

export type BoardDrag =
  | { mode: 'idle' }
  | {
      mode: 'pointer';
      listId: string;
      fromKey: string;
      overKey: string;
      x: number;
      y: number;
    }
  | { mode: 'keyboard'; listId: string; fromKey: string; overKey: string };

export type BoardDragAction =
  | { type: 'grab'; listId: string; fromKey: string; x: number; y: number }
  | { type: 'move'; x: number; y: number; overKey: string | null }
  | { type: 'hover'; overKey: string | null }
  | { type: 'pick'; listId: string; fromKey: string }
  | { type: 'step'; delta: number; columnKeys: string[] }
  | { type: 'release' };

export interface BoardDragMove {
  listId: string;
  columnKey: string;
}

export const idleDrag: BoardDrag = { mode: 'idle' };

export function boardDragReducer(
  state: BoardDrag,
  action: BoardDragAction,
): BoardDrag {
  switch (action.type) {
    case 'grab':
      return {
        mode: 'pointer',
        listId: action.listId,
        fromKey: action.fromKey,
        overKey: action.fromKey,
        x: action.x,
        y: action.y,
      };
    case 'move':
      if (state.mode !== 'pointer') return state;
      // A hit test that lands on no column keeps the last one, so a gap
      // between columns doesn't drop the target out from under the finger.
      return {
        ...state,
        x: action.x,
        y: action.y,
        overKey: action.overKey ?? state.overKey,
      };
    case 'hover':
      // Returning the same state bails React out of a render, so the
      // per-frame auto-scroll tick only costs one when the column changes.
      if (
        state.mode !== 'pointer' ||
        action.overKey === null ||
        action.overKey === state.overKey
      ) {
        return state;
      }
      return { ...state, overKey: action.overKey };
    case 'pick':
      return {
        mode: 'keyboard',
        listId: action.listId,
        fromKey: action.fromKey,
        overKey: action.fromKey,
      };
    case 'step': {
      if (state.mode !== 'keyboard') return state;
      const next = action.columnKeys.indexOf(state.overKey) + action.delta;
      if (next < 0 || next >= action.columnKeys.length) return state;
      return { ...state, overKey: action.columnKeys[next] };
    }
    case 'release':
      return idleDrag;
  }
}

export function draggedMove(state: BoardDrag): BoardDragMove | null {
  if (state.mode === 'idle' || state.overKey === state.fromKey) return null;
  return { listId: state.listId, columnKey: state.overKey };
}

const EDGE_ZONE_PX = 48;
const EDGE_STEP_PX = 16;

interface BoardDragOptions {
  columnKeys: string[];
  onCommit: (listId: string, columnKey: string) => void;
  onCancel: (mode: 'pointer' | 'keyboard') => void;
}

type GripProps = ComponentPropsWithoutRef<'button'> & {
  'data-drag-grip': string;
};

// The touch counterpart of the card's HTML5 mouse drag, which never fires for
// touch input. Geometry lives here; the reducer above takes the resolved
// column key as data so it stays testable without layout.
export function useBoardDrag({
  columnKeys,
  onCommit,
  onCancel,
}: BoardDragOptions) {
  const [drag, dispatch] = useReducer(boardDragReducer, idleDrag);
  const boardRef = useRef<HTMLDivElement>(null);
  const pointRef = useRef<{ x: number; y: number } | null>(null);
  const frameRef = useRef<number | null>(null);
  const refocusRef = useRef<BoardDragMove | null>(null);

  // The committed card unmounts from its old column and remounts in the new
  // one, so a keyboard user loses focus unless it is put back. Scoping the
  // lookup to the target column means a render where the move hasn't landed
  // yet finds nothing and leaves the request pending for the next one.
  useEffect(() => {
    const pending = refocusRef.current;
    if (!pending) return;
    const grip = boardRef.current?.querySelector<HTMLElement>(
      `[data-column-key="${pending.columnKey}"] [data-drag-grip="${pending.listId}"]`,
    );
    if (!grip) return;
    refocusRef.current = null;
    grip.focus();
  });

  useEffect(
    () => () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    },
    [],
  );

  function edgeScroll() {
    const board = boardRef.current;
    const point = pointRef.current;
    if (!board || !point) {
      frameRef.current = null;
      return;
    }
    if (board.scrollWidth > board.clientWidth) {
      const rect = board.getBoundingClientRect();
      const before = board.scrollLeft;
      if (point.x - rect.left < EDGE_ZONE_PX) {
        board.scrollLeft -= EDGE_STEP_PX;
      } else if (rect.right - point.x < EDGE_ZONE_PX) {
        board.scrollLeft += EDGE_STEP_PX;
      }
      // A held finger fires no pointermove, so without re-testing here the
      // target would stay on whichever column the scroll moved out of.
      if (board.scrollLeft !== before) {
        dispatch({ type: 'hover', overKey: columnKeyAt(point.x, point.y) });
      }
    }
    frameRef.current = requestAnimationFrame(edgeScroll);
  }

  function stopEdgeScroll() {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
    pointRef.current = null;
  }

  function finish(commit: boolean) {
    const mode = drag.mode;
    if (mode === 'idle') return;
    const move = commit ? draggedMove(drag) : null;
    stopEdgeScroll();
    dispatch({ type: 'release' });
    if (!move) {
      onCancel(mode);
      return;
    }
    refocusRef.current = move;
    onCommit(move.listId, move.columnKey);
  }

  function columnKeyAt(x: number, y: number) {
    const hit = document.elementFromPoint?.(x, y);
    return (
      hit?.closest('[data-column-key]')?.getAttribute('data-column-key') ?? null
    );
  }

  function onPointerDown(
    event: ReactPointerEvent<HTMLButtonElement>,
    listId: string,
    columnKey: string,
  ) {
    if (event.pointerType !== 'touch') return;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    pointRef.current = { x: event.clientX, y: event.clientY };
    dispatch({
      type: 'grab',
      listId,
      fromKey: columnKey,
      x: event.clientX,
      y: event.clientY,
    });
    if (frameRef.current === null) {
      frameRef.current = requestAnimationFrame(edgeScroll);
    }
  }

  function onPointerMove(event: ReactPointerEvent<HTMLButtonElement>) {
    if (drag.mode !== 'pointer') return;
    pointRef.current = { x: event.clientX, y: event.clientY };
    dispatch({
      type: 'move',
      x: event.clientX,
      y: event.clientY,
      overKey: columnKeyAt(event.clientX, event.clientY),
    });
  }

  function onKeyDown(
    event: ReactKeyboardEvent<HTMLButtonElement>,
    listId: string,
    columnKey: string,
  ) {
    const held = drag.mode === 'keyboard' && drag.listId === listId;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (held) finish(true);
      else dispatch({ type: 'pick', listId, fromKey: columnKey });
      return;
    }
    if (!held) return;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      dispatch({
        type: 'step',
        delta: event.key === 'ArrowRight' ? 1 : -1,
        columnKeys,
      });
    } else if (event.key === 'Escape') {
      event.preventDefault();
      finish(false);
    }
  }

  function gripProps(listId: string, columnKey: string): GripProps {
    return {
      type: 'button',
      draggable: false,
      'aria-pressed': drag.mode !== 'idle' && drag.listId === listId,
      'data-drag-grip': listId,
      onPointerDown: (event) => onPointerDown(event, listId, columnKey),
      onPointerMove,
      onPointerUp: () => finish(true),
      onPointerCancel: () => finish(false),
      onKeyDown: (event) => onKeyDown(event, listId, columnKey),
      onBlur: () => {
        if (drag.mode === 'keyboard' && drag.listId === listId) finish(false);
      },
    };
  }

  return { drag, boardRef, gripProps };
}
