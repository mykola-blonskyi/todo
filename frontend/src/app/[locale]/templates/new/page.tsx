import { getTranslations } from 'next-intl/server';
import { Link } from '@shared/lib/i18n/navigation';
import { TemplateForm } from '@features/list-templates';
import { createListTemplateAction } from '@features/list-templates/actions';

export default async function NewTemplatePage() {
  const t = await getTranslations('ListTemplates');

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 p-8">
      <Link
        href="/templates"
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        ← {t('backToTemplates')}
      </Link>

      <h1 className="text-3xl font-semibold tracking-tight">
        {t('newTemplateTitle')}
      </h1>

      <TemplateForm
        onSubmit={createListTemplateAction}
        submitLabel={t('createButton')}
      />
    </div>
  );
}
