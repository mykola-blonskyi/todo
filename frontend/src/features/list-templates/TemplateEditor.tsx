import { useTranslations } from 'next-intl';
import { cn } from '@shared/lib/utils';
import { TemplateForm } from './TemplateForm';
import { TemplateCollaboratorSearch } from './TemplateCollaboratorSearch';
import { TemplateCollaboratorsList } from './TemplateCollaboratorsList';
import { createListTemplateAction, updateListTemplateAction } from './actions';
import type { ListTemplate } from './types';

interface TemplateEditorProps {
  // undefined → create form
  template?: ListTemplate;
  className?: string;
  headingClassName?: string;
  showHeading?: boolean;
}

// New/edit template form plus (for an existing template) its default
// collaborators - one block every layout drops into its own page frame.
export function TemplateEditor({
  template,
  className,
  headingClassName,
  showHeading = true,
}: TemplateEditorProps) {
  const t = useTranslations('ListTemplates');

  if (!template) {
    return (
      <div className={cn('flex flex-col gap-6', className)}>
        {showHeading ? (
          <h1
            className={cn(
              'text-2xl font-semibold tracking-tight',
              headingClassName,
            )}
          >
            {t('newTemplateTitle')}
          </h1>
        ) : null}
        <TemplateForm
          onSubmit={createListTemplateAction}
          submitLabel={t('createButton')}
        />
      </div>
    );
  }

  const updateWithId = updateListTemplateAction.bind(null, template.id);

  return (
    <div className={cn('flex flex-col gap-8', className)}>
      {showHeading ? (
        <h1
          className={cn(
            'text-2xl font-semibold tracking-tight',
            headingClassName,
          )}
        >
          {t('editTemplateTitle')}
        </h1>
      ) : null}
      <TemplateForm
        initialValues={template}
        onSubmit={updateWithId}
        submitLabel={t('saveButton')}
      />
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-muted-foreground">
          {t('collaboratorsTitle')}
        </h2>
        <TemplateCollaboratorSearch templateId={template.id} />
      </section>
      <TemplateCollaboratorsList
        templateId={template.id}
        collaborators={template.collaborators}
      />
    </div>
  );
}
