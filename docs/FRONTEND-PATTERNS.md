# Frontend Patterns - Teens Party Morocco

## Table des matières

1. [Server vs Client Components](#server-vs-client-components)
2. [Data Fetching](#data-fetching)
3. [Forms & Validation](#forms--validation)
4. [Error Handling](#error-handling)
5. [Loading States](#loading-states)
6. [Authentication](#authentication)
7. [File Organization](#file-organization)

---

## Server vs Client Components

### Règle d'or

**Server Components par défaut, Client Components uniquement si nécessaire.**

### Quand utiliser Server Components

- Fetch de données
- Accès aux secrets (env vars)
- Rendering de contenu statique
- SEO-critical content

```tsx
// app/evenements/page.tsx (Server Component - default)
import { getEvents } from '@/lib/server/data-fetching'

export default async function EventsPage() {
  const events = await getEvents()

  return (
    <main>
      <h1>Événements</h1>
      <EventList events={events} />
    </main>
  )
}
```

### Quand utiliser Client Components

- Event handlers (onClick, onChange, etc.)
- useState, useEffect, useRef
- Browser APIs (localStorage, geolocation)
- Interactivité (formulaires, modals, etc.)

```tsx
// components/features/events/event-filters.tsx
'use client'

import { useState } from 'react'

export function EventFilters({ onFilterChange }) {
  const [category, setCategory] = useState('all')

  const handleChange = (value: string) => {
    setCategory(value)
    onFilterChange({ category: value })
  }

  return (
    <Select value={category} onValueChange={handleChange}>
      {/* ... */}
    </Select>
  )
}
```

### Pattern de composition

Encapsuler les parties interactives dans des Client Components:

```tsx
// app/evenements/page.tsx (Server Component)
import { getEvents, getCategories } from '@/lib/server/data-fetching'
import { EventFilters } from '@/components/features/events/event-filters'
import { EventGrid } from '@/components/features/events/event-grid'

export default async function EventsPage() {
  const [events, categories] = await Promise.all([
    getEvents(),
    getCategories()
  ])

  return (
    <main>
      {/* Client Component pour l'interactivité */}
      <EventFilters categories={categories} />

      {/* Server Component pour le rendu statique */}
      <EventGrid events={events} />
    </main>
  )
}
```

---

## Data Fetching

### Pattern 1: Server Component direct

```tsx
// app/evenements/[id]/page.tsx
import { notFound } from 'next/navigation'
import { getEventById } from '@/lib/server/data-fetching'

export default async function EventPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const event = await getEventById(id)

  if (!event) {
    notFound()
  }

  return <EventDetails event={event} />
}
```

### Pattern 2: Parallel data fetching

```tsx
// app/dashboard/page.tsx
export default async function DashboardPage() {
  // Fetch en parallèle pour de meilleures performances
  const [user, bookings, notifications] = await Promise.all([
    getCurrentUser(),
    getUserBookings(),
    getNotifications()
  ])

  return (
    <Dashboard
      user={user}
      bookings={bookings}
      notifications={notifications}
    />
  )
}
```

### Pattern 3: Streaming avec Suspense

```tsx
// app/evenements/page.tsx
import { Suspense } from 'react'
import { EventListSkeleton } from '@/components/skeletons'

export default function EventsPage() {
  return (
    <main>
      <h1>Événements</h1>

      {/* Streaming: affiche le skeleton pendant le chargement */}
      <Suspense fallback={<EventListSkeleton />}>
        <EventList />
      </Suspense>
    </main>
  )
}

// Le composant async sera streamé
async function EventList() {
  const events = await getEvents() // Peut être lent
  return <EventGrid events={events} />
}
```

### Pattern 4: Client-side fetching (rare)

Pour les données temps-réel ou après une action utilisateur:

```tsx
'use client'

import { useState, useEffect } from 'react'

export function LiveEventCount() {
  const [count, setCount] = useState<number | null>(null)

  useEffect(() => {
    const fetchCount = async () => {
      const res = await fetch('/api/events/count')
      const data = await res.json()
      setCount(data.count)
    }

    fetchCount()
    const interval = setInterval(fetchCount, 30000) // Refresh toutes les 30s

    return () => clearInterval(interval)
  }, [])

  if (count === null) return <Skeleton className="h-6 w-12" />
  return <span>{count} places</span>
}
```

---

## Forms & Validation

### Hook useSecureForm

Le projet utilise un hook personnalisé qui combine React Hook Form + Zod + protections:

```tsx
'use client'

import { useSecureForm } from '@/lib/hooks/use-secure-form'
import { loginSchema } from '@/lib/validation/schemas'

export function LoginForm() {
  const {
    form,
    state,
    handleSecureSubmit,
    hasError,
    getError
  } = useSecureForm({
    schema: loginSchema,
    defaultValues: {
      email: '',
      password: '',
    },
    onSuccess: (data) => {
      router.push('/dashboard')
    },
    onError: (error) => {
      toast.error(error)
    }
  })

  const onSubmit = handleSecureSubmit(async (data) => {
    const result = await loginAction(data)
    return result
  })

  return (
    <form onSubmit={onSubmit}>
      <div>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          {...form.register('email')}
          aria-invalid={hasError('email')}
        />
        {hasError('email') && (
          <p className="text-sm text-destructive">{getError('email')}</p>
        )}
      </div>

      <Button type="submit" disabled={state.isSubmitting}>
        {state.isSubmitting ? 'Connexion...' : 'Se connecter'}
      </Button>

      {state.globalError && (
        <Alert variant="destructive">{state.globalError}</Alert>
      )}
    </form>
  )
}
```

### Server Actions

```tsx
// app/actions/auth.ts
'use server'

import { createServerClient } from '@/lib/supabase/server'
import { loginSchema } from '@/lib/validation/schemas'

export async function loginAction(data: unknown) {
  // 1. Validation
  const result = loginSchema.safeParse(data)
  if (!result.success) {
    return { success: false, error: 'Données invalides' }
  }

  // 2. Action
  const supabase = await createServerClient()
  const { error } = await supabase.auth.signInWithPassword({
    email: result.data.email,
    password: result.data.password,
  })

  if (error) {
    return { success: false, error: 'Email ou mot de passe incorrect' }
  }

  // 3. Succès
  return { success: true }
}
```

### Schémas de validation

```tsx
// lib/validation/schemas.ts
import { z } from 'zod'

// Champs réutilisables
export const emailSchema = z
  .string()
  .min(1, "L'email est requis")
  .email("Format d'email invalide")
  .max(255)
  .transform(val => val.toLowerCase().trim())

export const passwordSchema = z
  .string()
  .min(8, 'Minimum 8 caractères')
  .max(100)
  .regex(/[A-Z]/, 'Doit contenir une majuscule')
  .regex(/[a-z]/, 'Doit contenir une minuscule')
  .regex(/[0-9]/, 'Doit contenir un chiffre')

export const phoneSchema = z
  .string()
  .regex(/^(\+212|0)[5-7]\d{8}$/, 'Format invalide (ex: 0612345678)')

// Formulaires complets
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Mot de passe requis'),
})

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  confirmPassword: z.string(),
  firstName: nameSchema,
  lastName: nameSchema,
  phone: phoneSchema,
}).refine(data => data.password === data.confirmPassword, {
  message: 'Les mots de passe ne correspondent pas',
  path: ['confirmPassword'],
})
```

---

## Error Handling

### Error boundaries (app/error.tsx)

```tsx
'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log to error reporting service
    console.error(error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
      <h2 className="text-2xl font-bold">Une erreur est survenue</h2>
      <p className="text-muted-foreground">
        Nous nous excusons pour ce désagrément.
      </p>
      <Button onClick={reset}>Réessayer</Button>
    </div>
  )
}
```

### Not Found (app/not-found.tsx)

```tsx
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
      <h2 className="text-2xl font-bold">Page introuvable</h2>
      <p className="text-muted-foreground">
        Cette page n'existe pas ou a été déplacée.
      </p>
      <Button asChild>
        <Link href="/">Retour à l'accueil</Link>
      </Button>
    </div>
  )
}
```

### Gestion erreurs dans les actions

```tsx
// Pattern: Always return { success, error? }
export async function createBooking(data: BookingData) {
  try {
    const validated = bookingSchema.parse(data)
    const result = await db.bookings.create(validated)
    return { success: true, data: result }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: 'Données invalides' }
    }
    console.error('Booking error:', error)
    return { success: false, error: 'Erreur lors de la réservation' }
  }
}
```

---

## Loading States

### Loading UI (loading.tsx)

```tsx
// app/evenements/loading.tsx
import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-10 w-48" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-64 rounded-lg" />
        ))}
      </div>
    </div>
  )
}
```

### Skeleton components

```tsx
// components/skeletons/event-card-skeleton.tsx
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardFooter } from '@/components/ui/card'

export function EventCardSkeleton() {
  return (
    <Card>
      <Skeleton className="h-48 w-full rounded-t-lg" />
      <CardContent className="pt-4 space-y-2">
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-4 w-full" />
      </CardContent>
      <CardFooter>
        <Skeleton className="h-10 w-full" />
      </CardFooter>
    </Card>
  )
}
```

### Button loading state

```tsx
import { Spinner } from '@/components/ui/spinner'

<Button disabled={isLoading}>
  {isLoading && <Spinner className="mr-2" />}
  {isLoading ? 'Chargement...' : 'Envoyer'}
</Button>
```

---

## Authentication

### Protection côté serveur

```tsx
// app/dashboard/page.tsx
import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'

export default async function DashboardPage() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  return <Dashboard user={user} />
}
```

### Admin check

```tsx
// lib/security/admin-check.ts
import { createServerClient } from '@/lib/supabase/server'

export async function requireAdmin() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Non authentifié')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('user_id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    throw new Error('Accès non autorisé')
  }

  return user
}
```

### Usage dans les pages admin

```tsx
// app/admin/page.tsx
import { requireAdmin } from '@/lib/security/admin-check'
import { redirect } from 'next/navigation'

export default async function AdminPage() {
  try {
    await requireAdmin()
  } catch {
    redirect('/auth/login')
  }

  return <AdminDashboard />
}
```

---

## File Organization

### Structure recommandée pour une feature

```
components/
└── features/
    └── events/
        ├── index.ts              # Re-exports
        ├── event-card.tsx        # UI component
        ├── event-list.tsx        # List component
        ├── event-filters.tsx     # Client component (filters)
        ├── event-details.tsx     # Detail view
        └── use-events.ts         # Custom hook (if needed)
```

### Conventions de nommage

| Type | Convention | Exemple |
|------|------------|---------|
| Components | PascalCase | `EventCard.tsx` |
| Hooks | camelCase avec `use` | `useEvents.ts` |
| Utils | camelCase | `formatDate.ts` |
| Types | PascalCase | `EventType.ts` |
| Constants | SCREAMING_SNAKE | `API_ENDPOINTS.ts` |

### Imports absolus

```tsx
// Utiliser les alias configurés dans tsconfig
import { Button } from '@/components/ui/button'
import { getEvents } from '@/lib/server/data-fetching'
import { eventSchema } from '@/lib/validation/schemas'
import { EventCard } from '@/components/features/events'
```

### Co-location

Garder les fichiers liés ensemble:

```
app/
└── evenements/
    ├── page.tsx              # Page
    ├── loading.tsx           # Loading state
    ├── error.tsx             # Error boundary
    ├── not-found.tsx         # 404
    └── [id]/
        ├── page.tsx          # Detail page
        └── loading.tsx       # Detail loading
```
