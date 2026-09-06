import { useTranslations } from 'next-intl';
import { LoginSignInButton } from '@features/auth/components/LoginSignInButton';
import type { LoginPageProps } from '../types';

// A login prompt: the banner, a couple of "system" lines, one action.
export function LoginPage({ callbackUrl }: LoginPageProps) {
  const t = useTranslations('LoginPage');

  return (
    <main className="flex flex-1 flex-col items-center justify-center p-8">
      <div className="w-full max-w-md border p-6 leading-6">
        <pre className="text-primary" aria-hidden="true">{String.raw`
 _____         _       _ _     _
|_   _|__   __| | ___ | (_)___| |_
  | |/ _ \ / _\` |/ _ \| | / __| __|
  | | (_) | (_| | (_) | | \__ \ |_
  |_|\___/ \__,_|\___/|_|_|___/\__|`}</pre>
        <h1 className="sr-only">Todolist</h1>
        <p className="mt-4 text-muted-foreground">
          <span className="text-primary">$</span> {t('subtitle').toLowerCase()}
        </p>
        <p className="mb-4 text-muted-foreground">
          <span className="text-primary">$</span> {t('title').toLowerCase()} →
          login.blonskyi.dev
        </p>
        <LoginSignInButton callbackUrl={callbackUrl} />
      </div>
    </main>
  );
}
