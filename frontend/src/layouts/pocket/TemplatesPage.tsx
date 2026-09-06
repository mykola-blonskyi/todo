import { useTranslations } from 'next-intl';
import { Link } from '@shared/lib/i18n/navigation';
import { Plus } from 'lucide-react';
import { TemplateRow } from '@features/list-templates';
import type { TemplatesPageProps } from '../types';

export function TemplatesPage({ templates }: TemplatesPageProps) {
  const t = useTranslations('ListTemplates');

  return (
    <>
      <h1 className="text-3xl font-extrabold tracking-tight">{t('title')}</h1>
      {templates.length === 0 ? (
        <p className="mt-4 rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">
          {t('emptyState')}
        </p>
      ) : (
        <ul className="mt-4 flex flex-col gap-2.5">
          {templates.map((template) => (
            <TemplateRow key={template.id} template={template} />
          ))}
        </ul>
      )}
      <Link
        href="/templates/new"
        aria-label={t('createButton')}
        className="fixed bottom-24 right-[max(1rem,calc(50%-14rem+1rem))] z-20 grid h-14 w-14 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-[0_10px_24px_-8px_hsl(var(--primary)/0.6)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        <Plus className="h-7 w-7" aria-hidden="true" />
      </Link>
    </>
  );
}
