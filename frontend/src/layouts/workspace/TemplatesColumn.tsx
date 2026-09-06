import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@shared/lib/i18n/navigation';
import { cn } from '@shared/lib/utils';
import { Badge } from '@ui/components/badge';
import { buttonVariants } from '@ui/components/button';
import type { ListTemplate } from '@features/list-templates';
import { recurrenceSummary } from '@features/list-templates/recurrence-summary';

interface TemplatesColumnProps {
  templates: ListTemplate[];
  activeTemplateId?: string | 'new';
}

export function TemplatesColumn({
  templates,
  activeTemplateId,
}: TemplatesColumnProps) {
  const t = useTranslations('ListTemplates');
  const locale = useLocale();

  return (
    <section
      aria-label={t('title')}
      className="flex w-full shrink-0 flex-col border-b md:w-80 md:border-b-0 md:border-r"
    >
      <div className="flex items-center justify-between px-4 pb-2 pt-4">
        <h2 className="text-sm font-semibold">{t('title')}</h2>
        <Link
          href="/templates/new"
          className={cn(
            buttonVariants({ size: 'sm' }),
            activeTemplateId === 'new' && 'ring-2 ring-ring ring-offset-2',
          )}
        >
          {t('createButton')}
        </Link>
      </div>
      {templates.length === 0 ? (
        <p className="px-4 py-6 text-sm text-muted-foreground">
          {t('emptyState')}
        </p>
      ) : (
        <ul className="flex flex-col">
          {templates.map((template) => {
            const active = template.id === activeTemplateId;
            const paused = template.status === 'paused';
            return (
              <li key={template.id}>
                <Link
                  href={`/templates/${template.id}`}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'block border-b px-4 py-2.5 hover:bg-muted',
                    active &&
                      'bg-accent shadow-[inset_3px_0_0_hsl(var(--primary))]',
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-medium">
                      {template.title}
                    </span>
                    <Badge variant={paused ? 'secondary' : 'default'}>
                      {paused ? t('statusPaused') : t('statusActive')}
                    </Badge>
                  </div>
                  <div className="mt-0.5 truncate text-xs text-muted-foreground">
                    {recurrenceSummary(template, locale, t)}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
