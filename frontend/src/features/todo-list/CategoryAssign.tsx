'use client';

import { useTransition } from 'react';
import { useTranslations } from 'next-intl';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@ui/components/select';
import type { Category } from '@features/categories';
import { assignCategoryAction, unassignCategoryAction } from './actions';

interface CategoryAssignProps {
  listId: string;
  myCategory: { id: string; name: string } | null;
  categories: Category[];
}

const UNCATEGORIZED = 'uncategorized';

// Assignment is per-caller (Rule 22): the owner and each collaborator each
// see and change only their own categorization of this shared List.
export function CategoryAssign({
  listId,
  myCategory,
  categories,
}: CategoryAssignProps) {
  const t = useTranslations('Categories');
  const [isPending, startTransition] = useTransition();

  if (categories.length === 0) {
    return null;
  }

  function handleChange(value: string) {
    startTransition(async () => {
      if (value === UNCATEGORIZED) {
        await unassignCategoryAction(listId);
      } else {
        await assignCategoryAction(listId, value);
      }
    });
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground">{t('assignLabel')}</span>
      <Select
        value={myCategory?.id ?? UNCATEGORIZED}
        onValueChange={handleChange}
        disabled={isPending}
      >
        <SelectTrigger className="w-48" aria-label={t('assignLabel')}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={UNCATEGORIZED}>
            {t('assignUncategorized')}
          </SelectItem>
          {categories.map((category) => (
            <SelectItem key={category.id} value={category.id}>
              {category.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
