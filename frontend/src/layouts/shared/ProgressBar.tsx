import { cn } from '@shared/lib/utils';
import type { Progress } from './list-stats';

interface ProgressBarProps {
  progress: Progress;
  className?: string;
  trackClassName?: string;
}

export function ProgressBar({
  progress,
  className,
  trackClassName,
}: ProgressBarProps) {
  return (
    <span
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={progress.total}
      aria-valuenow={progress.done}
      className={cn(
        'block h-1.5 w-full overflow-hidden rounded-full bg-secondary',
        trackClassName,
        className,
      )}
    >
      <span
        className="block h-full rounded-full bg-primary transition-[width]"
        style={{ width: `${progress.percent}%` }}
      />
    </span>
  );
}

interface ProgressRingProps {
  progress: Progress;
  size?: number;
  className?: string;
  label?: string;
}

// conic-gradient ring, same trick the Dashboard/Pocket mockups used.
export function ProgressRing({
  progress,
  size = 36,
  className,
  label,
}: ProgressRingProps) {
  return (
    <span
      role="img"
      aria-label={label ?? `${progress.done}/${progress.total}`}
      className={cn(
        'relative inline-grid shrink-0 place-items-center rounded-full',
        className,
      )}
      style={{
        width: size,
        height: size,
        background: `conic-gradient(hsl(var(--primary)) ${progress.percent}%, hsl(var(--secondary)) 0)`,
      }}
    >
      <span
        className="grid place-items-center rounded-full bg-card text-[10px] font-semibold tabular-nums"
        style={{ width: size - 10, height: size - 10 }}
      >
        {label ?? `${progress.percent}%`}
      </span>
    </span>
  );
}
