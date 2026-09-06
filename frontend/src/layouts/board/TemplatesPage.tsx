import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@shared/lib/i18n/navigation';
import { buttonVariants } from '@ui/components/button';
import { Badge } from '@ui/components/badge';
import { TemplateActions, type ListTemplate } from '@features/list-templates';
import { recurrenceSummary } from '@features/list-templates/recurrence-summary';
import { cn } from '@shared/lib/utils';
import { AvatarStack } from '../shared/Avatar';
import type { TemplatesPageProps } from '../types';

// Recurring templates as two board columns: running and paused. Pausing a
// template moves its card across.
export function TemplatesBoard({
  templates,
  activeTemplateId,
}: {
  templates: ListTemplate[];
  activeTemplateId?: string;
}) {
  const t = useTranslations('ListTemplates');
  const locale = useLocale();
  const columns = [
    {
      key: 'active',
      label: t('statusActive'),
      items: templates.filter((x) => x.status === 'active'),
    },
    {
      key: 'paused',
      label: t('statusPaused'),
      items: templates.filter((x) => x.status === 'paused'),
    },
  ];

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-extrabold tracking-tight">{t('title')}</h1>
        <Link href="/templates/new" className={buttonVariants()}>
          {t('createButton')}
        </Link>
      </div>
      {templates.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('emptyState')}</p>
      ) : null}
      <div className="flex gap-4 overflow-x-auto">
        {columns.map((column) => (
          <section
            key={column.key}
            aria-label={column.label}
            className="flex w-80 shrink-0 flex-col gap-2.5"
          >
            <header className="flex items-center gap-2 px-1 text-sm font-bold">
              <span
                aria-hidden="true"
                className={
                  column.key === 'active'
                    ? 'h-2.5 w-2.5 rounded-full bg-primary'
                    : 'h-2.5 w-2.5 rounded-full bg-border'
                }
              />
              {column.label}
              <span className="text-xs font-semibold tabular-nums text-muted-foreground">
                {column.items.length}
              </span>
            </header>
            <ul className="flex flex-col gap-2">
              {column.items.map((template) => (
                <li
                  key={template.id}
                  className={cn(
                    'flex flex-col gap-2 rounded-xl border bg-card p-3 shadow-sm',
                    template.id === activeTemplateId &&
                      'border-primary ring-2 ring-primary/30',
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <Link
                      href={`/templates/${template.id}`}
                      className="min-w-0 text-sm font-bold leading-tight tracking-tight hover:underline"
                    >
                      {template.title}
                    </Link>
                    <Badge
                      variant={
                        template.status === 'paused' ? 'secondary' : 'default'
                      }
                    >
                      {template.status === 'paused'
                        ? t('statusPaused')
                        : t('statusActive')}
                    </Badge>
                  </div>
                  <p className="text-xs font-semibold text-muted-foreground">
                    {recurrenceSummary(template, locale, t)} ·{' '}
                    {template.taskTitles.length}{' '}
                    {t('taskTitlesLabel').toLowerCase()}
                  </p>
                  <div className="flex items-center justify-between gap-2">
                    <AvatarStack people={template.collaborators} max={3} />
                    <TemplateActions
                      template={template}
                      className="ml-auto flex gap-1"
                    />
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}

export function TemplatesPage({ templates }: TemplatesPageProps) {
  return <TemplatesBoard templates={templates} />;
}
