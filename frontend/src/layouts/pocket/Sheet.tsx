'use client';

import { useState, type ReactNode } from 'react';
import { Plus, X } from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';
import { cn } from '@shared/lib/utils';
import { Overlay } from '@ui/overlay/Overlay';

interface SheetProps {
  // Accessible name for the FAB and the sheet.
  label: string;
  closeLabel: string;
  children: ReactNode;
  className?: string;
}

// FAB + bottom sheet. The sheet content is server-rendered (a form, usually)
// and simply hidden until opened; opening is the only client state.
export function Sheet({ label, closeLabel, children, className }: SheetProps) {
  const [open, setOpen] = useState(false);

  return (
    <Overlay
      open={open}
      onOpenChange={setOpen}
      overlayClassName="fixed inset-0 z-30 bg-foreground/30"
      trigger={
        <button
          type="button"
          aria-label={label}
          className={cn(
            'fixed bottom-24 right-[max(1rem,calc(50%-14rem+1rem))] z-20 grid h-14 w-14 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-[0_10px_24px_-8px_hsl(var(--primary)/0.6)] transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            className,
          )}
        >
          <Plus className="h-7 w-7" aria-hidden="true" />
        </button>
      }
    >
      <section className="fixed bottom-0 left-1/2 z-40 flex w-full max-w-md -translate-x-1/2 flex-col gap-3 rounded-t-3xl bg-card p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-[0_-10px_30px_-20px_rgba(0,0,0,0.5)] focus:outline-none">
        <span
          aria-hidden="true"
          className="mx-auto h-1 w-10 rounded-full bg-border"
        />
        <div className="flex items-center justify-between">
          <Dialog.Title className="text-base font-extrabold">
            {label}
          </Dialog.Title>
          <Dialog.Close asChild>
            <button
              type="button"
              aria-label={closeLabel}
              className="rounded-full p-1 hover:bg-secondary"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </Dialog.Close>
        </div>
        {children}
      </section>
    </Overlay>
  );
}
