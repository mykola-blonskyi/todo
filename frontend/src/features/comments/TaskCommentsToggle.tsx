'use client';

import { MessageSquare } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@ui/components/button';
import { cn } from '@shared/lib/utils';

interface TaskCommentsToggleProps {
  count: number;
  isOpen: boolean;
  onToggle: () => void;
  className?: string;
}

// The "N comments" affordance on a task row. Quiet unless there are
// comments: icon + count reads as "there is a thread here"; an icon alone as
// "start one" (shown on row hover, see TaskRow). The accessible name keeps
// the full wording either way. The thread itself is rendered by TaskRow.
export function TaskCommentsToggle({
  count,
  isOpen,
  onToggle,
  className,
}: TaskCommentsToggleProps) {
  const t = useTranslations('Comments');

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      aria-expanded={isOpen}
      className={cn('h-7 px-1.5 text-xs text-muted-foreground', className)}
      onClick={onToggle}
    >
      <MessageSquare className="h-3.5 w-3.5" aria-hidden="true" />
      {count > 0 ? (
        <span aria-hidden="true" className="ml-1 tabular-nums">
          {count}
        </span>
      ) : null}
      <span className="sr-only">
        {isOpen ? t('hideButton') : t('showButton', { count })}
      </span>
    </Button>
  );
}
