'use client';

import { Button } from '@ui/components/button';
import { useSelectionContext } from './SelectionProvider';

interface SelectionToggleProps {
  selectLabel: string;
  cancelLabel: string;
  className?: string;
}

export function SelectionToggle({
  selectLabel,
  cancelLabel,
  className,
}: SelectionToggleProps) {
  const selection = useSelectionContext();
  if (!selection || selection.selectableCount === 0) {
    return null;
  }

  return (
    <Button
      type="button"
      variant={selection.active ? 'secondary' : 'ghost'}
      size="sm"
      aria-pressed={selection.active}
      className={className}
      onClick={selection.active ? selection.cancel : selection.start}
    >
      {selection.active ? cancelLabel : selectLabel}
    </Button>
  );
}
