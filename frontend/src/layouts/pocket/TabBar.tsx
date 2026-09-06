'use client';

import { useTranslations } from 'next-intl';
import { LayoutList, Repeat, Settings, Tags } from 'lucide-react';
import { cn } from '@shared/lib/utils';
import { NavLink } from '../shared/NavLink';
import type { NavKey } from '../shared/nav';

const ICONS = {
  lists: LayoutList,
  templates: Repeat,
  categories: Tags,
  settings: Settings,
} as const;

const ITEMS: {
  key: NavKey;
  href: '/' | '/templates' | '/categories' | '/settings';
}[] = [
  { key: 'lists', href: '/' },
  { key: 'templates', href: '/templates' },
  { key: 'categories', href: '/categories' },
  { key: 'settings', href: '/settings' },
];

export function TabBar({
  label,
  pendingInvites,
}: {
  label: string;
  pendingInvites: number;
}) {
  const t = useTranslations('Nav');

  return (
    <nav
      aria-label={label}
      className="fixed bottom-0 left-1/2 z-20 grid w-full max-w-md -translate-x-1/2 grid-cols-4 border-t bg-card/95 px-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur"
    >
      {ITEMS.map((item) => {
        const Icon = ICONS[item.key];
        return (
          <NavLink
            key={item.key}
            item={item}
            className="relative flex flex-col items-center gap-0.5 rounded-xl py-1 text-[11px] font-bold text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            activeClassName="text-primary"
          >
            <Icon className="h-6 w-6" aria-hidden="true" />
            {t(item.key)}
            {item.key === 'lists' && pendingInvites > 0 ? (
              <span
                className={cn(
                  'absolute right-1/4 top-0 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] text-primary-foreground',
                )}
              >
                {pendingInvites}
              </span>
            ) : null}
          </NavLink>
        );
      })}
    </nav>
  );
}
