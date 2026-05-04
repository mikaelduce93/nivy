'use client'

/**
 * TEENS PARTY MOROCCO - React Query Configuration
 * ================================================
 * 
 * Configuration centralisée de React Query avec :
 * - Cache optimisé
 * - Retry avec backoff exponentiel
 * - Invalidation automatique
 * - Gestion d'erreurs réseau
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { useState, type ReactNode } from 'react'

/**
 * Configuration du QueryClient
 * 
 * - staleTime: 5 minutes (données considérées fraîches pendant 5 min)
 * - gcTime (cacheTime): 10 minutes (données gardées en cache 10 min après inutilisation)
 * - retry: 3 tentatives avec backoff exponentiel
 * - refetchOnWindowFocus: false (évite les requêtes inutiles)
 * - refetchOnReconnect: true (refetch automatique si connexion perdue)
 */
function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Données considérées fraîches pendant 5 minutes
        staleTime: 1000 * 60 * 5, // 5 minutes
        
        // Données gardées en cache 10 minutes après inutilisation
        gcTime: 1000 * 60 * 10, // 10 minutes (anciennement cacheTime)
        
        // Retry avec backoff exponentiel
        retry: (failureCount, error) => {
          // Ne pas retry sur erreurs 4xx (client errors)
          if (error && typeof error === 'object' && 'status' in error) {
            const status = error.status as number
            if (status >= 400 && status < 500) {
              return false
            }
          }
          
          // Max 3 tentatives
          return failureCount < 3
        },
        
        // Délai entre retries avec backoff exponentiel
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
        
        // Ne pas refetch automatiquement au focus (évite requêtes inutiles)
        refetchOnWindowFocus: false,
        
        // Refetch automatique si connexion perdue puis retrouvée
        refetchOnReconnect: true,
        
        // Ne pas refetch au mount si données sont fraîches
        refetchOnMount: true,
      },
      mutations: {
        // Retry mutations une seule fois
        retry: 1,
        retryDelay: 1000,
      },
    },
  })
}

let browserQueryClient: QueryClient | undefined = undefined

function getQueryClient() {
  if (typeof window === 'undefined') {
    // Server: toujours créer un nouveau client
    return makeQueryClient()
  } else {
    // Browser: utiliser un singleton pour éviter de recréer le client
    if (!browserQueryClient) {
      browserQueryClient = makeQueryClient()
    }
    return browserQueryClient
  }
}

/**
 * Provider React Query pour l'application
 * 
 * @example
 * ```tsx
 * <QueryProvider>
 *   <App />
 * </QueryProvider>
 * ```
 */
export function QueryProvider({ children }: { children: ReactNode }) {
  // Utiliser useState pour éviter de recréer le client à chaque render
  const [queryClient] = useState(() => getQueryClient())

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}

