'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@shared/lib/i18n/navigation';
import { Button } from '@ui/components/button';
import { TemplateRow } from './TemplateRow';
import type { ListTemplate } from './types';

interface TemplatesListProps {
  templates: ListTemplate[];
}

export function TemplatesList({ templates }: TemplatesListProps) {
  const t = useTranslations('ListTemplates');

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 p-8">
      <Link
        href="/"
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        ← {t('backToLists')}
      </Link>

      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-semibold tracking-tight">{t('title')}</h1>
        <Button asChild>
          <Link href="/templates/new">{t('createButton')}</Link>
        </Button>
      </div>

      {templates.length === 0 ? (
        <p className="text-muted-foreground">{t('emptyState')}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {templates.map((template) => (
            <TemplateRow key={template.id} template={template} />
          ))}
        </ul>
      )}
    </div>
  );
}
