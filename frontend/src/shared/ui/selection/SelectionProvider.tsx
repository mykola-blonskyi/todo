'use client';

import { createContext, useContext, type ReactNode } from 'react';
import { useSelection, type Selection } from './use-selection';

const SelectionContext = createContext<Selection | null>(null);

interface SelectionProviderProps {
  selectableIds: string[];
  children: ReactNode;
}

export function SelectionProvider({
  selectableIds,
  children,
}: SelectionProviderProps) {
  const selection = useSelection(selectableIds);

  return (
    <SelectionContext.Provider value={selection}>
      {children}
    </SelectionContext.Provider>
  );
}

export function useSelectionContext(): Selection | null {
  return useContext(SelectionContext);
}
