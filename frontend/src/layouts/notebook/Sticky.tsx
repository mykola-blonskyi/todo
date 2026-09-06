import type { ReactNode } from 'react';
import { cn } from '@shared/lib/utils';

// A sticky note: accent-coloured, slightly rotated, a strip of "tape" on
// top. Used for comments and invites - things stuck onto the page rather
// than written on its lines.
export function Sticky({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <aside
      className={cn(
        'relative -rotate-1 bg-accent p-4 text-accent-foreground shadow-[2px_4px_10px_rgba(0,0,0,0.18)]',
        className,
      )}
      style={{ lineHeight: '1.4' }}
    >
      <span
        aria-hidden="true"
        className="absolute -top-2 left-1/2 h-4 w-12 -translate-x-1/2 bg-foreground/10"
      />
      {children}
    </aside>
  );
}
