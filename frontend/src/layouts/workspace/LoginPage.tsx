import { useTranslations } from 'next-intl';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@ui/components/card';
import { LoginSignInButton } from '@features/auth/components/LoginSignInButton';
import type { LoginPageProps } from '../types';
import { BrandLink } from '../shared/BrandLink';

export function LoginPage({ locale, callbackUrl }: LoginPageProps) {
  const t = useTranslations('LoginPage');

  return (
    <main className="flex flex-1 flex-col items-center justify-center p-8">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <BrandLink locale={locale} />
          <p className="text-sm text-muted-foreground">{t('subtitle')}</p>
        </div>
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">{t('title')}</CardTitle>
            <CardDescription>{t('subtitle')}</CardDescription>
          </CardHeader>
          <CardContent>
            <LoginSignInButton callbackUrl={callbackUrl} />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
