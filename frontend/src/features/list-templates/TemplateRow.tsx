'use client';

import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@shared/lib/i18n/navigation';
import { Badge } from '@ui/components/badge';
import { Card, CardContent } from '@ui/components/card';
import { TemplateActions } from './TemplateActions';
import { recurrenceSummary } from './recurrence-summary';
import type { ListTemplate } from './types';

interface TemplateRowProps {
  template: ListTemplate;
}

export function TemplateRow({ template }: TemplateRowProps) {
  const t = useTranslations('ListTemplates');
  const locale = useLocale();

  const isPaused = template.status === 'paused';

  return (
    <li>
      <Card>
        <CardContent className="flex items-center justify-between gap-3 p-4">
          <Link
            href={`/templates/${template.id}`}
            className="flex min-w-0 flex-1 flex-col gap-1 rounded-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className="flex items-center gap-2">
              <span className="truncate font-medium">{template.title}</span>
              <Badge variant={isPaused ? 'secondary' : 'default'}>
                {isPaused ? t('statusPaused') : t('statusActive')}
              </Badge>
            </span>
            <span className="truncate text-sm text-muted-foreground">
              {recurrenceSummary(template, locale, t)}
            </span>
          </Link>
          <TemplateActions template={template} />
        </CardContent>
      </Card>
    </li>
  );
}
