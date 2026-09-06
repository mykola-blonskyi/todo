import { useTranslations } from 'next-intl';
import { LoginSignInButton } from '@features/auth/components/LoginSignInButton';
import type { LoginPageProps } from '../types';

export function LoginPage({ callbackUrl }: LoginPageProps) {
  const t = useTranslations('LoginPage');

  return (
    <main className="flex flex-1 flex-col items-center justify-center p-8">
      <div className="w-full max-w-sm overflow-hidden rounded-md border bg-card">
        <div className="border-b bg-muted/60 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Todolist · {t('title')}
        </div>
        <div className="grid grid-cols-[6rem_1fr] gap-x-3 gap-y-2 px-4 py-3 text-xs">
          <span className="text-muted-foreground">app</span>
          <span>todo.blonskyi.dev</span>
          <span className="text-muted-foreground">identity</span>
          <span>login.blonskyi.dev</span>
          <span className="text-muted-foreground">status</span>
          <span>{t('subtitle')}</span>
        </div>
        <div className="border-t p-4">
          <LoginSignInButton callbackUrl={callbackUrl} />
        </div>
      </div>
    </main>
  );
}
