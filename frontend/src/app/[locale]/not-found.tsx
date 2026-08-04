import { getTranslations } from 'next-intl/server';
import { Link } from '@shared/lib/i18n/navigation';

export default async function NotFound() {
  const t = await getTranslations('Lists');

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">
        {t('notFoundTitle')}
      </h1>
      <p className="text-muted-foreground">{t('notFoundBody')}</p>
      <Link href="/" className="text-sm text-primary hover:underline">
        {t('backToLists')}
      </Link>
    </div>
  );
}
