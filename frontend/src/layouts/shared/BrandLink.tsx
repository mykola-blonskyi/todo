import { ChevronRight } from 'lucide-react';
import { Link } from '@shared/lib/i18n/navigation';
import { cn } from '@shared/lib/utils';

interface BrandLinkProps {
  locale: string;
  className?: string;
  // Some shells (Pocket, Terminal) have no room for the hub breadcrumb and
  // show only the app name.
  hideHub?: boolean;
}

// The hub breadcrumb carried over from the pre-layouts header: todolist is a
// sub-app of blonskyi.dev, so every shell keeps a way back to the hub.
export function BrandLink({ locale, className, hideHub }: BrandLinkProps) {
  return (
    <div className={cn('flex min-w-0 items-center gap-1.5', className)}>
      {hideHub ? null : (
        <>
          <a
            href={`${process.env.HUB_URL}/${locale}/projects`}
            target="_blank"
            rel="noopener noreferrer"
            className="truncate rounded-sm text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            blonskyi.dev
          </a>
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
        </>
      )}
      <Link
        href="/"
        className="truncate rounded-sm text-sm font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        Todolist
      </Link>
    </div>
  );
}
