'use client';

import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';
import { useRouter } from '@shared/lib/i18n/navigation';
import { cn } from '@shared/lib/utils';
import { Overlay } from '@ui/overlay/Overlay';

interface DrawerProps {
  backHref: '/' | '/templates';
  closeLabel: string;
  title: string;
  crumb: ReactNode;
  children: ReactNode;
  className?: string;
}

// A right-hand panel over the board. It is a route (/lists/[id]), not client
// state: "open" is always true, and every dismissal (Escape, the backdrop,
// the close button) navigates back to backHref instead of toggling local
// state - the URL, history and reload all behave.
export function Drawer({
  backHref,
  closeLabel,
  title,
  crumb,
  children,
  className,
}: DrawerProps) {
  const router = useRouter();

  return (
    <Overlay
      open
      onOpenChange={(next) => {
        if (!next) router.push(backHref);
      }}
      overlayClassName="fixed inset-0 z-30 bg-foreground/30 backdrop-blur-[1px]"
    >
      <aside
        className={cn(
          'fixed inset-y-0 right-0 z-40 flex w-full max-w-xl flex-col overflow-y-auto border-l bg-card shadow-2xl focus:outline-none',
          className,
        )}
      >
        <Dialog.Title className="sr-only">{title}</Dialog.Title>
        <div className="sticky top-0 z-10 flex items-center gap-2 border-b bg-card px-5 py-3 text-xs text-muted-foreground">
          {crumb}
          <Dialog.Close asChild>
            <button
              type="button"
              aria-label={closeLabel}
              className="ml-auto rounded-full p-1 hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X className="h-4 w-4" />
            </button>
          </Dialog.Close>
        </div>
        <div className="flex flex-col gap-6 p-5">{children}</div>
      </aside>
    </Overlay>
  );
}
