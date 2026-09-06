import type { ReactNode } from 'react';
import { Link } from '@shared/lib/i18n/navigation';
import { cn } from '@shared/lib/utils';
import type { Category } from '@features/categories';
import { categoryColor } from '../shared/list-stats';

interface SpreadProps {
  left: ReactNode;
  right: ReactNode;
  // Category tabs on the fore-edge; the active one sits proud of the others.
  tabs?: Category[];
  activeTabId?: string | null;
  tabsLabel?: string;
  leftNumber?: number;
  rightNumber?: number;
}

// Two facing pages: ruled paper, a red margin line, a gutter shadow, index
// tabs on the right-hand edge. Stacks to one page per screen on phones.
export function Spread({
  left,
  right,
  tabs,
  activeTabId,
  tabsLabel,
  leftNumber = 1,
  rightNumber = 2,
}: SpreadProps) {
  return (
    <div className="relative mx-auto w-full max-w-6xl">
      <div className="grid overflow-hidden rounded-md shadow-[0_24px_50px_-30px_rgba(0,0,0,0.45)] md:grid-cols-2">
        <Page number={leftNumber} side="left">
          {left}
        </Page>
        <Page number={rightNumber} side="right">
          {right}
        </Page>
      </div>
      {tabs && tabs.length > 0 ? (
        <nav
          aria-label={tabsLabel}
          className="absolute right-0 top-16 hidden translate-x-full flex-col gap-1.5 md:flex"
        >
          {tabs.map((tab) => (
            <Link
              key={tab.id}
              href={`/?categoryId=${tab.id}`}
              className={cn(
                'rounded-r px-1.5 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-white shadow-[2px_2px_4px_rgba(0,0,0,0.18)] transition-[padding] [writing-mode:vertical-rl] hover:pr-3',
                tab.id === activeTabId && 'pr-3',
              )}
              style={{ background: categoryColor(tab.id) }}
            >
              {tab.name}
            </Link>
          ))}
        </nav>
      ) : null}
    </div>
  );
}

function Page({
  number,
  side,
  children,
}: {
  number: number;
  side: 'left' | 'right';
  children: ReactNode;
}) {
  return (
    <section
      className={cn(
        'nb-paper nb-margin relative min-h-[36rem] px-8 pb-12 pt-10 text-[15px] md:px-12 md:pl-14',
        side === 'left'
          ? 'md:shadow-[inset_-18px_0_24px_-20px_rgba(0,0,0,0.35)]'
          : 'md:shadow-[inset_18px_0_24px_-20px_rgba(0,0,0,0.35)]',
      )}
    >
      {children}
      <span
        aria-hidden="true"
        className={cn(
          'absolute bottom-3 text-xs text-muted-foreground',
          side === 'left' ? 'left-14' : 'right-12',
        )}
      >
        — {number} —
      </span>
    </section>
  );
}
