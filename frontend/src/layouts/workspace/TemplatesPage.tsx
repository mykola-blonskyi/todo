import { useTranslations } from 'next-intl';
import { TemplateRow } from '@features/list-templates';
import type { TemplatesPageProps } from '../types';
import { TemplatesColumn } from './TemplatesColumn';

// Column of templates on the left (navigation) and the full rows with their
// pause/resume/delete controls on the right - the detail pane doubles as the
// management surface until a template is opened for editing.
export function TemplatesPage({ templates }: TemplatesPageProps) {
  const t = useTranslations('ListTemplates');

  return (
    <div className="flex flex-1 flex-col md:flex-row">
      <TemplatesColumn templates={templates} />
      <section className="flex flex-1 flex-col gap-4 p-6 md:p-8">
        <h1 className="text-xl font-semibold tracking-tight">{t('title')}</h1>
        {templates.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('emptyState')}</p>
        ) : (
          <ul className="flex max-w-3xl flex-col gap-2">
            {templates.map((template) => (
              <TemplateRow key={template.id} template={template} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
