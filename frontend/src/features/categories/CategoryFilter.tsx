'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@ui/components/select';
import type { Category } from './types';

interface CategoryFilterProps {
  categories: Category[];
}

const ALL = 'all';
const UNCATEGORIZED = 'uncategorized';

// URL search params drive the filter (?categoryId=... or ?uncategorized=true)
// so the Lists overview stays server-rendered and filterable state survives
// a reload/shared link, rather than living in client-only state.
export function CategoryFilter({ categories }: CategoryFilterProps) {
  const t = useTranslations('Categories');
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (categories.length === 0) {
    return null;
  }

  const current =
    searchParams.get('uncategorized') === 'true'
      ? UNCATEGORIZED
      : (searchParams.get('categoryId') ?? ALL);

  function handleChange(value: string) {
    const params = new URLSearchParams();
    if (value === UNCATEGORIZED) {
      params.set('uncategorized', 'true');
    } else if (value !== ALL) {
      params.set('categoryId', value);
    }
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  return (
    <Select value={current} onValueChange={handleChange}>
      <SelectTrigger className="w-48" aria-label={t('filterLabel')}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>{t('filterAll')}</SelectItem>
        <SelectItem value={UNCATEGORIZED}>
          {t('filterUncategorized')}
        </SelectItem>
        {categories.map((category) => (
          <SelectItem key={category.id} value={category.id}>
            {category.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
