'use client';

import { useState } from 'react';

export interface Selection {
  active: boolean;
  selectedIds: string[];
  selectableCount: number;
  isSelectable: (id: string) => boolean;
  isSelected: (id: string) => boolean;
  start: () => void;
  cancel: () => void;
  toggle: (id: string) => void;
  selectAll: () => void;
  clear: () => void;
}

export function useSelection(selectableIds: string[]): Selection {
  const [active, setActive] = useState(false);
  const [picked, setPicked] = useState<ReadonlySet<string>>(
    () => new Set<string>(),
  );

  const selectable = new Set(selectableIds);

  const selectedIds = selectableIds.filter((id) => picked.has(id));

  return {
    active,
    selectedIds,
    selectableCount: selectable.size,
    isSelectable: (id) => selectable.has(id),
    isSelected: (id) => picked.has(id),
    start: () => setActive(true),
    cancel: () => {
      setActive(false);
      setPicked(new Set<string>());
    },
    toggle: (id) =>
      setPicked((current) => {
        const next = new Set(current);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      }),
    selectAll: () => setPicked(new Set(selectableIds)),
    clear: () => setPicked(new Set<string>()),
  };
}
