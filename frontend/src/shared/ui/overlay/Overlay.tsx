'use client';

import * as Dialog from '@radix-ui/react-dialog';
import type { ReactElement } from 'react';

interface OverlayProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger?: ReactElement;
  overlayClassName: string;
  children: ReactElement;
}

// Root/Trigger/Portal/Overlay/Content plumbing for every modal overlay in the
// app (the board's Drawer, the pocket layout's Sheet), so the focus trap,
// Escape-to-close, background inert and scroll lock all come from Radix
// instead of being hand-rolled per widget. `aria-describedby` is explicitly
// unset since none of our overlays have a Dialog.Description.
export function Overlay({
  open,
  onOpenChange,
  trigger,
  overlayClassName,
  children,
}: OverlayProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      {trigger ? <Dialog.Trigger asChild>{trigger}</Dialog.Trigger> : null}
      <Dialog.Portal>
        <Dialog.Overlay className={overlayClassName} />
        <Dialog.Content asChild aria-describedby={undefined}>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
