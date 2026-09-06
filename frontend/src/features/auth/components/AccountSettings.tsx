import { useTranslations } from 'next-intl';
import { cn } from '@shared/lib/utils';
import { LoginSignOutButton } from './LoginSignOutButton';

interface AccountSettingsProps {
  locale: string;
  email: string;
  name: string | null;
  className?: string;
}

export function AccountSettings({
  locale,
  email,
  name,
  className,
}: AccountSettingsProps) {
  const t = useTranslations('Settings');
  return (
    <div
      className={cn(
        'flex flex-wrap items-center justify-between gap-3',
        className,
      )}
    >
      <div className="min-w-0 text-sm">
        {name ? <div className="font-medium">{name}</div> : null}
        <div className="truncate text-muted-foreground">
          {t('signedInAs', { email })}
        </div>
      </div>
      <LoginSignOutButton locale={locale} />
    </div>
  );
}
