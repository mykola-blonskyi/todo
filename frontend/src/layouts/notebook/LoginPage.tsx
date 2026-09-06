import { useTranslations } from 'next-intl';
import { LoginSignInButton } from '@features/auth/components/LoginSignInButton';
import type { LoginPageProps } from '../types';

// The closed notebook: a cover with an elastic band and a paper label.
export function LoginPage({ callbackUrl }: LoginPageProps) {
  const t = useTranslations('LoginPage');

  return (
    <main className="flex flex-1 flex-col items-center justify-center p-8">
      <div className="relative w-full max-w-sm rounded-l-sm rounded-r-lg border border-foreground/20 bg-primary p-8 pl-10 text-primary-foreground shadow-[0_24px_50px_-30px_rgba(0,0,0,0.6)]">
        <span
          aria-hidden="true"
          className="absolute bottom-0 right-8 top-0 w-2 bg-foreground/40"
        />
        <span
          aria-hidden="true"
          className="absolute bottom-0 left-3 top-0 w-px border-l border-dashed border-primary-foreground/40"
        />
        <div className="nb-paper nb-margin -rotate-1 px-6 py-5 pl-10 text-foreground shadow-md">
          <h1 className="nb-hand text-4xl font-semibold leading-8">Todolist</h1>
          <p className="mb-4 mt-1 text-sm leading-6 text-muted-foreground">
            {t('subtitle')}
          </p>
          <LoginSignInButton callbackUrl={callbackUrl} />
        </div>
      </div>
    </main>
  );
}
