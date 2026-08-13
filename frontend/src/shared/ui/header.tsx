import { ChevronRight } from 'lucide-react';
import { Link } from '@shared/lib/i18n/navigation';
import { ThemeToggle, LocaleSwitcher } from '@features/preferences';

interface HeaderProps {
  locale: string;
}

// Structure/tokens mirror the hub's own Header (~/workspace/my-projects/src/shared/ui/header.tsx):
// border-b bg-background, mx-auto max-w-5xl h-14 px-4, font-semibold text-sm, not sticky,
// justify-between with a right-side ThemeToggle+LocaleSwitcher group. Two deliberate deviations:
// the hub only ever shows its own "blonskyi.dev" brand mark, but todolist is a sub-app under it,
// so this needs a second breadcrumb segment ("Todolist") with a separator - the hub has no
// equivalent to mirror. Differentiated by color only (muted vs foreground), not weight, so both
// segments still share the hub's font-semibold treatment. The hub's right-side group also has
// settings/avatar/sign-out - todolist is internal-only (ADR-003, trusted headers, no auth UI of
// its own) so only the two preference controls carry over.
export const Header = async ({ locale }: HeaderProps) => {
  return (
    <header className="border-b bg-background">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <a
            href={`${process.env.API_URL}/${locale}/projects`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-sm text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            blonskyi.dev
          </a>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
          <Link
            href="/"
            className="rounded-sm text-sm font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Todolist
          </Link>
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <LocaleSwitcher />
        </div>
      </div>
    </header>
  );
};
