'use client';

import { useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@ui/components/button';
import {
  pauseListTemplateAction,
  resumeListTemplateAction,
  deleteListTemplateAction,
} from './actions';
import type { ListTemplate } from './types';

interface TemplateActionsProps {
  template: Pick<ListTemplate, 'id' | 'status'>;
  className?: string;
}

// Pause/resume + delete for one template - shared by the card row and the
// table layouts.
export function TemplateActions({ template, className }: TemplateActionsProps) {
  const t = useTranslations('ListTemplates');
  const [isPending, startTransition] = useTransition();
  const isPaused = template.status === 'paused';

  return (
    <div className={className ?? 'flex shrink-0 gap-2'}>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={isPending}
        onClick={() =>
          startTransition(() => {
            void (isPaused
              ? resumeListTemplateAction(template.id)
              : pauseListTemplateAction(template.id));
          })
        }
      >
        {isPaused ? t('resumeButton') : t('pauseButton')}
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={isPending}
        onClick={() => {
          if (window.confirm(t('deleteConfirm'))) {
            startTransition(() => {
              void deleteListTemplateAction(template.id);
            });
          }
        }}
      >
        {t('deleteButton')}
      </Button>
    </div>
  );
}
