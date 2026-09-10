'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@ui/components/button';
import { Input } from '@ui/components/input';
import { CategorySelectionCheckbox } from './CategorySelection';
import { renameCategoryAction, deleteCategoryAction } from './actions';
import type { Category } from './types';

interface CategoryRowProps {
  category: Category;
}

export function CategoryRow({ category }: CategoryRowProps) {
  const t = useTranslations('Categories');
  const [isEditing, setIsEditing] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (isEditing) {
    return (
      <li className="flex items-center gap-3">
        <CategorySelectionCheckbox category={category} className="shrink-0" />
        <form
          className="flex flex-1 items-center gap-2"
          action={(formData: FormData) => {
            startTransition(async () => {
              await renameCategoryAction(category.id, formData);
              setIsEditing(false);
            });
          }}
        >
          <Input name="name" defaultValue={category.name} required autoFocus />
          <Button type="submit" size="sm" disabled={isPending}>
            {t('saveButton')}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isPending}
            onClick={() => setIsEditing(false)}
          >
            {t('cancelButton')}
          </Button>
        </form>
      </li>
    );
  }

  return (
    <li className="flex items-center justify-between gap-3">
      <CategorySelectionCheckbox category={category} className="shrink-0" />
      <span className="mr-auto truncate">{category.name}</span>
      <div className="flex shrink-0 gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setIsEditing(true)}
        >
          {t('editButton')}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={isPending}
          onClick={() => {
            if (window.confirm(t('deleteConfirm'))) {
              startTransition(() => void deleteCategoryAction(category.id));
            }
          }}
        >
          {t('deleteButton')}
        </Button>
      </div>
    </li>
  );
}
