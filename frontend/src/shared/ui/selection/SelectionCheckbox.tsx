'use client';

import { Checkbox } from '@ui/components/checkbox';
import { useSelectionContext } from './SelectionProvider';

interface SelectionCheckboxProps {
  id: string;
  label: string;
  className?: string;
}

export function SelectionCheckbox({
  id,
  label,
  className,
}: SelectionCheckboxProps) {
  const selection = useSelectionContext();
  if (!selection?.active || !selection.isSelectable(id)) {
    return null;
  }

  return (
    <Checkbox
      checked={selection.isSelected(id)}
      aria-label={label}
      className={className}
      onCheckedChange={() => selection.toggle(id)}
    />
  );
}
