'use client';

import { useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@ui/components/button';
import { Input } from '@ui/components/input';
import type { Comment } from './types';

interface CommentThreadProps {
  comments: Comment[];
  onSubmit: (formData: FormData) => Promise<void>;
}

export function CommentThread({ comments, onSubmit }: CommentThreadProps) {
  const t = useTranslations('Comments');
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex flex-col gap-2">
      {comments.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('emptyState')}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {comments.map((comment) => (
            <li key={comment.id} className="text-sm">
              <span className="font-medium">
                {comment.author.name ?? comment.author.email}
              </span>{' '}
              <span className="text-muted-foreground">{comment.body}</span>
            </li>
          ))}
        </ul>
      )}
      <form
        className="flex gap-2"
        action={(formData: FormData) => {
          startTransition(async () => {
            await onSubmit(formData);
          });
        }}
      >
        <Input
          name="body"
          placeholder={t('addPlaceholder')}
          required
          className="flex-1"
        />
        <Button type="submit" size="sm" disabled={isPending}>
          {t('addButton')}
        </Button>
      </form>
    </div>
  );
}
