# Guide des Patterns de Data Fetching

## Vue d'ensemble

Ce guide documente les patterns de data fetching utilisés dans l'application Teens Party Morocco avec React Query.

## Architecture

### Structure des fichiers

```
lib/
├── queries/
│   ├── query-client.tsx    # Configuration React Query
│   ├── events.ts           # Hooks pour les événements
│   ├── bookings.ts          # Hooks pour les réservations
│   └── index.ts            # Exports centralisés
├── fetch/
│   └── with-timeout.ts     # Wrapper fetch avec timeout et AbortController
└── hooks/
    └── use-retry.ts        # Hook de retry avec backoff exponentiel
```

## Configuration React Query

### QueryClient

Le `QueryClient` est configuré avec les paramètres suivants :

- **staleTime**: 5 minutes (données considérées fraîches)
- **gcTime**: 10 minutes (données gardées en cache)
- **retry**: 3 tentatives avec backoff exponentiel
- **refetchOnWindowFocus**: false (évite requêtes inutiles)
- **refetchOnReconnect**: true (refetch si connexion perdue)

### Provider

Le `QueryProvider` doit envelopper l'application dans `app/layout.tsx` :

```tsx
import { QueryProvider } from '@/lib/queries'

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <QueryProvider>
          {children}
        </QueryProvider>
      </body>
    </html>
  )
}
```

## Patterns d'utilisation

### 1. Query simple (useQuery)

Pour récupérer des données une seule fois :

```tsx
'use client'

import { useEvents } from '@/lib/queries'
import { QueryErrorFallback } from '@/components/ui/query-error-fallback'

export function EventsList() {
  const { data: events, isLoading, error, refetch } = useEvents({ city: 'Casablanca' })

  if (isLoading) {
    return <EventsSkeleton />
  }

  if (error) {
    return <QueryErrorFallback error={error} onRetry={() => refetch()} />
  }

  return (
    <div>
      {events?.map(event => (
        <EventCard key={event.id} event={event} />
      ))}
    </div>
  )
}
```

### 2. Infinite Scroll (useInfiniteQuery)

Pour les listes longues avec pagination infinie :

```tsx
'use client'

import { useEventsInfinite } from '@/lib/queries'
import { InfiniteScroll } from '@/components/ui/infinite-scroll'
import { QueryErrorFallback } from '@/components/ui/query-error-fallback'

export function EventsInfiniteList() {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    error,
    refetch,
  } = useEventsInfinite({ city: 'Casablanca' })

  if (isLoading) {
    return <EventsSkeleton />
  }

  if (error) {
    return <QueryErrorFallback error={error} onRetry={() => refetch()} />
  }

  const events = data?.pages.flatMap(page => page.data) || []

  return (
    <InfiniteScroll
      fetchNextPage={fetchNextPage}
      hasNextPage={hasNextPage || false}
      isFetchingNextPage={isFetchingNextPage}
    >
      {events.map(event => (
        <EventCard key={event.id} event={event} />
      ))}
    </InfiniteScroll>
  )
}
```

### 3. Mutation avec invalidation

Pour créer/mettre à jour/supprimer des données :

```tsx
'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useInvalidateEvents } from '@/lib/queries'
import { createClient } from '@/lib/supabase/client'

export function CreateEventForm() {
  const queryClient = useQueryClient()
  const { invalidateAll } = useInvalidateEvents()

  const mutation = useMutation({
    mutationFn: async (eventData: any) => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('events')
        .insert(eventData)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      // Invalider le cache pour refetch les événements
      invalidateAll()
    },
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    mutation.mutate({
      title: 'Nouvel événement',
      // ... autres champs
    })
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* ... champs du formulaire ... */}
      <button disabled={mutation.isPending}>
        {mutation.isPending ? 'Création...' : 'Créer'}
      </button>
      {mutation.isError && (
        <QueryErrorFallback error={mutation.error} />
      )}
    </form>
  )
}
```

### 4. Gestion d'erreurs réseau

React Query gère automatiquement les retries avec backoff exponentiel. Pour personnaliser :

```tsx
import { QueryErrorFallback } from '@/components/ui/query-error-fallback'

export function MyComponent() {
  const { data, error, refetch, isError } = useEvents()

  if (isError) {
    return (
      <QueryErrorFallback
        error={error}
        onRetry={() => refetch()}
        errorType="network" // ou "server" ou "unknown"
      />
    )
  }

  // ...
}
```

### 5. Requête conditionnelle

Pour activer/désactiver une query :

```tsx
const { data: event } = useEvent(eventId, {
  enabled: !!eventId && isAuthenticated,
})
```

## AbortController et Cancellation

React Query gère automatiquement l'annulation des requêtes obsolètes. Pour les requêtes fetch personnalisées, utilisez `fetchWithTimeout` :

```tsx
import { fetchWithTimeout } from '@/lib/fetch/with-timeout'

// Avec timeout automatique
const response = await fetchWithTimeout('/api/data', {
  timeout: 10000, // 10 secondes
})

// Avec signal externe (pour React Query)
const response = await fetchWithTimeout('/api/data', {
  signal: queryClient.getQueryState(['events'])?.fetchStatus === 'fetching' 
    ? abortController.signal 
    : undefined,
})
```

## Invalidation du cache

### Invalidation manuelle

```tsx
import { useInvalidateEvents } from '@/lib/queries'

function MyComponent() {
  const { invalidateAll, invalidateEvent, invalidateUpcoming } = useInvalidateEvents()

  const handleUpdate = async () => {
    // ... mise à jour ...
    
    // Invalider toutes les queries d'événements
    invalidateAll()
    
    // Ou invalider un événement spécifique
    invalidateEvent(eventId)
    
    // Ou invalider seulement les événements à venir
    invalidateUpcoming()
  }
}
```

### Invalidation automatique après mutation

```tsx
const mutation = useMutation({
  mutationFn: updateEvent,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['events'] })
  },
})
```

## Best Practices

### ✅ À faire

1. **Utiliser les hooks centralisés** : Toujours utiliser les hooks de `lib/queries/` plutôt que de créer des queries directement
2. **Gérer les états de chargement** : Toujours afficher un skeleton ou un loader pendant le chargement
3. **Gérer les erreurs** : Utiliser `QueryErrorFallback` pour une UX dégradée mais utilisable
4. **Invalidation après mutation** : Toujours invalider le cache après une mutation
5. **Pagination pour listes longues** : Utiliser `useInfiniteQuery` pour les listes de plus de 10 éléments

### ❌ À éviter

1. **Ne pas faire de requêtes inutiles** : Utiliser `enabled` pour désactiver les queries conditionnelles
2. **Ne pas dupliquer la logique** : Centraliser dans `lib/queries/`
3. **Ne pas ignorer les erreurs** : Toujours gérer les erreurs avec un fallback UI
4. **Ne pas oublier l'invalidation** : Invalider le cache après mutations
5. **Ne pas utiliser staleTime trop long** : Adapter selon la fréquence de mise à jour des données

## Migration depuis Supabase direct

### Avant (Supabase direct)

```tsx
'use client'

import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'

export function EventsList() {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function fetchEvents() {
      try {
        const supabase = createClient()
        const { data, error } = await supabase
          .from('events')
          .select('*')
        
        if (error) throw error
        setEvents(data)
      } catch (err) {
        setError(err)
      } finally {
        setLoading(false)
      }
    }
    
    fetchEvents()
  }, [])

  if (loading) return <div>Loading...</div>
  if (error) return <div>Error: {error.message}</div>

  return (
    <div>
      {events.map(event => (
        <EventCard key={event.id} event={event} />
      ))}
    </div>
  )
}
```

### Après (React Query)

```tsx
'use client'

import { useEvents } from '@/lib/queries'
import { QueryErrorFallback } from '@/components/ui/query-error-fallback'

export function EventsList() {
  const { data: events, isLoading, error, refetch } = useEvents()

  if (isLoading) return <EventsSkeleton />
  if (error) return <QueryErrorFallback error={error} onRetry={() => refetch()} />

  return (
    <div>
      {events?.map(event => (
        <EventCard key={event.id} event={event} />
      ))}
    </div>
  )
}
```

## Performance

### Cache

- Les données sont mises en cache automatiquement
- Le cache est partagé entre tous les composants utilisant la même query key
- Les données sont invalidées automatiquement après mutations

### Optimisations

1. **staleTime** : Ajuster selon la fréquence de mise à jour
   - Événements : 2 minutes (données qui changent souvent)
   - Profils : 5 minutes (données plus stables)
   - Configuration : 10 minutes (données très stables)

2. **Pagination** : Utiliser `useInfiniteQuery` pour les listes longues
3. **Lazy loading** : Utiliser `enabled: false` pour les queries conditionnelles

## Debugging

### React Query Devtools

Les devtools sont automatiquement activés en développement. Ouvrez-les avec le bouton en bas à gauche de l'écran.

### Logs

Les erreurs sont automatiquement loggées. Vérifiez la console pour les détails.

## Support

Pour toute question ou problème, consultez :
- [Documentation React Query](https://tanstack.com/query/latest)
- [Documentation Supabase](https://supabase.com/docs)

