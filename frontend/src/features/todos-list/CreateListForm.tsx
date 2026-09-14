'use client';

import { Button } from '@ui/components/button';
import { createListAction } from './actions';
import { Input } from '@ui/components/input';
import { useTranslations } from 'next-intl';

export const CreateListForm = () => {
  const t = useTranslations('Lists');

  return (
    <form action={createListAction} className="flex gap-2">
      <Input
        name="title"
        placeholder={t('createPlaceholder')}
        aria-label={t('createPlaceholder')}
        required
      />
      <Button type="submit">{t('createButton')}</Button>
    </form>
  );
};
