import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@shared/lib/i18n/navigation';
import { cn } from '@shared/lib/utils';
import { TemplateRow, type ListTemplate } from '@features/list-templates';
import { recurrenceSummary } from '@features/list-templates/recurrence-summary';
import type { TemplatesPageProps } from '../types';
import { Spread } from './Spread';

export function TemplatesIndex({
  templates,
  activeTemplateId,
}: {
  templates: ListTemplate[];
  activeTemplateId?: string | 'new';
}) {
  const t = useTranslations('ListTemplates');
  const locale = useLocale();
  return (
    <>
      <h2 className="nb-hand text-4xl font-semibold leading-8">{t('title')}</h2>
      <ul className="mt-8">
        {templates.length === 0 ? (
          <li className="italic leading-8 text-muted-foreground">
            {t('emptyState')}
          </li>
        ) : null}
        {templates.map((template) => {
          const active = template.id === activeTemplateId;
          return (
            <li
              key={template.id}
              className="flex items-baseline gap-2 leading-8"
            >
              <Link
                href={`/templates/${template.id}`}
                className={cn(
                  'shrink-0 hover:underline',
                  active && 'font-semibold text-primary',
                )}
              >
                {active ? '→ ' : ''}
                {template.title}
              </Link>
              <span
                aria-hidden="true"
                className="mx-1 flex-1 -translate-y-1.5 border-b-2 border-dotted border-muted-foreground/60"
              />
              <span className="nb-hand shrink-0 text-base text-muted-foreground">
                {template.status === 'paused'
                  ? t('statusPaused')
                  : recurrenceSummary(template, locale, t)}
              </span>
            </li>
          );
        })}
        <li className="leading-8">
          <Link
            href="/templates/new"
            className={cn(
              'nb-hand text-xl text-muted-foreground hover:text-foreground',
              activeTemplateId === 'new' && 'text-primary',
            )}
          >
            + {t('createButton')}…
          </Link>
        </li>
      </ul>
    </>
  );
}

export function TemplatesPage({ templates }: TemplatesPageProps) {
  const t = useTranslations('Notebook');
  return (
    <Spread
      left={<TemplatesIndex templates={templates} />}
      right={
        <>
          <h2 className="nb-hand text-4xl font-semibold leading-8">
            {t('recurringPages')}
          </h2>
          <p className="mt-2 text-sm leading-8 text-muted-foreground">
            {t('recurringHint')}
          </p>
          <ul className="mt-6 flex flex-col gap-3 text-sm">
            {templates.map((template) => (
              <TemplateRow key={template.id} template={template} />
            ))}
          </ul>
        </>
      }
    />
  );
}
