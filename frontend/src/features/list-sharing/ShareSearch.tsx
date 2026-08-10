'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Loader2, Search, UserRound } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Input } from '@ui/components/input';
import { Label } from '@ui/components/label';
import { Card } from '@ui/components/card';
import { searchShareCandidatesAction, inviteToListAction } from './actions';
import type { ShareCandidate } from './types';

interface ShareSearchProps {
  listId: string;
}

// Debounced so search fires once typing pauses, not on every keystroke - the
// timeout lives in a useEffect (not the input's change handler) so its
// cleanup actually runs and cancels stale in-flight timers.
export function ShareSearch({ listId }: ShareSearchProps) {
  const t = useTranslations('Sharing');
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [invitedId, setInvitedId] = useState<string | null>(null);

  useEffect(() => {
    const handle = setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => clearTimeout(handle);
  }, [query]);

  const {
    data: results = [],
    isFetching,
    isError,
  } = useQuery({
    queryKey: ['shareCandidates', listId, debouncedQuery],
    queryFn: () => searchShareCandidatesAction(listId, debouncedQuery),
    enabled: debouncedQuery.length > 0,
    staleTime: 30_000,
    // Interactive search should fail fast, not retry 3x with backoff (the
    // default) - a failure here isn't a transient network blip that
    // self-resolves, and 5+ seconds before any error feedback is too slow
    // for a search-as-you-type interaction.
    retry: false,
  });

  const invite = useMutation({
    mutationFn: (candidate: ShareCandidate) =>
      inviteToListAction(listId, candidate),
    onSuccess: (_data, candidate) => {
      setInvitedId(candidate.hubUserId);
      setQuery('');
      setDebouncedQuery('');
    },
  });

  const showDropdown = debouncedQuery.length > 0;

  return (
    <section className="flex flex-col gap-2">
      <Label htmlFor="share-search" className="sr-only">
        {t('searchLabel')}
      </Label>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          id="share-search"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t('searchPlaceholder')}
          className="pl-9"
        />
        {isFetching ? (
          <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        ) : null}
      </div>

      {showDropdown ? (
        <Card className="flex flex-col divide-y overflow-hidden p-0">
          {isError ? (
            <p className="p-4 text-sm text-destructive">{t('searchError')}</p>
          ) : results.length === 0 && !isFetching ? (
            <p className="p-4 text-sm text-muted-foreground">
              {t('noResults', { query: debouncedQuery })}
            </p>
          ) : (
            results.map((candidate) => (
              <button
                key={candidate.hubUserId}
                type="button"
                disabled={invite.isPending}
                onClick={() => invite.mutate(candidate)}
                className="flex min-h-11 items-center gap-3 p-3 text-left transition-colors hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50"
              >
                {candidate.image ? (
                  // next/image requires allowlisting the hub's external avatar
                  // host in next.config; out of scope here for a 32px avatar.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={candidate.image}
                    alt=""
                    className="h-8 w-8 shrink-0 rounded-full"
                  />
                ) : (
                  <UserRound className="h-8 w-8 shrink-0 rounded-full bg-muted p-1.5 text-muted-foreground" />
                )}
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-sm font-medium">
                    {candidate.name ?? candidate.email}
                  </span>
                  {candidate.name ? (
                    <span className="truncate text-xs text-muted-foreground">
                      {candidate.email}
                    </span>
                  ) : null}
                </span>
                {invitedId === candidate.hubUserId ? (
                  <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                    {t('invited')}
                  </span>
                ) : null}
              </button>
            ))
          )}
        </Card>
      ) : null}
    </section>
  );
}
