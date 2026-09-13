'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@shared/lib/i18n/navigation';
import { Button } from '@shared/ui/components/button';

interface ErrorPageProps {
  error: Error & { digest?: string };
  // Not `reset`, which only clears the boundary: what fails here is a backend
  // fetch, so recovering means re-fetching (Next 16.2 error.js reference).
  unstable_retry: () => void;
}

export default function ErrorPage({ error, unstable_retry }: ErrorPageProps) {
  const t = useTranslations('Error');

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">{t('title')}</h1>
      <p className="text-muted-foreground">{t('body')}</p>
      <div className="flex items-center gap-3">
        <Button onClick={() => unstable_retry()}>{t('retry')}</Button>
        <Link href="/" className="text-sm text-primary hover:underline">
          {t('backToLists')}
        </Link>
      </div>
      {/* Next strips the message in production and leaves only this hash,
          which is what ties the page a user is looking at to a server log. */}
      {error.digest ? (
        <p className="text-xs text-muted-foreground">
          {t('reference', { digest: error.digest })}
        </p>
      ) : null}
    </div>
  );
}
