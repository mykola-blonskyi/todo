'use client';

import { useOptimistic, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { updateLayoutAction } from './actions';
import { layouts, isLayout, type Layout } from './types';
import { preferenceSelectClassName } from './select-class';

interface LayoutSwitcherProps {
  layout: Layout;
  className?: string;
}

// The whole shell is server-rendered from the layout cookie, so this is a
// plain Server Action round-trip: the action sets the cookie and Next.js
// re-renders the route in the new shell. The select stays disabled while
// that is in flight so a second change can't race the first.
export function LayoutSwitcher({ layout, className }: LayoutSwitcherProps) {
  const t = useTranslations('LayoutSwitcher');
  const [isPending, startTransition] = useTransition();
  const [optimistic, setOptimistic] = useOptimistic(layout);

  function handleChange(event: React.ChangeEvent<HTMLSelectElement>) {
    const next = event.target.value;
    if (!isLayout(next)) return;
    startTransition(async () => {
      setOptimistic(next);
      await updateLayoutAction(next);
    });
  }

  return (
    <select
      value={optimistic}
      onChange={handleChange}
      disabled={isPending}
      aria-label={t('label')}
      className={preferenceSelectClassName(className)}
    >
      {layouts.map((value) => (
        <option key={value} value={value}>
          {t(value)}
        </option>
      ))}
    </select>
  );
}
