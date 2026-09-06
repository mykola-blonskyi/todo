import { useTranslations } from 'next-intl';
import { Link } from '@shared/lib/i18n/navigation';
import { TemplateEditor } from '@features/list-templates';
import type { TemplateFormPageProps } from '../types';

export function TemplateFormPage({ template }: TemplateFormPageProps) {
  const t = useTranslations('ListTemplates');
  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-2 border-b px-4 py-2 text-xs text-muted-foreground">
        <Link href="/templates" className="hover:text-foreground">
          {t('title')}
        </Link>
        <span aria-hidden="true">/</span>
        <span className="text-foreground">
          {template ? template.title : t('newTemplateTitle')}
        </span>
      </div>
      <div className="p-4">
        <TemplateEditor
          template={template}
          className="max-w-2xl rounded-md border bg-card p-5"
          headingClassName="text-base font-semibold"
        />
      </div>
    </div>
  );
}
