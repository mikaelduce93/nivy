# Guide de Migration - Timeout Réseau

**Date**: 2025-01-27  
**Objectif**: Migrer progressivement tous les `fetch` et appels Supabase vers les wrappers avec timeout

---

## Vue d'ensemble

Pour améliorer la sécurité et la fiabilité, tous les appels réseau doivent utiliser les wrappers avec timeout:
- `fetchWithTimeout` pour les appels `fetch`
- `withSupabaseTimeout` pour les appels Supabase

---

## Migration des appels `fetch`

### Avant
```typescript
const response = await fetch('/api/data')
const data = await response.json()
```

### Après
```typescript
import { fetchWithTimeout } from '@/lib/fetch/with-timeout'

const response = await fetchWithTimeout('/api/data', {
  timeout: 10000, // 10 seconds (optionnel, défaut: 30s)
})
const data = await response.json()
```

### Avec JSON direct
```typescript
import { fetchWithTimeoutJSON } from '@/lib/fetch/with-timeout'

const data = await fetchWithTimeoutJSON<DataType>('/api/data', {
  timeout: 10000,
})
```

---

## Migration des appels Supabase

### Dans les routes API (Server Components)

#### Avant
```typescript
import { createClient } from '@/lib/supabase/server'

const supabase = await createClient()
const { data, error } = await supabase.auth.getUser()
```

#### Après
```typescript
import { createClient } from '@/lib/supabase/server'
import { withSupabaseTimeout } from '@/lib/supabase/wrapper'

const supabase = await createClient()
const { data, error } = await withSupabaseTimeout(
  supabase.auth.getUser(),
  'auth.getUser',
  10000 // timeout en ms
)
```

#### Pour les queries
```typescript
// Avant
const { data } = await supabase
  .from('events')
  .select('*')
  .eq('id', eventId)
  .single()

// Après
const { data } = await withSupabaseTimeout(
  supabase
    .from('events')
    .select('*')
    .eq('id', eventId)
    .single(),
  `from('events').select()`,
  10000
)
```

### Dans les composants Client

#### Avant
```typescript
import { createClient } from '@/lib/supabase/client'

const supabase = createClient()
const { data, error } = await supabase.auth.getUser()
```

#### Après
```typescript
import { createClient } from '@/lib/supabase/client'
import { withSupabaseTimeout } from '@/lib/supabase/wrapper'

const supabase = createClient()
const { data, error } = await withSupabaseTimeout(
  supabase.auth.getUser(),
  'auth.getUser',
  10000
)
```

---

## Priorités de Migration

### P0 - Routes Critiques (À migrer en premier)
1. ✅ `app/api/payments/process/route.ts` - Traitement paiements
2. ✅ `app/api/bookings/create/route.ts` - Création réservations
3. ⏳ `app/api/auth/**/*.ts` - Routes d'authentification
4. ⏳ `app/api/payments/**/*.ts` - Toutes les routes de paiement

### P1 - Hooks et Composants Critiques
1. ✅ `lib/hooks/use-pillars.ts` - Hook gamification
2. ⏳ `app/teen/xp-value/page.tsx` - Page XP
3. ⏳ `components/payment-method-selector.tsx` - Sélecteur paiement
4. ⏳ `components/check-in-interface.tsx` - Interface check-in

### P2 - Autres Composants
- Tous les autres composants utilisant `fetch` ou `supabase.from()`

---

## Checklist de Migration

Pour chaque fichier à migrer:

- [ ] Remplacer `fetch` par `fetchWithTimeout`
- [ ] Ajouter timeout approprié (10-30s selon contexte)
- [ ] Wrapper appels Supabase avec `withSupabaseTimeout`
- [ ] Tester que le code fonctionne
- [ ] Vérifier que les erreurs timeout sont loggées vers Sentry
- [ ] Vérifier UX (messages d'erreur clairs)

---

## Timeouts Recommandés

| Contexte | Timeout | Raison |
|----------|---------|--------|
| Auth (login, signup) | 10s | Opération rapide |
| Paiements | 30s | Peut prendre du temps |
| Réservations | 15s | Opération moyenne |
| Queries simples | 10s | Rapide |
| Queries complexes | 20s | Peut prendre du temps |
| Uploads | 60s | Peut être long |

---

## Gestion des Erreurs

Les wrappers lancent des erreurs spécifiques:

```typescript
import { FetchTimeoutError } from '@/lib/fetch/with-timeout'
import { SupabaseTimeoutError } from '@/lib/supabase/wrapper'

try {
  const data = await fetchWithTimeout('/api/data')
} catch (error) {
  if (error instanceof FetchTimeoutError) {
    // Gérer timeout spécifiquement
    console.error('Request timed out:', error.url, error.timeout)
  } else {
    // Autre erreur
    console.error('Request failed:', error)
  }
}
```

---

## Exemples Complets

### Exemple 1: Hook avec fetch
```typescript
import { fetchWithTimeout } from '@/lib/fetch/with-timeout'

const fetchData = async () => {
  try {
    const response = await fetchWithTimeout('/api/data', {
      timeout: 10000,
    })
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    const data = await response.json()
    return data
  } catch (error) {
    if (error instanceof FetchTimeoutError) {
      console.error('Request timed out')
      // Afficher message utilisateur
    }
    throw error
  }
}
```

### Exemple 2: Route API avec Supabase
```typescript
import { createClient } from '@/lib/supabase/server'
import { withSupabaseTimeout } from '@/lib/supabase/wrapper'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  
  // Auth avec timeout
  const { data: { user }, error: authError } = await withSupabaseTimeout(
    supabase.auth.getUser(),
    'auth.getUser',
    10000
  )
  
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  // Query avec timeout
  const { data, error } = await withSupabaseTimeout(
    supabase
      .from('events')
      .select('*')
      .eq('parent_id', user.id),
    `from('events').select()`,
    10000
  )
  
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  
  return NextResponse.json({ data })
}
```

---

## Progression

- **Routes API migrées**: 4/190 (2%)
  - ✅ `app/api/payments/process/route.ts`
  - ✅ `app/api/bookings/create/route.ts`
  - ✅ `app/api/auth/validate-teen/route.ts`
  - ✅ `app/api/auth/register-teen/route.ts`
- **Hooks migrés**: 1/50+ (2%)
  - ✅ `lib/hooks/use-pillars.ts`
- **Composants migrés**: 1/100+ (1%)
  - ✅ `app/teen/xp-value/page.tsx`

**Total estimé**: ~340 fichiers à migrer  
**Progression actuelle**: 6/340+ (2%)

---

## Notes

- Migration progressive recommandée (commencer par P0)
- Tester chaque migration avant de passer à la suivante
- Les timeouts sont loggés automatiquement vers Sentry
- Fallback vers comportement par défaut si timeout non configuré

---

**Fin du guide**

