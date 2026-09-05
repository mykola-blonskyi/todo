import { getTranslations } from 'next-intl/server';
import { Button } from '@ui/components/button';
import { signOutAction } from '../actions';

interface LoginSignOutButtonProps {
  locale: string;
}

// A Server Action here, unlike LoginSignInButton's plain form POST: the
// replay bug ADR-016 documents only bites when the action's result is a
// navigation off our own origin. Sign-out just clears the local session and
// lands back on /[locale]/login, so it mirrors the hub's own logout action.
export async function LoginSignOutButton({ locale }: LoginSignOutButtonProps) {
  const t = await getTranslations('Nav');

  return (
    <form action={signOutAction.bind(null, locale)}>
      <Button type="submit" variant="ghost" size="sm">
        {t('signOut')}
      </Button>
    </form>
  );
}
