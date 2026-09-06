'use client';

import type { ReactNode } from 'react';
import { Link, usePathname } from '@shared/lib/i18n/navigation';
import { cn } from '@shared/lib/utils';
import { activeNavKey, type NavItem } from './nav';

interface NavLinkProps {
  item: Pick<NavItem, 'key' | 'href'>;
  className?: string;
  activeClassName?: string;
  children: ReactNode;
}

// Active-state aware link for shell navigation. Keeps the pathname logic in
// one place so every shell highlights the same item for the same URL.
export function NavLink({
  item,
  className,
  activeClassName,
  children,
}: NavLinkProps) {
  const pathname = usePathname();
  const active = activeNavKey(pathname ?? '/') === item.key;
  return (
    <Link
      href={item.href}
      aria-current={active ? 'page' : undefined}
      className={cn(className, active && activeClassName)}
    >
      {children}
    </Link>
  );
}
