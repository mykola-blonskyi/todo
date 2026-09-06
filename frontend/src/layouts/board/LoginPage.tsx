import { useTranslations } from 'next-intl';
import { LoginSignInButton } from '@features/auth/components/LoginSignInButton';
import type { LoginPageProps } from '../types';

// Sign-in as a lone card on an otherwise empty board - three ghost columns
// hint at what's behind the door.
export function LoginPage({ callbackUrl }: LoginPageProps) {
  const t = useTranslations('LoginPage');

  return (
    <main className="relative flex flex-1 flex-col items-center justify-center overflow-hidden p-8">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 flex justify-center gap-4 p-6 opacity-40"
      >
        {[0, 1, 2].map((column) => (
          <div key={column} className="flex w-56 flex-col gap-2">
            <div className="h-3 w-24 rounded-full bg-border" />
            {[0, 1, 2].map((card) => (
              <div key={card} className="h-16 rounded-xl border bg-card" />
            ))}
          </div>
        ))}
      </div>
      <div className="relative w-full max-w-sm rounded-2xl border bg-card p-6 shadow-xl">
        <h1 className="text-2xl font-extrabold tracking-tight">Todolist</h1>
        <p className="mb-6 mt-1 text-sm text-muted-foreground">
          {t('subtitle')}
        </p>
        <LoginSignInButton callbackUrl={callbackUrl} />
      </div>
    </main>
  );
}
