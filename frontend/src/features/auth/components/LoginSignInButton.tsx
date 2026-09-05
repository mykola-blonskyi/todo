'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { getCsrfToken } from 'next-auth/react';
import { Button } from '@ui/components/button';

interface LoginSignInButtonProps {
  callbackUrl?: string;
}

// A plain HTML form POSTing straight to Auth.js's own /api/auth/signin/login,
// deliberately not signIn() or a Server Action: Next.js replays a Server
// Action whose result is an external navigation, a real bug the hub already
// root-caused (its ADR-015/016/017, and this repo's ADR-016).
export function LoginSignInButton({ callbackUrl }: LoginSignInButtonProps) {
  const t = useTranslations('LoginPage');
  const [csrfToken, setCsrfToken] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  const loadCsrfToken = useCallback(() => {
    getCsrfToken()
      .then((token) => (token ? setCsrfToken(token) : setFailed(true)))
      .catch(() => setFailed(true));
  }, []);

  useEffect(loadCsrfToken, [loadCsrfToken]);

  // Without a token the form can only be rejected, so offer a retry rather
  // than leaving a permanently disabled button and no explanation.
  if (failed) {
    return (
      <div className="space-y-2">
        <p className="text-sm text-destructive">{t('signInError')}</p>
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={() => {
            setFailed(false);
            loadCsrfToken();
          }}
        >
          {t('retryButton')}
        </Button>
      </div>
    );
  }

  return (
    <form method="POST" action="/api/auth/signin/login">
      <input type="hidden" name="csrfToken" value={csrfToken ?? ''} />
      {callbackUrl && (
        <input type="hidden" name="callbackUrl" value={callbackUrl} />
      )}
      <Button type="submit" className="w-full" disabled={!csrfToken}>
        {t('signInButton')}
      </Button>
    </form>
  );
}
