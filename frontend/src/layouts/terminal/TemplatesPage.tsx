import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@shared/lib/i18n/navigation';
import { buttonVariants } from '@ui/components/button';
import { TemplateRow } from '@features/list-templates';
import { recurrenceSummary } from '@features/list-templates/recurrence-summary';
import type { TemplatesPageProps } from '../types';
import { TuiHeading } from './Shell';

export function TemplatesPage({ templates }: TemplatesPageProps) {
  const t = useTranslations('ListTemplates');
  const tTerminal = useTranslations('Terminal');
  const locale = useLocale();

  return (
    <div className="flex max-w-4xl flex-col gap-5">
      <div className="flex items-baseline justify-between gap-3">
        <h1 className="font-bold">
          <span className="text-muted-foreground"># </span>
          {t('title').toLowerCase()}{' '}
          <span className="text-muted-foreground">({templates.length})</span>
        </h1>
        <Link
          href="/templates/new"
          className={buttonVariants({ size: 'sm', variant: 'outline' })}
        >
          {t('createButton').toLowerCase()}
        </Link>
      </div>
      <pre className="overflow-x-auto text-muted-foreground">
        {templates.length === 0
          ? t('emptyState')
          : templates
              .map(
                (template, index) =>
                  `${String(index + 1).padStart(2, ' ')}  ${template.title.padEnd(28, ' ').slice(0, 28)}  ${(template.status === 'paused' ? t('statusPaused') : recurrenceSummary(template, locale, t)).toLowerCase()}`,
              )
              .join('\n')}
      </pre>
      <section>
        <TuiHeading>{tTerminal('manage')}</TuiHeading>
        <ul className="mt-1 flex flex-col gap-1">
          {templates.map((template) => (
            <TemplateRow key={template.id} template={template} />
          ))}
        </ul>
      </section>
    </div>
  );
}
