# Mutations avec Invalidation Automatique

## Vue d'ensemble

Ce document explique comment utiliser les hooks de mutation avec invalidation automatique du cache React Query.

## Hooks de Mutation Disponibles

### Événements

```tsx
import { useCreateEvent, useUpdateEvent, useDeleteEvent } from '@/lib/queries'

// Créer un événement
const createEvent = useCreateEvent()
createEvent.mutate({
  title: 'Nouvel événement',
  event_date: '2024-02-15',
  city: 'Casablanca',
  // ... autres champs
})

// Mettre à jour un événement
const updateEvent = useUpdateEvent()
updateEvent.mutate({
  eventId: 'event-id',
  eventData: { title: 'Titre mis à jour' }
})

// Supprimer un événement
const deleteEvent = useDeleteEvent()
deleteEvent.mutate('event-id')
```

### Réservations

```tsx
import { useCreateBooking, useUpdateBooking, useCancelBooking } from '@/lib/queries'

// Créer une réservation
const createBooking = useCreateBooking()
createBooking.mutate({
  event_id: 'event-id',
  parent_id: 'parent-id',
  // ... autres champs
})

// Mettre à jour une réservation
const updateBooking = useUpdateBooking()
updateBooking.mutate({
  bookingId: 'booking-id',
  bookingData: { status: 'confirmed' }
})

// Annuler une réservation
const cancelBooking = useCancelBooking()
cancelBooking.mutate('booking-id')
```

### Profils et Enfants

```tsx
import { 
  useUpdateProfile, 
  useCreateChild, 
  useUpdateChild, 
  useDeleteChild 
} from '@/lib/queries'

// Mettre à jour le profil
const updateProfile = useUpdateProfile()
updateProfile.mutate({ full_name: 'Nouveau nom' })

// Créer un enfant
const createChild = useCreateChild()
createChild.mutate({
  prenom: 'John',
  nom: 'Doe',
  date_of_birth: '2010-05-15'
})

// Mettre à jour un enfant
const updateChild = useUpdateChild()
updateChild.mutate({
  childId: 'child-id',
  childData: { prenom: 'Jane' }
})

// Supprimer un enfant
const deleteChild = useDeleteChild()
deleteChild.mutate('child-id')
```

## Pattern Complet avec Formulaire

```tsx
'use client'

import { useCreateEvent } from '@/lib/queries'
import { QueryErrorFallback } from '@/components/ui/query-error-fallback'
import { useRouter } from 'next/navigation'

export function CreateEventForm() {
  const router = useRouter()
  const createEvent = useCreateEvent()

  const handleSubmit = async (data: EventFormData) => {
    try {
      await createEvent.mutateAsync(data)
      // Redirection après succès
      router.push('/evenements')
      // Ou afficher un toast
      toast.success('Événement créé avec succès!')
    } catch (error) {
      // L'erreur est déjà gérée par React Query
      console.error('Error:', error)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* Champs du formulaire */}
      
      {createEvent.isError && (
        <QueryErrorFallback
          error={createEvent.error}
          onRetry={() => createEvent.reset()}
        />
      )}
      
      <button 
        disabled={createEvent.isPending}
        type="submit"
      >
        {createEvent.isPending ? 'Création...' : 'Créer'}
      </button>
    </form>
  )
}
```

## Invalidation Automatique

Toutes les mutations invalident automatiquement le cache concerné :

- **useCreateEvent** → Invalide `['events']`
- **useUpdateEvent** → Invalide `['events', eventId]` et `['events']`
- **useDeleteEvent** → Invalide `['events']`
- **useCreateBooking** → Invalide `['bookings']` et `['events']`
- **useUpdateBooking** → Invalide `['bookings', bookingId]` et `['bookings']`
- **useCancelBooking** → Invalide `['bookings']` et `['events']`

## États de Mutation

Chaque mutation expose les états suivants :

```tsx
const mutation = useCreateEvent()

// États disponibles
mutation.isPending    // En cours
mutation.isError      // Erreur
mutation.isSuccess    // Succès
mutation.error        // Objet d'erreur
mutation.data         // Données retournées
mutation.reset()      // Réinitialiser l'état
```

## Optimistic Updates (Mises à jour optimistes)

Pour une meilleure UX, vous pouvez implémenter des mises à jour optimistes :

```tsx
import { useQueryClient } from '@tanstack/react-query'
import { useUpdateEvent } from '@/lib/queries'

const queryClient = useQueryClient()
const updateEvent = useUpdateEvent()

const handleUpdate = async (eventId: string, newData: any) => {
  // Snapshot de la valeur précédente
  const previousEvent = queryClient.getQueryData(['events', eventId])
  
  // Mise à jour optimiste
  queryClient.setQueryData(['events', eventId], newData)
  
  try {
    await updateEvent.mutateAsync({ eventId, eventData: newData })
  } catch (error) {
    // Rollback en cas d'erreur
    queryClient.setQueryData(['events', eventId], previousEvent)
    throw error
  }
}
```

## Exemple Complet : Formulaire d'Événement

Voir `components/features/mutations/event-form.tsx` pour un exemple complet de formulaire avec :
- Validation avec react-hook-form
- Gestion d'erreurs avec QueryErrorFallback
- États de chargement
- Invalidation automatique

## Best Practices

1. ✅ Toujours utiliser les hooks de mutation centralisés
2. ✅ Gérer les états `isPending`, `isError`, `isSuccess`
3. ✅ Afficher un feedback utilisateur (toast, message)
4. ✅ Utiliser `mutateAsync` pour les opérations séquentielles
5. ✅ Utiliser `mutate` pour les opérations simples
6. ❌ Ne pas oublier de gérer les erreurs
7. ❌ Ne pas faire d'invalidation manuelle (déjà fait automatiquement)

## Support

- [Documentation React Query Mutations](https://tanstack.com/query/latest/docs/react/guides/mutations)
- [Guide des Patterns](./DATA_FETCHING_PATTERNS.md)

