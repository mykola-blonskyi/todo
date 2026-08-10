'use client';

import { Link } from '@shared/lib/i18n/navigation';
import { ListSummary } from '@shared/types/lists';
import { Card, CardContent } from '@ui/components/card';

interface ListRowProps {
  list: ListSummary;
}

export const ListRow = ({ list }: ListRowProps) => {
  return (
    <li key={list.id}>
      <Link
        href={`/lists/${list.id}`}
        className="block rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Card className="transition-colors hover:bg-accent hover:text-accent-foreground">
          <CardContent className="p-4">{list.title}</CardContent>
        </Card>
      </Link>
    </li>
  );
};
