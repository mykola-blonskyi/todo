import { TemplateEditor } from '@features/list-templates';
import type { TemplateFormPageProps } from '../types';
import { Spread } from './Spread';
import { TemplatesIndex } from './TemplatesPage';

export function TemplateFormPage({
  template,
  templates,
}: TemplateFormPageProps) {
  return (
    <Spread
      left={
        <TemplatesIndex
          templates={templates}
          activeTemplateId={template?.id ?? 'new'}
        />
      }
      right={
        <TemplateEditor
          template={template}
          className="text-sm"
          headingClassName="nb-hand text-4xl font-semibold leading-8"
        />
      }
    />
  );
}
