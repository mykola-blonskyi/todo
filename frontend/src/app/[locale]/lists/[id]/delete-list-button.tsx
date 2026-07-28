'use client';

import { useTransition } from 'react';
import { Button } from '@/components/ui/button';

interface DeleteListButtonProps {
  action: () => Promise<void>;
  label: string;
  confirmMessage: string;
}

// The only piece of this page that needs client JS - a native confirm()
// before an irreversible delete. Everything else stays a Server Component.
export function DeleteListButton({ action, label, confirmMessage }: DeleteListButtonProps) {
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="destructive"
      disabled={isPending}
      onClick={() => {
        if (window.confirm(confirmMessage)) {
          startTransition(() => {
            void action();
          });
        }
      }}
    >
      {label}
    </Button>
  );
}
