import { cn } from '@shared/lib/utils';
import { initials } from './list-stats';

interface AvatarProps {
  person: { name: string | null; email: string; image?: string | null };
  className?: string;
  size?: 'sm' | 'md';
}

// Initials circle - no <img>: the hub's `image` is a remote URL, and
// next/image would need a remotePatterns entry per host. Initials are also
// what every mockup used, so the layouts stay consistent.
export function Avatar({ person, className, size = 'sm' }: AvatarProps) {
  return (
    <span
      title={person.name ?? person.email}
      aria-hidden="true"
      className={cn(
        'inline-grid shrink-0 place-items-center rounded-full bg-secondary font-semibold text-secondary-foreground ring-2 ring-background',
        size === 'sm' ? 'h-6 w-6 text-[10px]' : 'h-8 w-8 text-xs',
        className,
      )}
    >
      {initials(person.name ?? person.email)}
    </span>
  );
}

interface AvatarStackProps {
  people: AvatarProps['person'][];
  max?: number;
  className?: string;
}

export function AvatarStack({ people, max = 3, className }: AvatarStackProps) {
  if (people.length === 0) return null;
  const shown = people.slice(0, max);
  const rest = people.length - shown.length;
  return (
    <span className={cn('inline-flex -space-x-2', className)}>
      {shown.map((person) => (
        <Avatar key={person.email} person={person} />
      ))}
      {rest > 0 ? (
        <span className="inline-grid h-6 w-6 place-items-center rounded-full bg-muted text-[10px] font-semibold text-muted-foreground ring-2 ring-background">
          +{rest}
        </span>
      ) : null}
    </span>
  );
}
