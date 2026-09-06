import { cn } from '@shared/lib/utils';

// One look for the three preference <select>s + LocaleSwitcher. `ui-select`
// is the hook the per-layout stylesheet (globals.css [data-layout=...])
// restyles - keep it on every preference control.
export function preferenceSelectClassName(className?: string) {
  return cn(
    'ui-select h-9 rounded-md border border-input bg-background px-2 text-sm text-foreground ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50',
    className,
  );
}
