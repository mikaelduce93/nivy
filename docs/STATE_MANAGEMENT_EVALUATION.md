# Évaluation State Management Global

**Date**: 2025-01-27  
**Agent**: Architecture Agent  
**Objectif**: Déterminer si Zustand/Redux est nécessaire pour le projet

---

## État Actuel

### Stack Actuelle

- ✅ **React Query** (`@tanstack/react-query`) - Déjà installé et utilisé
- ✅ **Context API** - Utilisé pour state partagé (GamificationProvider, etc.)
- ✅ **React Hooks** - useState, useEffect pour state local
- ❌ **Pas de Zustand/Redux** - Aucune librairie de state management global

### Analyse du Codebase

#### 1. Props Drilling

**Méthodologie** : Recherche de composants avec props passées sur > 3 niveaux

**Résultats** :
- Profondeur moyenne : **2-3 niveaux** (acceptable)
- Cas problématiques identifiés :
  - `GamificationProvider` → props passées via Context (✅ OK)
  - `OnboardingPage` → props passées à plusieurs sous-composants (profondeur 2-3, ✅ OK)
  - Quelques cas isolés avec profondeur 4, mais rares

**Conclusion** : Props drilling **non problématique** actuellement.

#### 2. State Dupliqué

**Méthodologie** : Recherche de state similaire dans plusieurs composants

**Résultats** :
- State de filtres dupliqué dans quelques composants (Events, Clubs)
- State de loading/error patterns similaires
- State de formulaires avec logique similaire

**Conclusion** : Duplication **modérée**, mais gérable avec hooks réutilisables.

#### 3. Server State

**État** : ✅ **Déjà géré par React Query**

```tsx
// Exemple existant
import { useQuery } from '@tanstack/react-query'

export function useEvents() {
  return useQuery({
    queryKey: ['events'],
    queryFn: () => fetchEvents()
  })
}
```

**Conclusion** : React Query couvre déjà le server state (cache, invalidation, retry).

#### 4. Client State Global

**Cas d'usage identifiés** :
- ✅ **Gamification state** → Déjà géré par Context API (`GamificationProvider`)
- ✅ **Auth state** → Géré par Supabase Auth (cookies + session)
- ✅ **Theme state** → Géré par `next-themes`
- ⚠️ **UI state** (modals, toasts) → Géré localement ou via Context

**Conclusion** : Pas de besoin évident de state global pour le client state.

---

## Recommandation

### ❌ **PAS BESOIN de Zustand/Redux pour l'instant**

**Raisons** :

1. ✅ **React Query** gère déjà le server state efficacement
2. ✅ **Context API** suffit pour le state partagé dans des sous-arbres
3. ✅ **Props drilling** n'est pas problématique (profondeur < 3)
4. ✅ **State dupliqué** peut être résolu avec hooks réutilisables
5. ⚠️ **Complexité ajoutée** : Zustand/Redux ajouterait de la complexité sans bénéfice clair

### Alternatives Recommandées

#### 1. Hooks Réutilisables pour State Dupliqué

```tsx
// lib/hooks/use-filters.ts
export function useFilters<T>(initialFilters: T) {
  const [filters, setFilters] = useState(initialFilters)
  const [isFiltering, setIsFiltering] = useState(false)
  
  const updateFilter = useCallback((key: keyof T, value: T[keyof T]) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }, [])
  
  return { filters, updateFilter, isFiltering, setIsFiltering }
}

// Usage
function EventsPage() {
  const { filters, updateFilter } = useFilters({ category: '', city: '' })
  // ...
}
```

#### 2. Context API pour State Partagé

```tsx
// Si besoin de state partagé dans un sous-arbre
const UserPreferencesContext = createContext<UserPreferences | null>(null)

export function UserPreferencesProvider({ children }) {
  const [preferences, setPreferences] = useState<UserPreferences>({})
  
  return (
    <UserPreferencesContext.Provider value={{ preferences, setPreferences }}>
      {children}
    </UserPreferencesContext.Provider>
  )
}
```

#### 3. Composition pour Éviter Props Drilling

```tsx
// Avant : Props drilling
function Page() {
  return <ComponentA user={user} theme={theme} />
}
function ComponentA({ user, theme }) {
  return <ComponentB user={user} theme={theme} />
}

// Après : Composition
function Page() {
  return (
    <UserProvider value={user}>
      <ThemeProvider value={theme}>
        <ComponentA>
          <ComponentB />
        </ComponentA>
      </ThemeProvider>
    </UserProvider>
  )
}
```

---

## Quand Considérer Zustand/Redux ?

### Signaux d'Alerte

Considérer Zustand/Redux si :

1. ❌ **Props drilling > 4 niveaux** de manière fréquente
2. ❌ **State dupliqué** devient difficile à maintenir
3. ❌ **State complexe** nécessite des middlewares (logging, time-travel)
4. ❌ **Performance** : Re-renders excessifs avec Context API
5. ❌ **State partagé** entre composants distants dans l'arbre

### Si Nécessaire : Recommandation Zustand

Si un state management global devient nécessaire, **Zustand** est recommandé car :

- ✅ Plus léger que Redux
- ✅ Moins de boilerplate
- ✅ TypeScript-friendly
- ✅ Pas besoin de providers/contexts
- ✅ Bonne intégration avec React Query

**Exemple d'implémentation si nécessaire** :

```tsx
// lib/store/user-store.ts
import { create } from 'zustand'

interface UserStore {
  user: User | null
  setUser: (user: User | null) => void
  clearUser: () => void
}

export const useUserStore = create<UserStore>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  clearUser: () => set({ user: null }),
}))
```

---

## Plan d'Action

### Court Terme (Maintenant)

1. ✅ **Documenter** cette évaluation
2. ✅ **Extraire hooks réutilisables** pour state dupliqué
3. ✅ **Refactoriser** composants avec props drilling > 3

### Moyen Terme (Si nécessaire)

1. ⚠️ **Surveiller** props drilling (si > 4 niveaux apparaissent)
2. ⚠️ **Surveiller** state dupliqué (si devient inmaintenable)
3. ⚠️ **Considérer Zustand** si signaux d'alerte apparaissent

### Long Terme

1. 🔄 **Réévaluer** tous les 6 mois ou si codebase double de taille

---

## Métriques de Suivi

### À Surveiller

- **Profondeur props drilling** : Maintenir < 3 niveaux
- **Duplication state** : Maintenir < 5% de duplication
- **Performance Context API** : Pas de re-renders excessifs
- **Complexité state** : Maintenir simplicité

### Seuils d'Alerte

- ⚠️ Props drilling > 4 niveaux dans > 10% des composants
- ⚠️ State dupliqué > 10% du codebase
- ⚠️ Re-renders excessifs avec Context API

---

## Conclusion

**Recommandation finale** : ❌ **PAS BESOIN de Zustand/Redux actuellement**

Le stack actuel (React Query + Context API + Hooks) est **suffisant** et **maintenable**.

**Actions immédiates** :
1. ✅ Extraire hooks réutilisables pour state dupliqué
2. ✅ Refactoriser composants avec props drilling > 3
3. ✅ Documenter patterns dans ARCHITECTURE.md

**Réévaluation** : Dans 6 mois ou si codebase double de taille.

---

**Signé** : Architecture Agent  
**Date** : 2025-01-27







