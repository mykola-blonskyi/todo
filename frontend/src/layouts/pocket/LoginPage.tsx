import { useTranslations } from 'next-intl';
import { LoginSignInButton } from '@features/auth/components/LoginSignInButton';
import type { LoginPageProps } from '../types';

// App splash: brand up top, the one button pinned to the thumb zone.
export function LoginPage({ callbackUrl }: LoginPageProps) {
  const t = useTranslations('LoginPage');

  return (
    <main className="flex flex-1 flex-col justify-between px-6 pb-[max(2rem,env(safe-area-inset-bottom))] pt-24">
      <div>
        <span
          aria-hidden="true"
          className="mb-6 grid h-16 w-16 place-items-center rounded-3xl bg-primary text-3xl font-extrabold text-primary-foreground shadow-[0_10px_24px_-8px_hsl(var(--primary)/0.6)]"
        >
          ✓
        </span>
        <h1 className="text-4xl font-extrabold tracking-tight">Todolist</h1>
        <p className="mt-2 text-base text-muted-foreground">{t('subtitle')}</p>
      </div>
      <div className="[&_button]:h-12 [&_button]:text-base">
        <LoginSignInButton callbackUrl={callbackUrl} />
      </div>
    </main>
  );
}
