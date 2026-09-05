'use client';

import { useEffect, useState } from 'react';
import { getCsrfToken } from 'next-auth/react';
import { Button } from '@ui/components/button';

interface LoginSignInButtonProps {
  label: string;
  callbackUrl?: string;
}

// A plain HTML form POSTing straight to Auth.js's own
// /api/auth/signin/login, not a client-side signIn() call and not a Server
// Action: the hub hit real bugs with both of those (see the hub repo's own
// ADR-015/ADR-016/ADR-017, and this repo's docs/decisions.md ADR-016) - any
// Server Action here gets wrapped in Next.js's internal startTransition,
// which replays once the resulting external navigation lands on a page
// that also uses Server Actions, and dropping our own useTransition isn't
// enough since the wrapping happens inside Next.js's framework code
// regardless. A native form submit leaves no React/Next.js request-handling
// in the loop at all.
export function LoginSignInButton({
  label,
  callbackUrl,
}: LoginSignInButtonProps) {
  const [csrfToken, setCsrfToken] = useState<string | null>(null);

  useEffect(() => {
    getCsrfToken().then(setCsrfToken);
  }, []);

  return (
    <form method="POST" action="/api/auth/signin/login">
      <input type="hidden" name="csrfToken" value={csrfToken ?? ''} />
      {callbackUrl && (
        <input type="hidden" name="callbackUrl" value={callbackUrl} />
      )}
      <Button type="submit" className="w-full" disabled={!csrfToken}>
        {label}
      </Button>
    </form>
  );
}
