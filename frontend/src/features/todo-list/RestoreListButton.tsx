'use client';

import { useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/shared/ui/components/button';
import { cn } from '@shared/lib/utils';
import { unarchiveListAction } from './actions';

interface RestoreListButtonProps {
  // Structural: features can't import the layouts' types (layouts -> features).
  list: { id: string; isOwner: boolean; archivedAt: string | null };
  className?: string;
}

// Renders only for an archived List the caller owns, so the six layouts don't
// each repeat that guard. No confirm(): restoring destroys nothing.
export function RestoreListButton({ list, className }: RestoreListButtonProps) {
  const t = useTranslations('Lists');
  const [isPending, startTransition] = useTransition();

  if (list.archivedAt === null || !list.isOwner) {
    return null;
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={isPending}
      className={cn('h-7 px-2 text-xs', className)}
      onClick={() =>
        startTransition(() => {
          void unarchiveListAction(list.id);
        })
      }
    >
      {t('restoreButton')}
    </Button>
  );
}
