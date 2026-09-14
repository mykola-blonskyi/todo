'use client';

import { useTranslations } from 'next-intl';
import { Button } from '@ui/components/button';
import { Input } from '@ui/components/input';
import { cn } from '@shared/lib/utils';
import { createCategoryAction } from './actions';

interface CategoryCreateFormProps {
  className?: string;
}

export function CategoryCreateForm({ className }: CategoryCreateFormProps) {
  const t = useTranslations('Categories');
  return (
    <form action={createCategoryAction} className={cn('flex gap-2', className)}>
      <Input
        name="name"
        placeholder={t('createPlaceholder')}
        aria-label={t('createPlaceholder')}
        required
      />
      <Button type="submit">{t('createButton')}</Button>
    </form>
  );
}
