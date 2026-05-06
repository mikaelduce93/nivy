'use client'

/**
 * App-level client providers
 * ==========================
 *
 * Centralised wrapper for client-side providers (React Query, etc.).
 * Designed to be mounted once near the top of `app/layout.tsx`.
 *
 * The underlying React Query configuration lives in `lib/queries/query-client.tsx`
 * (`QueryProvider`) — this file simply composes it under a single, semantic name
 * so future client providers can be added without touching the root layout.
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'

/**
 * Build a QueryClient with sensible defaults for the app.
 *
 * Defaults intentionally mirror those used elsewhere in the codebase:
 * - `staleTime: 30s` keeps UI responsive while limiting background refetch storms
 * - `retry: 1` avoids long retry chains on transient errors
 * - `refetchOnWindowFocus: false` prevents surprise refetches when tabs regain focus
 */
function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        retry: 1,
        refetchOnWindowFocus: false,
      },
    },
  })
}

export function AppProviders({ children }: { children: ReactNode }) {
  const [client] = useState(() => makeQueryClient())

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}
