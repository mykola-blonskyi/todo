import { useTranslations } from 'next-intl';
import { TemplateEditor } from '@features/list-templates';
import type { TemplateFormPageProps } from '../types';
import { TemplatesBoard } from './TemplatesPage';
import { Drawer } from './Drawer';

export function TemplateFormPage({
  template,
  templates,
}: TemplateFormPageProps) {
  const t = useTranslations('ListTemplates');
  const tBoard = useTranslations('Board');

  return (
    <>
      <TemplatesBoard templates={templates} activeTemplateId={template?.id} />
      <Drawer
        backHref="/templates"
        closeLabel={tBoard('close')}
        crumb={
          <>
            <span>{t('title')}</span>
            <span aria-hidden="true">/</span>
            <span className="truncate text-foreground">
              {template ? template.title : t('newTemplateTitle')}
            </span>
          </>
        }
      >
        <TemplateEditor
          template={template}
          headingClassName="text-2xl font-extrabold"
        />
      </Drawer>
    </>
  );
}
