import { useTranslations } from 'next-intl';
import { Link } from '@shared/lib/i18n/navigation';
import { TemplateEditor } from '@features/list-templates';
import type { TemplateFormPageProps } from '../types';

export function TemplateFormPage({ template }: TemplateFormPageProps) {
  const t = useTranslations('ListTemplates');
  return (
    <div className="flex max-w-3xl flex-col gap-4">
      <p className="text-muted-foreground">
        <Link href="/templates" className="hover:underline">
          ../{t('title').toLowerCase()}
        </Link>
      </p>
      <TemplateEditor
        template={template}
        headingClassName="text-base font-bold before:mr-2 before:text-muted-foreground before:content-['#']"
      />
    </div>
  );
}
