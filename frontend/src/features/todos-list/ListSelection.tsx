'use client';

import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import {
  SelectionActionBar,
  SelectionCheckbox,
  SelectionProvider,
  SelectionToggle,
} from '@ui/selection';
import {
  useSelectionBarCopy,
  useSelectionToggleCopy,
} from '@shared/lib/selection-copy';
import { deleteListsAction } from './actions';

export interface SelectableList {
  id: string;
  title: string;
  isOwner: boolean;
}

interface ListSelectionProviderProps {
  lists: SelectableList[];
  children: ReactNode;
}

export function ListSelectionProvider({
  lists,
  children,
}: ListSelectionProviderProps) {
  return (
    <SelectionProvider
      selectableIds={lists.filter((l) => l.isOwner).map((l) => l.id)}
    >
      {children}
    </SelectionProvider>
  );
}

export function ListSelectionToggle({ className }: { className?: string }) {
  const copy = useSelectionToggleCopy('Lists');

  return <SelectionToggle className={className} {...copy} />;
}

export function ListSelectionCheckbox({
  list,
  className,
}: {
  list: Pick<SelectableList, 'id' | 'title'>;
  className?: string;
}) {
  const t = useTranslations('Lists');

  return (
    <SelectionCheckbox
      id={list.id}
      label={t('selectItemLabel', { title: list.title })}
      className={className}
    />
  );
}

export function ListSelectionBar({ className }: { className?: string }) {
  const copy = useSelectionBarCopy('Lists');

  return (
    <SelectionActionBar
      className={className}
      action={deleteListsAction}
      copy={copy}
    />
  );
}
