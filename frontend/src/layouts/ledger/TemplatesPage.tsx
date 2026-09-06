import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@shared/lib/i18n/navigation';
import { Badge } from '@ui/components/badge';
import { buttonVariants } from '@ui/components/button';
import { TemplateActions } from '@features/list-templates';
import { recurrenceSummary } from '@features/list-templates/recurrence-summary';
import type { TemplatesPageProps } from '../types';
import { AvatarStack } from '../shared/Avatar';

export function TemplatesPage({ templates }: TemplatesPageProps) {
  const t = useTranslations('ListTemplates');
  const tLedger = useTranslations('Ledger');
  const locale = useLocale();

  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-2 border-b px-4 py-2">
        <h1 className="font-semibold">{t('title')}</h1>
        <span className="text-xs text-muted-foreground">
          {templates.length}
        </span>
        <Link
          href="/templates/new"
          className={`${buttonVariants({ size: 'sm' })} ml-auto`}
        >
          {t('createButton')}
        </Link>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead className="bg-muted/60 text-xs">
            <tr>
              <th
                scope="col"
                className="px-3 py-2 text-left font-semibold text-muted-foreground"
              >
                {t('titleLabel')}
              </th>
              <th
                scope="col"
                className="px-3 py-2 text-left font-semibold text-muted-foreground"
              >
                {t('recurrenceTypeLabel')}
              </th>
              <th
                scope="col"
                className="px-3 py-2 text-left font-semibold text-muted-foreground"
              >
                {t('taskTitlesLabel')}
              </th>
              <th
                scope="col"
                className="hidden px-3 py-2 text-left font-semibold text-muted-foreground md:table-cell"
              >
                {t('collaboratorsTitle')}
              </th>
              <th
                scope="col"
                className="px-3 py-2 text-left font-semibold text-muted-foreground"
              >
                {tLedger('colStatus')}
              </th>
              <th
                scope="col"
                className="px-3 py-2 text-right font-semibold text-muted-foreground"
              >
                {tLedger('colActions')}
              </th>
            </tr>
          </thead>
          <tbody>
            {templates.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-8 text-center text-muted-foreground"
                >
                  {t('emptyState')}
                </td>
              </tr>
            ) : null}
            {templates.map((template) => (
              <tr key={template.id} className="border-t hover:bg-muted/50">
                <td className="px-3 py-2 font-semibold">
                  <Link
                    href={`/templates/${template.id}`}
                    className="hover:underline"
                  >
                    {template.title}
                  </Link>
                </td>
                <td className="px-3 py-2 text-muted-foreground">
                  {recurrenceSummary(template, locale, t)}
                </td>
                <td className="px-3 py-2 tabular-nums text-muted-foreground">
                  {template.taskTitles.length}
                </td>
                <td className="hidden px-3 py-2 md:table-cell">
                  <AvatarStack people={template.collaborators} />
                  {template.collaborators.length === 0 ? (
                    <span className="text-muted-foreground">—</span>
                  ) : null}
                </td>
                <td className="px-3 py-2">
                  <Badge
                    variant={
                      template.status === 'paused' ? 'secondary' : 'default'
                    }
                  >
                    {template.status === 'paused'
                      ? t('statusPaused')
                      : t('statusActive')}
                  </Badge>
                </td>
                <td className="px-3 py-1 text-right">
                  <TemplateActions
                    template={template}
                    className="inline-flex gap-1"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
