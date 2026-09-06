import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import { Link } from '@shared/lib/i18n/navigation';
import { cn } from '@shared/lib/utils';

interface DrawerProps {
  backHref: '/' | '/templates';
  closeLabel: string;
  crumb: ReactNode;
  children: ReactNode;
  className?: string;
}

// A right-hand panel over the board. It is a route (/lists/[id]), not client
// state: "close" is a plain link back, so the URL, history and reload all
// behave. The backdrop is that same link.
export function Drawer({
  backHref,
  closeLabel,
  crumb,
  children,
  className,
}: DrawerProps) {
  return (
    <>
      <Link
        href={backHref}
        aria-label={closeLabel}
        className="fixed inset-0 z-30 bg-foreground/30 backdrop-blur-[1px]"
      />
      <aside
        role="dialog"
        aria-modal="true"
        className={cn(
          'fixed inset-y-0 right-0 z-40 flex w-full max-w-xl flex-col overflow-y-auto border-l bg-card shadow-2xl',
          className,
        )}
      >
        <div className="sticky top-0 z-10 flex items-center gap-2 border-b bg-card px-5 py-3 text-xs text-muted-foreground">
          {crumb}
          <Link
            href={backHref}
            aria-label={closeLabel}
            className="ml-auto rounded-full p-1 hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X className="h-4 w-4" />
          </Link>
        </div>
        <div className="flex flex-col gap-6 p-5">{children}</div>
      </aside>
    </>
  );
}
