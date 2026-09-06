import { useTranslations } from 'next-intl';
import { TemplateEditor } from '@features/list-templates';
import type { TemplateFormPageProps } from '../types';
import { BackLink } from './BackLink';

export function TemplateFormPage({ template }: TemplateFormPageProps) {
  const t = useTranslations('ListTemplates');
  return (
    <div className="flex flex-col gap-4">
      <BackLink href="/templates" label={t('title')} />
      <TemplateEditor
        template={template}
        headingClassName="text-2xl font-extrabold tracking-tight"
        className="rounded-2xl bg-card p-4 shadow-[0_1px_2px_hsl(var(--foreground)/0.06)]"
      />
    </div>
  );
}
