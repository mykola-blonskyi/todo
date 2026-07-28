'use client';

import { useTransition } from 'react';
import { Checkbox } from '@/components/ui/checkbox';

interface TaskToggleProps {
  taskId: string;
  done: boolean;
  action: (id: string) => Promise<void>;
}

export function TaskToggle({ taskId, done, action }: TaskToggleProps) {
  const [isPending, startTransition] = useTransition();

  return (
    <Checkbox
      checked={done}
      disabled={isPending}
      onCheckedChange={() => {
        startTransition(() => {
          void action(taskId);
        });
      }}
    />
  );
}
