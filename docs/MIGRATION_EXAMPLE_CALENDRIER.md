# Exemple de Migration : Page Calendrier

## Vue d'ensemble

Ce document montre comment migrer une page de Supabase direct vers React Query, en utilisant la page `app/calendrier/page.tsx` comme exemple.

## Avant (Supabase direct)

```tsx
"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"

export default function CalendrierPage() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadEvents()
  }, [currentDate])

  const loadEvents = async () => {
    const supabase = createClient()
    const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
    const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)

    const { data } = await supabase
      .from("events")
      .select("*")
      .gte("event_date", startOfMonth.toISOString().split("T")[0])
      .lte("event_date", endOfMonth.toISOString().split("T")[0])
      .order("event_date", { ascending: true })

    if (data) setEvents(data)
    setLoading(false)
  }

  // ... reste du composant
}
```

### Problèmes identifiés

1. ❌ Pas de cache : Les données sont rechargées à chaque changement de mois
2. ❌ Pas de retry automatique : Si la requête échoue, l'utilisateur doit recharger la page
3. ❌ Gestion d'erreur basique : Pas de fallback UI
4. ❌ Pas d'invalidation : Les données peuvent être obsolètes
5. ❌ Code dupliqué : La logique de fetching est répétée dans chaque composant

## Après (React Query)

```tsx
"use client"

import { useState, useMemo } from "react"
import { useEvents } from "@/lib/queries"
import { QueryErrorFallback } from "@/components/ui/query-error-fallback"

export default function CalendrierPage() {
  const [currentDate, setCurrentDate] = useState(new Date())

  // React Query gère automatiquement le cache, retry, et invalidation
  const { data: allEvents, isLoading, error, refetch } = useEvents()

  // Filtrer les événements pour le mois actuel (côté client)
  const events = useMemo(() => {
    if (!allEvents) return []
    
    const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
    const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)
    
    return allEvents.filter((event) => {
      const eventDate = new Date(event.event_date)
      return eventDate >= startOfMonth && eventDate <= endOfMonth
    })
  }, [allEvents, currentDate])

  // Gestion des états
  if (isLoading) {
    return <LoadingState />
  }

  if (error) {
    return <QueryErrorFallback error={error} onRetry={() => refetch()} />
  }

  // ... reste du composant
}
```

### Avantages

1. ✅ Cache automatique : Les données sont mises en cache et réutilisées
2. ✅ Retry automatique : 3 tentatives avec backoff exponentiel
3. ✅ Fallback UI : Composant dédié pour les erreurs avec suggestions
4. ✅ Invalidation automatique : Le cache est invalidé après mutations
5. ✅ Code centralisé : Logique de fetching dans `lib/queries/`

## Étapes de migration

### 1. Identifier les requêtes Supabase

Dans le code original, on identifie :
- `supabase.from("events").select("*")` → Utiliser `useEvents()`

### 2. Remplacer les useState/useEffect

```tsx
// Avant
const [events, setEvents] = useState<Event[]>([])
const [loading, setLoading] = useState(true)

useEffect(() => {
  loadEvents()
}, [currentDate])

// Après
const { data: events, isLoading, error, refetch } = useEvents()
```

### 3. Déplacer le filtrage côté client

Au lieu de filtrer dans la requête Supabase, filtrer côté client avec `useMemo` :

```tsx
const events = useMemo(() => {
  if (!allEvents) return []
  // Logique de filtrage
  return allEvents.filter(...)
}, [allEvents, currentDate])
```

### 4. Ajouter la gestion d'erreurs

```tsx
if (error) {
  return <QueryErrorFallback error={error} onRetry={() => refetch()} />
}
```

### 5. Ajouter le loading state

```tsx
if (isLoading) {
  return <LoadingState />
}
```

## Résultats

### Performance

- **Avant** : Requête à chaque changement de mois (même si les données sont déjà chargées)
- **Après** : Données réutilisées depuis le cache si disponibles

### UX

- **Avant** : Erreur silencieuse ou page blanche en cas d'échec
- **Après** : Message d'erreur clair avec bouton "Réessayer"

### Maintenabilité

- **Avant** : Logique de fetching dupliquée dans chaque composant
- **Après** : Logique centralisée dans `lib/queries/`

## Prochaines étapes

1. Migrer d'autres pages client-side vers React Query
2. Ajouter des hooks pour d'autres entités (clubs, notifications, etc.)
3. Implémenter l'invalidation automatique après mutations
4. Optimiser les `staleTime` selon les besoins

## Notes

- Les pages Server Components peuvent continuer à utiliser `createClient()` de `lib/supabase/server`
- Seules les pages `'use client'` doivent être migrées vers React Query
- Le cache React Query est partagé entre tous les composants utilisant la même query key

