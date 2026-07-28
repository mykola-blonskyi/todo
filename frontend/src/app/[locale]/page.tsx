import { getTranslations } from 'next-intl/server';
import { graphqlFetch } from '@/lib/graphql-client';
import { Link } from '@/lib/i18n/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { createListAction } from './actions';

interface ListSummary {
  id: string;
  title: string;
}

export default async function HomePage() {
  const t = await getTranslations('Lists');
  const { myLists: lists } = await graphqlFetch<{ myLists: ListSummary[] }>(
    `query { myLists { id title } }`,
  );

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 p-8">
      <h1 className="text-3xl font-semibold tracking-tight">{t('title')}</h1>

      <form action={createListAction} className="flex gap-2">
        <Input name="title" placeholder={t('createPlaceholder')} required />
        <Button type="submit">{t('createButton')}</Button>
      </form>

      {lists.length === 0 ? (
        <p className="text-muted-foreground">{t('emptyState')}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {lists.map((list) => (
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
          ))}
        </ul>
      )}
    </div>
  );
}
