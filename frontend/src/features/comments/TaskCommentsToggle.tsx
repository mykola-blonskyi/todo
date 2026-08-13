'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@ui/components/button';
import { CommentThread } from './CommentThread';
import type { Comment } from './types';

interface TaskCommentsToggleProps {
  comments: Comment[];
  onSubmit: (formData: FormData) => Promise<void>;
}

export function TaskCommentsToggle({
  comments,
  onSubmit,
}: TaskCommentsToggleProps) {
  const t = useTranslations('Comments');
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="flex flex-col gap-2 pl-9">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="self-start text-muted-foreground"
        onClick={() => setIsOpen((open) => !open)}
      >
        {isOpen ? t('hideButton') : t('showButton', { count: comments.length })}
      </Button>
      {isOpen ? (
        <CommentThread comments={comments} onSubmit={onSubmit} />
      ) : null}
    </div>
  );
}
