'use client';

import { useId, useState, useTransition } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Button } from '@ui/components/button';
import { Input } from '@ui/components/input';
import { Label } from '@ui/components/label';
import { formatRelativeDay } from '@shared/lib/dates';
import type { Comment } from './types';

interface CommentThreadProps {
  comments: Comment[];
  onSubmit: (formData: FormData) => Promise<void>;
}

export function CommentThread({ comments, onSubmit }: CommentThreadProps) {
  const t = useTranslations('Comments');
  const locale = useLocale();
  const [isPending, startTransition] = useTransition();
  const [posted, setPosted] = useState(0);
  const inputId = useId();

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
              <span className="text-muted-foreground">{comment.body}</span>{' '}
              <span className="text-xs text-muted-foreground">
                {formatRelativeDay(comment.createdAt, locale)}
              </span>
            </li>
          ))}
        </ul>
      )}
      <form
        className="flex gap-2"
        action={(formData: FormData) => {
          startTransition(async () => {
            await onSubmit(formData);
            setPosted((count) => count + 1);
          });
        }}
      >
        <Label htmlFor={inputId} className="sr-only">
          {t('addPlaceholder')}
        </Label>
        <Input
          id={inputId}
          name="body"
          placeholder={t('addPlaceholder')}
          required
          className="flex-1"
        />
        <Button type="submit" size="sm" disabled={isPending}>
          {t('addButton')}
        </Button>
      </form>
      {/* Mounted whether or not there's anything to say: several screen
          readers skip a live region that appears together with its first
          message. A trailing zero-width space alternates so posting twice in
          a row still changes the text and gets re-announced. */}
      <p role="status" aria-live="polite" className="sr-only">
        {posted > 0 ? t('posted') : ''}
        {posted % 2 === 0 ? '' : '​'}
      </p>
    </div>
  );
}
