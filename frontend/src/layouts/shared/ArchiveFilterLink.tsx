import { useTranslations } from 'next-intl';
import { Link } from '@shared/lib/i18n/navigation';
import { cn } from '@shared/lib/utils';
import type { CategoryFilterState } from '../types';

interface ArchiveFilterLinkProps {
  filter?: CategoryFilterState;
  count: number;
  className?: string;
  activeClassName?: string;
  countClassName?: string;
}

// `filter` is optional because the shells that host this (workspace, terminal)
// never receive the page's filter state, and don't mark their own category
// links active either.
export function ArchiveFilterLink({
  filter,
  count,
  className,
  activeClassName,
  countClassName,
}: ArchiveFilterLinkProps) {
  const t = useTranslations('Nav');
  const active = filter?.archivedOnly === true;

  return (
    <Link
      href={active ? '/' : '/?archived=true'}
      aria-current={active ? 'page' : undefined}
      className={cn(className, active && activeClassName)}
    >
      {t('archive')} <span className={countClassName}>{count}</span>
    </Link>
  );
}
