import { ChevronRight } from 'lucide-react';
import { Link } from '@shared/lib/i18n/navigation';

interface HeaderProps {
  locale: string;
}

export const Header = async ({ locale }: HeaderProps) => {
  return (
    <header className="sticky top-0 z-10 flex h-14 items-center gap-2 border-b bg-background px-4">
      <a
        href={`${process.env.API_URL}/${locale}/projects`}
        target="_blank"
        rel="noopener noreferrer"
        className="rounded-sm text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        blonskyi.dev
      </a>
      <ChevronRight className="h-4 w-4 text-muted-foreground" />
      <Link
        href="/"
        className="rounded-sm font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        Todolist
      </Link>
    </header>
  );
};
