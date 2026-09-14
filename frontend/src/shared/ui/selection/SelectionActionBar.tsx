'use client';

import { useState, useTransition } from 'react';
import { cn } from '@shared/lib/utils';
import { Button } from '@ui/components/button';
import { useSelectionContext } from './SelectionProvider';

export interface BulkActionResult {
  succeededIds: string[];
  failedIds: string[];
}

export interface SelectionCopy {
  selectedCount: (count: number) => string;
  selectAll: (count: number) => string;
  clear: string;
  delete: string;
  confirm: (count: number) => string;
  partialFailure: (succeeded: number, failed: number) => string;
  failed: string;
}

interface SelectionActionBarProps {
  copy: SelectionCopy;
  action: (ids: string[]) => Promise<BulkActionResult>;
  className?: string;
}

export function SelectionActionBar({
  copy,
  action,
  className,
}: SelectionActionBarProps) {
  const selection = useSelectionContext();
  const [isPending, startTransition] = useTransition();
  const [failure, setFailure] = useState<string | null>(null);
  const active = selection?.active ?? false;
  const [reportedFor, setReportedFor] = useState(active);

  if (reportedFor !== active) {
    setReportedFor(active);
    setFailure(null);
  }

  const ids = selection?.selectedIds ?? [];

  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-2 text-sm',
        isPending && 'opacity-60',
        !active && 'sr-only',
        className,
      )}
    >
      {/* Mounted whether or not selection mode is active: several screen
          readers skip a live region that appears together with its first
          message, so the count has to already be here for entering selection
          mode to be announced at all. */}
      <span role="status" aria-live="polite" className="tabular-nums">
        {active ? copy.selectedCount(ids.length) : ''}
      </span>
      {active && selection ? (
        <>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={isPending}
            onClick={selection.selectAll}
          >
            {copy.selectAll(selection.selectableCount)}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={isPending || ids.length === 0}
            onClick={selection.clear}
          >
            {copy.clear}
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            disabled={isPending || ids.length === 0}
            onClick={() => {
              if (!window.confirm(copy.confirm(ids.length))) {
                return;
              }
              startTransition(async () => {
                try {
                  const result = await action(ids);
                  if (result.failedIds.length > 0) {
                    setFailure(
                      copy.partialFailure(
                        result.succeededIds.length,
                        result.failedIds.length,
                      ),
                    );
                    return;
                  }
                  setFailure(null);
                  selection.cancel();
                } catch {
                  setFailure(copy.failed);
                }
              });
            }}
          >
            {copy.delete}
          </Button>
        </>
      ) : null}
      <span role="status" className="text-destructive">
        {failure ?? ''}
      </span>
    </div>
  );
}
