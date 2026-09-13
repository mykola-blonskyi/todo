'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Loader2, Search, UserRound } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Input } from '@ui/components/input';
import { Label } from '@ui/components/label';
import { Card } from '@ui/components/card';
import type { ShareCandidate } from './types';

export interface CandidateSearchLabels {
  search: string;
  placeholder: string;
  searchError: string;
  noResults: (query: string) => string;
  confirmed: (name: string) => string;
  selectError: string;
}

interface CandidateSearchProps {
  inputId: string;
  queryKey: readonly unknown[];
  labels: CandidateSearchLabels;
  search: (query: string) => Promise<ShareCandidate[]>;
  select: (candidate: ShareCandidate) => Promise<unknown>;
}

// One search box shared by list sharing and template collaborators: the two
// were byte-identical apart from which mutation they called, so the same bug
// had to be fixed twice and the second copy always lagged.
//
// Debounced so search fires once typing pauses, not on every keystroke - the
// timeout lives in a useEffect (not the input's change handler) so its
// cleanup actually runs and cancels stale in-flight timers.
export function CandidateSearch({
  inputId,
  queryKey,
  labels,
  search,
  select,
}: CandidateSearchProps) {
  const t = useTranslations('Sharing');
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [status, setStatus] = useState('');

  useEffect(() => {
    const handle = setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => clearTimeout(handle);
  }, [query]);

  const {
    data: results = [],
    isFetching,
    isError,
  } = useQuery({
    queryKey: [...queryKey, debouncedQuery],
    queryFn: () => search(debouncedQuery),
    enabled: debouncedQuery.length > 0,
    staleTime: 30_000,
    // Interactive search should fail fast, not retry 3x with backoff (the
    // default) - a failure here isn't a transient network blip that
    // self-resolves, and 5+ seconds before any error feedback is too slow
    // for a search-as-you-type interaction.
    retry: false,
  });

  const choose = useMutation({
    mutationFn: select,
    // The outcome has to live outside the dropdown. Clearing the query closes
    // the dropdown in the same commit, so a confirmation rendered inside it
    // unmounted before anyone could read it and a failure showed nothing at
    // all - the user's only signal was clicking again.
    onSuccess: (_data, candidate) => {
      setStatus(labels.confirmed(candidate.name ?? candidate.email));
      setQuery('');
      setDebouncedQuery('');
    },
    onError: () => setStatus(labels.selectError),
  });

  const showDropdown = debouncedQuery.length > 0;
  const resultsMessage =
    showDropdown && !isFetching && !isError
      ? t('resultCount', { count: results.length })
      : '';

  return (
    <section className="flex flex-col gap-2">
      <Label htmlFor={inputId} className="sr-only">
        {labels.search}
      </Label>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          id={inputId}
          type="search"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setStatus('');
          }}
          placeholder={labels.placeholder}
          className="pl-9"
        />
        {isFetching ? (
          <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        ) : null}
      </div>

      {/* Mounted whether or not it has anything to say: several screen readers
          skip a live region that appears together with its first message. */}
      <p role="status" aria-live="polite" className="text-xs text-destructive">
        <span className="sr-only">{resultsMessage}</span>
        {status ? <span>{status}</span> : null}
      </p>

      {showDropdown ? (
        <Card className="flex flex-col divide-y overflow-hidden p-0">
          {isError ? (
            <p className="p-4 text-sm text-destructive">{labels.searchError}</p>
          ) : results.length === 0 && !isFetching ? (
            <p className="p-4 text-sm text-muted-foreground">
              {labels.noResults(debouncedQuery)}
            </p>
          ) : (
            results.map((candidate) => (
              <button
                key={candidate.hubUserId}
                type="button"
                disabled={choose.isPending}
                onClick={() => choose.mutate(candidate)}
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
              </button>
            ))
          )}
        </Card>
      ) : null}
    </section>
  );
}
