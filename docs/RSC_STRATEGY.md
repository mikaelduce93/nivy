# Stratégie React Server Components (RSC)

## Teens Party Morocco - Guide d'Architecture

Ce document définit la stratégie d'utilisation des Server Components et Client Components dans le projet.

---

## Table des Matières

1. [Principes Fondamentaux](#principes-fondamentaux)
2. [Quand utiliser Server vs Client](#quand-utiliser-server-vs-client)
3. [Patterns d'Architecture](#patterns-darchitecture)
4. [Organisation des Fichiers](#organisation-des-fichiers)
5. [Optimisation des Images](#optimisation-des-images)
6. [Data Fetching](#data-fetching)
7. [Lazy Loading](#lazy-loading)
8. [Checklist Performance](#checklist-performance)

---

## Principes Fondamentaux

### Server Components (par défaut)

- **Tout composant sans `'use client'` est un Server Component**
- Rendus sur le serveur, pas de JavaScript envoyé au client
- Accès direct à la base de données, filesystem, secrets
- Meilleur SEO et performance initiale

### Client Components

- Marqués avec `'use client'` en haut du fichier
- Nécessaires pour l'interactivité (onClick, useState, useEffect)
- JavaScript envoyé au client = plus gros bundle

---

## Quand utiliser Server vs Client

### ✅ Server Components - À PRIVILÉGIER

| Cas d'usage | Exemple |
|-------------|---------|
| Affichage de données | Liste d'événements, profils |
| Contenu statique | Pages légales, FAQ |
| Queries base de données | Récupération d'articles |
| Accès aux secrets | API keys, tokens |
| Large dependencies | Markdown parsers, highlight.js |
| SEO critique | Pages produits, articles |

### ⚡ Client Components - UNIQUEMENT si nécessaire

| Cas d'usage | Exemple |
|-------------|---------|
| Interactivité | Boutons, formulaires |
| Hooks React | useState, useEffect, useContext |
| Browser APIs | localStorage, geolocation |
| Event listeners | onClick, onChange, onSubmit |
| Effets visuels | Animations, transitions |
| Third-party client libs | Framer Motion, React Hook Form |

---

## Patterns d'Architecture

### Pattern 1: Server Parent + Client Islands

```tsx
// page.tsx (Server Component)
import { EventsGrid } from '@/components/server'
import { NewsletterForm } from '@/components/client/newsletter-form'

export default async function Page() {
  return (
    <main>
      {/* Server: données chargées côté serveur */}
      <EventsGrid limit={6} />

      {/* Client Island: composant interactif isolé */}
      <NewsletterForm />
    </main>
  )
}
```

### Pattern 2: Composition avec Props

```tsx
// server-wrapper.tsx (Server Component)
import { getEvents } from '@/lib/server'
import { EventFilter } from './event-filter' // Client

export async function EventsSection() {
  const events = await getEvents() // Server-side fetch

  return (
    <section>
      {/* Passer les données au client component */}
      <EventFilter initialEvents={events} />
    </section>
  )
}
```

### Pattern 3: Lazy Loading Client Components

```tsx
// page.tsx (Server Component)
import dynamic from 'next/dynamic'

const HeavyChart = dynamic(
  () => import('@/components/analytics-chart'),
  {
    loading: () => <ChartSkeleton />,
    ssr: false // Pas de SSR pour ce composant
  }
)

export default function Page() {
  return <HeavyChart />
}
```

---

## Organisation des Fichiers

```
components/
├── server/                    # Server Components purs
│   ├── event-card.tsx        # Carte événement (server)
│   ├── events-grid.tsx       # Grille avec Suspense
│   ├── optimized-event-image.tsx
│   └── index.ts
│
├── client/                    # Client Components (interactifs)
│   ├── newsletter-form.tsx
│   ├── search-input.tsx
│   └── index.ts
│
├── ui/                        # UI Components (mixte)
│   ├── button.tsx            # Peut être server ou client
│   ├── input.tsx             # Client (onChange)
│   └── ...
│
└── [feature]/                 # Par feature
    ├── feature-display.tsx   # Server
    └── feature-form.tsx      # Client

lib/
├── server/                    # Utilitaires serveur only
│   ├── data-fetching.ts      # Queries Supabase
│   └── index.ts
│
└── client/                    # Utilitaires client only
    ├── lazy-components.tsx   # Imports dynamiques
    └── index.ts
```

---

## Optimisation des Images

### Utiliser les composants optimisés

```tsx
// ❌ Mauvais
<img src="/event.jpg" alt="Event" />

// ✅ Bon - Server Component
import { OptimizedEventImage } from '@/components/server'

<OptimizedEventImage
  src="/event.jpg"
  alt="Événement"
  fill
  priority={isAboveFold}
  sizes="(max-width: 768px) 100vw, 50vw"
/>
```

### Priorité pour LCP

```tsx
// Marquer priority pour les images above-the-fold
{events.map((event, index) => (
  <EventCard
    key={event.id}
    event={event}
    priority={index < 2} // Premiers 2 = priority
  />
))}
```

### Formats et tailles

| Usage | Format | Quality | Sizes |
|-------|--------|---------|-------|
| Hero | WebP/AVIF | 90 | 100vw |
| Cards | WebP | 85 | 33vw-100vw |
| Thumbnails | WebP | 75 | 25vw-50vw |
| Avatars | WebP | 90 | Fixed |

---

## Data Fetching

### Pattern recommandé: Server Components + cache()

```tsx
// lib/server/data-fetching.ts
import { cache } from 'react'
import 'server-only'

export const getEvents = cache(async () => {
  const supabase = await createClient()
  const { data } = await supabase
    .from('events')
    .select('*')
    .order('event_date')
  return data ?? []
})
```

### Utilisation avec Suspense

```tsx
// events-section.tsx (Server Component)
import { Suspense } from 'react'
import { EventsGridSkeleton } from '@/components/server'

export function EventsSection() {
  return (
    <Suspense fallback={<EventsGridSkeleton />}>
      <EventsGridContent />
    </Suspense>
  )
}

async function EventsGridContent() {
  const events = await getEvents()
  return <EventsGrid events={events} />
}
```

---

## Lazy Loading

### Composants lourds à lazy load

```tsx
// lib/client/lazy-components.tsx
import dynamic from 'next/dynamic'

// QR Scanner (heavy)
export const LazyQRScanner = dynamic(
  () => import('@/components/qr-scanner'),
  { ssr: false }
)

// Charts (Recharts ~200kb)
export const LazyChart = dynamic(
  () => import('@/components/analytics-chart'),
  { ssr: false }
)

// Signature Pad (canvas)
export const LazySignaturePad = dynamic(
  () => import('@/components/signature-pad'),
  { ssr: false }
)
```

### Utilisation

```tsx
// page.tsx
import { LazyChart } from '@/lib/client'

export default function AnalyticsPage() {
  return (
    <div>
      <h1>Analytics</h1>
      <LazyChart data={data} />
    </div>
  )
}
```

---

## Checklist Performance

### Avant chaque PR

- [ ] Les pages sans interactivité n'ont pas `'use client'`
- [ ] Les queries sont dans des Server Components
- [ ] Les images utilisent `next/image` avec `sizes`
- [ ] Les composants lourds sont lazy loaded
- [ ] Les formulaires sont les seuls Client Components
- [ ] Suspense boundaries pour le streaming

### Métriques cibles

| Métrique | Cible | Critique |
|----------|-------|----------|
| LCP | < 2.5s | < 4s |
| FID | < 100ms | < 300ms |
| CLS | < 0.1 | < 0.25 |
| Bundle JS | < 200kb | < 500kb |

### Commandes utiles

```bash
# Analyser le bundle
npm run build
npx @next/bundle-analyzer

# Vérifier les Server Components
grep -r "use client" --include="*.tsx" | wc -l
```

---

## Ressources

- [Next.js Server Components](https://nextjs.org/docs/app/building-your-application/rendering/server-components)
- [React Server Components RFC](https://github.com/reactjs/rfcs/pull/188)
- [Patterns for Server Components](https://nextjs.org/docs/app/building-your-application/rendering/composition-patterns)
