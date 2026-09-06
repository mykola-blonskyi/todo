import { ChevronLeft } from 'lucide-react';
import { Link } from '@shared/lib/i18n/navigation';

export function BackLink({
  href,
  label,
}: {
  href: '/' | '/templates';
  label: string;
}) {
  return (
    <Link
      href={href}
      className="-ml-1 inline-flex items-center gap-0.5 self-start rounded-lg py-1 pr-2 text-sm font-bold text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <ChevronLeft className="h-5 w-5" aria-hidden="true" />
      {label}
    </Link>
  );
}

export function Group({
  title,
  children,
}: {
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-2">
      {title ? (
        <h2 className="px-1 text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
          {title}
        </h2>
      ) : null}
      <div className="rounded-2xl bg-card p-4 shadow-[0_1px_2px_hsl(var(--foreground)/0.06)]">
        {children}
      </div>
    </section>
  );
}
