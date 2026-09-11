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
import { deleteCategoriesAction } from './actions';
import type { Category } from './types';

interface CategorySelectionProviderProps {
  categories: Pick<Category, 'id'>[];
  children: ReactNode;
}

export function CategorySelectionProvider({
  categories,
  children,
}: CategorySelectionProviderProps) {
  return (
    <SelectionProvider selectableIds={categories.map((c) => c.id)}>
      {children}
    </SelectionProvider>
  );
}

export function CategorySelectionToggle({ className }: { className?: string }) {
  const copy = useSelectionToggleCopy('Categories');

  return <SelectionToggle className={className} {...copy} />;
}

export function CategorySelectionCheckbox({
  category,
  className,
}: {
  category: Pick<Category, 'id' | 'name'>;
  className?: string;
}) {
  const t = useTranslations('Categories');

  return (
    <SelectionCheckbox
      id={category.id}
      label={t('selectItemLabel', { name: category.name })}
      className={className}
    />
  );
}

export function CategorySelectionBar({ className }: { className?: string }) {
  const copy = useSelectionBarCopy('Categories');

  return (
    <SelectionActionBar
      className={className}
      action={deleteCategoriesAction}
      copy={copy}
    />
  );
}
