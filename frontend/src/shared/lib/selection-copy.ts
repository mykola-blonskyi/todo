'use client';

import { useTranslations } from 'next-intl';
import type { SelectionCopy } from '@ui/selection';

type SelectionNamespace = 'Lists' | 'Categories';

export function useSelectionToggleCopy(namespace: SelectionNamespace): {
  selectLabel: string;
  cancelLabel: string;
} {
  const t = useTranslations(namespace);

  return {
    selectLabel: t('selectButton'),
    cancelLabel: t('selectCancelButton'),
  };
}

export function useSelectionBarCopy(
  namespace: SelectionNamespace,
): SelectionCopy {
  const t = useTranslations(namespace);

  return {
    selectedCount: (count) => t('selectedCount', { count }),
    selectAll: (count) => t('selectAllVisible', { count }),
    clear: t('clearSelection'),
    delete: t('deleteButton'),
    confirm: (count) => t('deleteSelectedConfirm', { count }),
    partialFailure: (succeeded, failed) =>
      t('deleteSelectedPartial', { deleted: succeeded, failed }),
    failed: t('deleteSelectedFailed'),
  };
}
