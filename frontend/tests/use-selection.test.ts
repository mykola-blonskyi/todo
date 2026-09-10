import { describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useSelection } from '@/shared/ui/selection/use-selection';

describe('useSelection', () => {
  it('starts inactive with nothing selected', () => {
    const { result } = renderHook(() => useSelection(['a', 'b']));

    expect(result.current.active).toBe(false);
    expect(result.current.selectedIds).toEqual([]);
    expect(result.current.selectableCount).toBe(2);
  });

  it('toggles a selectable id on and off', () => {
    const { result } = renderHook(() => useSelection(['a', 'b']));

    act(() => result.current.toggle('a'));
    expect(result.current.selectedIds).toEqual(['a']);
    expect(result.current.isSelected('a')).toBe(true);

    act(() => result.current.toggle('a'));
    expect(result.current.selectedIds).toEqual([]);
  });

  it('selects every selectable id, and only those', () => {
    const { result } = renderHook(() => useSelection(['a', 'b']));

    act(() => result.current.selectAll());

    expect(result.current.selectedIds).toEqual(['a', 'b']);
    expect(result.current.isSelectable('c')).toBe(false);
  });

  it('clear keeps selection mode on, cancel turns it off', () => {
    const { result } = renderHook(() => useSelection(['a']));

    act(() => result.current.start());
    act(() => result.current.selectAll());
    act(() => result.current.clear());
    expect(result.current.active).toBe(true);
    expect(result.current.selectedIds).toEqual([]);

    act(() => result.current.selectAll());
    act(() => result.current.cancel());
    expect(result.current.active).toBe(false);
    expect(result.current.selectedIds).toEqual([]);
  });

  it('drops ids that stop being selectable', () => {
    const { result, rerender } = renderHook(
      ({ ids }: { ids: string[] }) => useSelection(ids),
      { initialProps: { ids: ['a', 'b'] } },
    );

    act(() => result.current.selectAll());
    rerender({ ids: ['a'] });

    expect(result.current.selectedIds).toEqual(['a']);
    expect(result.current.selectableCount).toBe(1);
  });

  it('never reports an id outside the selectable set', () => {
    const { result } = renderHook(() => useSelection(['a']));

    act(() => result.current.toggle('nope'));

    expect(result.current.selectedIds).toEqual([]);
  });
});
