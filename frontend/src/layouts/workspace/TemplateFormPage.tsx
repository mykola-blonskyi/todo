import { useTranslations } from 'next-intl';
import { Link } from '@shared/lib/i18n/navigation';
import { TemplateEditor } from '@features/list-templates';
import type { TemplateFormPageProps } from '../types';
import { TemplatesColumn } from './TemplatesColumn';

export function TemplateFormPage({
  template,
  templates,
}: TemplateFormPageProps) {
  const t = useTranslations('ListTemplates');

  return (
    <div className="flex flex-1 flex-col md:flex-row">
      <TemplatesColumn
        templates={templates}
        activeTemplateId={template?.id ?? 'new'}
      />
      <section className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-1.5 border-b px-6 py-2.5 text-xs text-muted-foreground">
          <Link href="/templates" className="hover:text-foreground">
            {t('title')}
          </Link>
          <span aria-hidden="true">›</span>
          <span className="truncate text-foreground">
            {template ? template.title : t('newTemplateTitle')}
          </span>
        </div>
        <TemplateEditor template={template} className="max-w-2xl p-6" />
      </section>
    </div>
  );
}
