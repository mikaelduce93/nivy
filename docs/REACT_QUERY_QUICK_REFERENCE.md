# React Query - Guide de Référence Rapide

## Hooks Disponibles

### Events (Événements)

```tsx
import { useEvents, useEvent, useEventsInfinite, useFeaturedEvents } from '@/lib/queries'

// Tous les événements
const { data: events, isLoading, error, refetch } = useEvents({ city: 'Casablanca' })

// Un événement par ID
const { data: event } = useEvent(eventId, { enabled: !!eventId })

// Pagination infinie
const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useEventsInfinite()

// Événements mis en avant
const { data: featured } = useFeaturedEvents(6)
```

### Bookings (Réservations)

```tsx
import { useBookings, useBooking, useBookingsInfinite, useUpcomingBookings } from '@/lib/queries'

// Toutes les réservations
const { data: bookings } = useBookings({ status: 'confirmed' })

// Une réservation par ID
const { data: booking } = useBooking(bookingId)

// Pagination infinie
const { data, fetchNextPage } = useBookingsInfinite()

// Réservations à venir
const { data: upcoming } = useUpcomingBookings()
```

### Clubs

```tsx
import { useClubs, useClub, useClubsInfinite } from '@/lib/queries'

// Tous les clubs
const { data: clubs } = useClubs({ category: 'sport' })

// Un club par slug
const { data: club } = useClub(slug)

// Pagination infinie
const { data, fetchNextPage } = useClubsInfinite()
```

### Profiles (Profils)

```tsx
import { useProfile, useChildren, useChild } from '@/lib/queries'

// Profil actuel
const { data: profile } = useProfile()

// Enfants du parent
const { data: children } = useChildren()

// Un enfant par ID
const { data: child } = useChild(childId)
```

### Notifications

```tsx
import { 
  useNotifications, 
  useUnreadNotificationsCount,
  useMarkNotificationAsRead,
  useMarkAllNotificationsAsRead 
} from '@/lib/queries'

// Toutes les notifications
const { data: notifications } = useNotifications({ unreadOnly: true })

// Nombre de non lues
const { data: unreadCount } = useUnreadNotificationsCount()

// Marquer comme lue
const markAsRead = useMarkNotificationAsRead()
markAsRead.mutate(notificationId)

// Marquer toutes comme lues
const markAllAsRead = useMarkAllNotificationsAsRead()
markAllAsRead.mutate()
```

## Patterns Communs

### 1. Query Simple avec Loading et Error

```tsx
const { data, isLoading, error, refetch } = useEvents()

if (isLoading) return <Skeleton />
if (error) return <QueryErrorFallback error={error} onRetry={() => refetch()} />

return <EventsList events={data} />
```

### 2. Infinite Scroll

```tsx
const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useEventsInfinite()

const events = data?.pages.flatMap(page => page.data) || []

return (
  <InfiniteScroll
    fetchNextPage={fetchNextPage}
    hasNextPage={hasNextPage || false}
    isFetchingNextPage={isFetchingNextPage}
  >
    {events.map(event => <EventCard key={event.id} event={event} />)}
  </InfiniteScroll>
)
```

### 3. Query Conditionnelle

```tsx
const { data: event } = useEvent(eventId, {
  enabled: !!eventId && isAuthenticated,
})
```

### 4. Mutation avec Invalidation

```tsx
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useInvalidateEvents } from '@/lib/queries'

const queryClient = useQueryClient()
const { invalidateAll } = useInvalidateEvents()

const mutation = useMutation({
  mutationFn: createEvent,
  onSuccess: () => {
    invalidateAll() // Refetch automatique
  },
})
```

### 5. Optimistic Updates

```tsx
const mutation = useMutation({
  mutationFn: updateEvent,
  onMutate: async (newEvent) => {
    // Annuler les queries en cours
    await queryClient.cancelQueries({ queryKey: ['events', eventId] })
    
    // Snapshot de la valeur précédente
    const previousEvent = queryClient.getQueryData(['events', eventId])
    
    // Mise à jour optimiste
    queryClient.setQueryData(['events', eventId], newEvent)
    
    return { previousEvent }
  },
  onError: (err, newEvent, context) => {
    // Rollback en cas d'erreur
    queryClient.setQueryData(['events', eventId], context.previousEvent)
  },
  onSettled: () => {
    // Refetch pour s'assurer de la cohérence
    queryClient.invalidateQueries({ queryKey: ['events', eventId] })
  },
})
```

## Invalidation du Cache

### Invalidation Manuelle

```tsx
import { useInvalidateEvents } from '@/lib/queries'

const { invalidateAll, invalidateEvent, invalidateUpcoming } = useInvalidateEvents()

// Invalider toutes les queries d'événements
invalidateAll()

// Invalider un événement spécifique
invalidateEvent(eventId)

// Invalider seulement les événements à venir
invalidateUpcoming()
```

### Invalidation Globale

```tsx
import { useQueryClient } from '@tanstack/react-query'

const queryClient = useQueryClient()

// Invalider toutes les queries
queryClient.invalidateQueries()

// Invalider une query spécifique
queryClient.invalidateQueries({ queryKey: ['events'] })

// Invalider avec un préfixe
queryClient.invalidateQueries({ queryKey: ['events'], exact: false })
```

## Configuration staleTime

Les `staleTime` sont optimisés selon la fréquence de mise à jour :

- **Événements** : 2 minutes (changent souvent)
- **Réservations** : 2 minutes (changent souvent)
- **Clubs** : 5 minutes (changent moins souvent)
- **Profils** : 5 minutes (changent rarement)
- **Notifications** : 1 minute (changent très souvent, avec refetch automatique)

## Composants UI

### QueryErrorFallback

```tsx
import { QueryErrorFallback } from '@/components/ui/query-error-fallback'

<QueryErrorFallback
  error={error}
  onRetry={() => refetch()}
  errorType="network" // ou "server" ou "unknown"
  title="Erreur personnalisée"
  description="Description personnalisée"
/>
```

### QueryErrorInline

```tsx
import { QueryErrorInline } from '@/components/ui/query-error-fallback'

<QueryErrorInline error={error} onRetry={() => refetch()} />
```

### InfiniteScroll

```tsx
import { InfiniteScroll } from '@/components/ui/infinite-scroll'

<InfiniteScroll
  fetchNextPage={fetchNextPage}
  hasNextPage={hasNextPage || false}
  isFetchingNextPage={isFetchingNextPage}
  showLoadMoreButton={false} // true pour bouton au lieu de scroll auto
>
  {items.map(item => <ItemCard key={item.id} item={item} />)}
</InfiniteScroll>
```

## Debugging

### React Query Devtools

Les devtools sont automatiquement activés en développement. Ouvrez-les avec le bouton en bas à gauche.

### Logs

```tsx
// Activer les logs en développement
if (process.env.NODE_ENV === 'development') {
  console.log('Query state:', { data, isLoading, error })
}
```

## Best Practices

1. ✅ Toujours gérer `isLoading` et `error`
2. ✅ Utiliser `QueryErrorFallback` pour les erreurs
3. ✅ Invalider le cache après mutations
4. ✅ Utiliser `useMemo` pour le filtrage côté client
5. ✅ Utiliser `enabled` pour les queries conditionnelles
6. ✅ Utiliser `InfiniteScroll` pour les listes longues
7. ❌ Ne pas faire de requêtes inutiles
8. ❌ Ne pas ignorer les erreurs
9. ❌ Ne pas oublier l'invalidation après mutations

## Migration depuis Supabase Direct

Voir `docs/MIGRATION_EXAMPLE_CALENDRIER.md` pour un exemple complet de migration.

## Support

- [Documentation React Query](https://tanstack.com/query/latest)
- [Guide des Patterns](./DATA_FETCHING_PATTERNS.md)
- [Exemple de Migration](./MIGRATION_EXAMPLE_CALENDRIER.md)

