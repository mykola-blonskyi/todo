'use client';

import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Created in React state, not at module scope - a module-level singleton
// would be shared across every request/user during SSR. This app only uses
// TanStack Query for client-initiated queries (no server-side prefetch/
// hydration), so no per-request server QueryClient is needed.
export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
