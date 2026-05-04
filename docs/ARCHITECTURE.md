# Architecture - Teens Party Morocco

## Vue d'ensemble

Application Next.js 16 (App Router) pour la gestion d'événements et activités pour adolescents au Maroc.

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND                                 │
│  Next.js 16 (App Router) + React 19 + TypeScript                │
├─────────────────────────────────────────────────────────────────┤
│                         BACKEND                                  │
│  Next.js API Routes + Server Actions + Edge Middleware          │
├─────────────────────────────────────────────────────────────────┤
│                        SERVICES                                  │
│  Supabase (DB + Auth) │ Stripe │ Resend │ Web Push             │
└─────────────────────────────────────────────────────────────────┘
```

## Structure des dossiers

```
teen/
├── app/                    # Next.js App Router
│   ├── (public)/          # Routes publiques (layout partagé)
│   ├── admin/             # Back-office administrateur
│   ├── api/               # API Routes
│   ├── auth/              # Authentification
│   ├── dashboard/         # Espace utilisateur
│   └── [...]/             # Autres pages
│
├── components/
│   ├── ui/                # Composants UI primitifs (Design System)
│   ├── features/          # Composants métier par feature
│   ├── forms/             # Formulaires réutilisables
│   └── layout/            # Header, Footer, Sidebar, etc.
│
├── lib/
│   ├── accessibility/     # Utilitaires ARIA et a11y
│   ├── hooks/             # Custom React hooks
│   ├── payments/          # Intégrations paiement (CMI, Mobile Money)
│   ├── security/          # CSRF, rate limiting, admin checks
│   ├── server/            # Utilitaires server-only
│   ├── supabase/          # Client Supabase (client/server/middleware)
│   └── validation/        # Schémas Zod et sanitization
│
├── tests/
│   ├── e2e/               # Tests Playwright
│   └── unit/              # Tests Vitest
│
└── docs/                  # Documentation
```

## Stack technique

### Frontend
| Technologie | Usage |
|-------------|-------|
| Next.js 16 | Framework React avec App Router |
| React 19 | UI Library |
| TypeScript | Typage statique |
| Tailwind CSS 4 | Styling utilitaire |
| Framer Motion | Animations |
| React Hook Form | Gestion formulaires |
| Zod | Validation schémas |

### Backend
| Technologie | Usage |
|-------------|-------|
| Next.js API Routes | Endpoints REST |
| Server Actions | Mutations server-side |
| Edge Middleware | Auth, redirections |

### Services externes
| Service | Usage |
|---------|-------|
| Supabase | Base de données PostgreSQL + Auth |
| Stripe | Paiements internationaux |
| CMI | Paiements cartes marocaines |
| Resend | Emails transactionnels |
| Web Push | Notifications push |

## Patterns d'architecture

### 1. Server Components par défaut

```tsx
// app/evenements/page.tsx - Server Component (default)
import { getEvents } from '@/lib/server/data-fetching'

export default async function EventsPage() {
  const events = await getEvents()
  return <EventList events={events} />
}
```

### 2. Client Components explicites

```tsx
// components/features/events/event-filters.tsx
'use client'

import { useState } from 'react'

export function EventFilters() {
  const [filters, setFilters] = useState({})
  // Interactive logic...
}
```

### 3. Server Actions pour les mutations

```tsx
// app/actions/booking.ts
'use server'

import { createServerClient } from '@/lib/supabase/server'
import { bookingSchema } from '@/lib/validation/schemas'

export async function createBooking(formData: FormData) {
  const data = bookingSchema.parse(Object.fromEntries(formData))
  const supabase = await createServerClient()

  const { error } = await supabase
    .from('bookings')
    .insert(data)

  if (error) return { success: false, error: error.message }
  return { success: true }
}
```

### 4. Composition de layouts

```
app/
├── layout.tsx              # Root layout (providers, fonts)
├── (public)/
│   ├── layout.tsx          # Header + Footer
│   └── evenements/
│       └── page.tsx
├── (dashboard)/
│   ├── layout.tsx          # Sidebar + User nav
│   └── mon-compte/
│       └── page.tsx
└── admin/
    ├── layout.tsx          # Admin sidebar
    └── page.tsx
```

## Flux de données

### Lecture (Server → Client)

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Supabase  │ ──► │   Server    │ ──► │   Client    │
│   Database  │     │  Component  │     │  Component  │
└─────────────┘     └─────────────┘     └─────────────┘
                    (fetch data)        (receive props)
```

### Écriture (Client → Server)

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Client    │ ──► │   Server    │ ──► │   Supabase  │
│   Form      │     │   Action    │     │   Database  │
└─────────────┘     └─────────────┘     └─────────────┘
                    (validate + save)
```

## Authentification

### Flow

```
1. User submits credentials
2. Supabase Auth validates
3. Session stored in cookies (httpOnly)
4. Middleware checks session on each request
5. Server Components access user via createServerClient()
```

### Protection des routes

```tsx
// middleware.ts
import { createServerClient } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  const { supabase, response } = createServerClient(request)
  const { data: { session } } = await supabase.auth.getSession()

  // Redirect unauthenticated users
  if (!session && request.nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }

  return response
}
```

## Sécurité

### Couches de protection

1. **Input validation** - Zod schemas sur toutes les entrées
2. **Sanitization** - XSS prevention via `lib/validation/sanitize.ts`
3. **CSRF protection** - Token validation sur mutations
4. **Rate limiting** - Limitation des requêtes par IP
5. **Auth middleware** - Vérification session sur routes protégées
6. **Admin check** - Vérification rôle admin

### Exemple de validation sécurisée

```tsx
// lib/validation/schemas.ts
export const contactSchema = z.object({
  name: nameSchema,      // Sanitized + validated
  email: emailSchema,    // Normalized + validated
  message: z.string()
    .min(10)
    .max(2000)
    .transform(sanitizeString)
})
```

## Base de données

### Tables principales

```sql
-- Utilisateurs (via Supabase Auth)
auth.users

-- Profils utilisateurs
public.profiles (id, user_id, first_name, last_name, phone, role)

-- Événements
public.events (id, title, description, date, location, price, capacity)

-- Réservations
public.bookings (id, user_id, event_id, status, payment_status)

-- Teens (enfants)
public.teens (id, parent_id, first_name, birth_date, interests)

-- Clubs
public.clubs (id, name, description, schedule, price)
```

### Row Level Security (RLS)

```sql
-- Exemple: Users can only see their own bookings
CREATE POLICY "Users can view own bookings"
ON bookings FOR SELECT
USING (auth.uid() = user_id);

-- Admins can see all bookings
CREATE POLICY "Admins can view all bookings"
ON bookings FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.role = 'admin'
  )
);
```

## Performance

### Optimisations appliquées

1. **Server Components** - Rendu côté serveur, moins de JS client
2. **Streaming** - `loading.tsx` pour affichage progressif
3. **Image optimization** - `next/image` avec lazy loading
4. **Code splitting** - Bundles par route automatiques
5. **Caching** - `revalidate` sur les données

### Patterns de cache

```tsx
// Cache static pendant 1 heure
export const revalidate = 3600

// Ou revalidation à la demande
import { revalidatePath } from 'next/cache'
revalidatePath('/evenements')
```

## Tests

### Structure

```
tests/
├── e2e/                   # Tests end-to-end (Playwright)
│   ├── auth.spec.ts       # Login, signup, logout
│   ├── booking.spec.ts    # Flux réservation
│   ├── payment.spec.ts    # Flux paiement
│   └── admin.spec.ts      # Back-office
│
└── unit/                  # Tests unitaires (Vitest)
    ├── validation/        # Schémas Zod
    ├── hooks/             # Custom hooks
    └── utils/             # Utilitaires
```

### Commandes

```bash
npm run test           # Unit tests (watch)
npm run test:run       # Unit tests (once)
npm run test:e2e       # E2E tests
npm run test:all       # All tests
```

## Déploiement

### Environnements

| Environnement | URL | Branch |
|---------------|-----|--------|
| Development | localhost:3000 | feature/* |
| Staging | staging.teensparty.ma | develop |
| Production | teensparty.ma | main |

### Variables d'environnement

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Stripe
STRIPE_SECRET_KEY=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=

# CMI (Paiements Maroc)
CMI_MERCHANT_ID=
CMI_SECRET_KEY=

# Resend (Emails)
RESEND_API_KEY=

# App
NEXT_PUBLIC_APP_URL=
```

## Monitoring

### Outils recommandés

- **Vercel Analytics** - Performance et Web Vitals
- **Sentry** - Error tracking
- **Supabase Dashboard** - Database metrics
- **Stripe Dashboard** - Payment analytics

---

## Conventions de Code

### TypeScript

#### Configuration Strict Mode

Le projet utilise **TypeScript strict mode** activé dans `tsconfig.json` :

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "alwaysStrict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

#### Règles de Typage

1. **Toujours typer les paramètres de fonction** :
```tsx
// ✅ Bon
function handleClick(event: React.MouseEvent<HTMLButtonElement>) {
  // ...
}

// ❌ Mauvais
function handleClick(event) {
  // ...
}
```

2. **Utiliser des types explicites pour les props** :
```tsx
// ✅ Bon
interface ButtonProps {
  label: string
  onClick: () => void
  variant?: 'primary' | 'secondary'
}

// ❌ Mauvais
function Button(props: any) {
  // ...
}
```

3. **Gérer les valeurs null/undefined** :
```tsx
// ✅ Bon
const name: string | null = user?.name ?? null
if (name) {
  console.log(name.toUpperCase())
}

// ❌ Mauvais
const name = user?.name
console.log(name.toUpperCase()) // Erreur si name est undefined
```

4. **Éviter `any`** :
```tsx
// ✅ Bon
function processData(data: unknown) {
  if (typeof data === 'string') {
    return data.toUpperCase()
  }
  return String(data)
}

// ❌ Mauvais
function processData(data: any) {
  return data.toUpperCase()
}
```

### State Management

#### Client State (React Hooks)

Pour le state local à un composant ou quelques composants enfants :

```tsx
// ✅ Utiliser useState pour state local
const [count, setCount] = useState(0)

// ✅ Utiliser Context API pour state partagé dans un sous-arbre
const ThemeContext = createContext<'light' | 'dark'>('light')
```

#### Server State (React Query)

Pour les données serveur (fetching, cache, invalidation) :

```tsx
// ✅ Utiliser React Query pour server state
import { useQuery } from '@tanstack/react-query'

function EventsList() {
  const { data, isLoading } = useQuery({
    queryKey: ['events'],
    queryFn: () => fetchEvents()
  })
  
  if (isLoading) return <Loading />
  return <EventList events={data} />
}
```

#### Évaluation State Management Global

**État actuel** : Pas de state management global (Zustand/Redux)

**Analyse** :
- ✅ React Query gère déjà le server state (cache, invalidation)
- ✅ Context API utilisé pour state partagé (GamificationProvider, etc.)
- ⚠️ Props drilling observé dans certains composants (profondeur 2-3)
- ⚠️ State dupliqué dans quelques composants similaires

**Recommandation** :
- **Pas besoin de Zustand/Redux pour l'instant**
- React Query + Context API suffisent
- Si props drilling > 3 niveaux, considérer Context API ou composition
- Si state dupliqué devient problématique, extraire en hooks réutilisables

**Exemple de refactoring si nécessaire** :
```tsx
// Si props drilling devient problématique
// Avant : ComponentA → ComponentB → ComponentC → ComponentD (4 niveaux)
// Après : Créer un Context ou utiliser composition

// Option 1: Context API
const UserContext = createContext<User | null>(null)

// Option 2: Composition
function ComponentA() {
  return (
    <ComponentB>
      <ComponentC>
        <ComponentD />
      </ComponentC>
    </ComponentB>
  )
}
```

### Patterns de Composants

#### 1. Server Components par défaut

```tsx
// app/events/page.tsx
export default async function EventsPage() {
  const events = await getEvents() // Server Component
  return <EventsList events={events} />
}
```

#### 2. Client Components explicites

```tsx
// components/event-filters.tsx
'use client'

export function EventFilters() {
  const [filters, setFilters] = useState({})
  // Interactive logic
}
```

#### 3. Composition over Props Drilling

```tsx
// ✅ Bon : Composition
function Card({ children }: { children: React.ReactNode }) {
  return <div className="card">{children}</div>
}

function CardHeader({ children }: { children: React.ReactNode }) {
  return <div className="card-header">{children}</div>
}

// Usage
<Card>
  <CardHeader>Title</CardHeader>
  <CardContent>Body</CardContent>
</Card>

// ❌ Mauvais : Props drilling
function Card({ header, content }: { header: string, content: string }) {
  return (
    <div className="card">
      <div className="card-header">{header}</div>
      <div className="card-content">{content}</div>
    </div>
  )
}
```

#### 4. Extraction de Logique Réutilisable

```tsx
// ✅ Bon : Hook réutilisable
function useEventFilters() {
  const [filters, setFilters] = useState({})
  const [filteredEvents, setFilteredEvents] = useState([])
  
  useEffect(() => {
    // Filter logic
  }, [filters])
  
  return { filters, setFilters, filteredEvents }
}

// ❌ Mauvais : Logique dupliquée
function EventsPage() {
  const [filters, setFilters] = useState({})
  // ... duplicate logic
}

function ClubsPage() {
  const [filters, setFilters] = useState({})
  // ... duplicate logic
}
```

### Gestion d'Erreurs

#### TypeScript Errors

```tsx
// ✅ Bon : Type guards
function isError(value: unknown): value is Error {
  return value instanceof Error
}

function handleError(error: unknown) {
  if (isError(error)) {
    console.error(error.message)
  } else {
    console.error('Unknown error', error)
  }
}
```

#### API Errors

```tsx
// ✅ Bon : Typed error handling
type ApiError = {
  message: string
  code: string
  status: number
}

async function fetchData() {
  try {
    const response = await fetch('/api/data')
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }
    return await response.json()
  } catch (error) {
    if (error instanceof Error) {
      // Handle error
    }
    throw error
  }
}
```

### Naming Conventions

1. **Composants** : PascalCase
```tsx
// ✅ Bon
function EventCard() {}
function UserProfile() {}

// ❌ Mauvais
function eventCard() {}
function user_profile() {}
```

2. **Hooks** : camelCase avec préfixe `use`
```tsx
// ✅ Bon
function useEventFilters() {}
function useAuth() {}

// ❌ Mauvais
function getEventFilters() {}
function auth() {}
```

3. **Types/Interfaces** : PascalCase
```tsx
// ✅ Bon
interface UserProfile {}
type EventStatus = 'draft' | 'published'

// ❌ Mauvais
interface userProfile {}
type event_status = 'draft' | 'published'
```

4. **Constantes** : UPPER_SNAKE_CASE
```tsx
// ✅ Bon
const MAX_EVENTS = 10
const API_BASE_URL = 'https://api.example.com'

// ❌ Mauvais
const maxEvents = 10
const apiBaseUrl = 'https://api.example.com'
```

### Fichiers et Organisation

```
components/
├── ui/              # Composants UI primitifs (Button, Input, etc.)
├── features/        # Composants métier par feature (EventCard, BookingForm)
├── forms/           # Formulaires réutilisables
└── layout/          # Layout components (Header, Footer)

lib/
├── hooks/           # Custom hooks (useAuth, useEventFilters)
├── queries/         # React Query hooks (useEvents, useBookings)
├── utils/           # Utilitaires (formatDate, validateEmail)
└── validation/      # Schémas Zod
```

### Exemples de Patterns

#### Pattern: Data Fetching avec React Query

```tsx
// lib/queries/events.ts
import { useQuery } from '@tanstack/react-query'

export function useEvents(filters?: EventFilters) {
  return useQuery({
    queryKey: ['events', filters],
    queryFn: () => fetchEvents(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

// Usage
function EventsPage() {
  const { data: events, isLoading } = useEvents()
  
  if (isLoading) return <Loading />
  return <EventsList events={events} />
}
```

#### Pattern: Server Actions

```tsx
// app/actions/booking.ts
'use server'

import { createServerClient } from '@/lib/supabase/server'
import { bookingSchema } from '@/lib/validation/schemas'

export async function createBooking(data: unknown) {
  const validated = bookingSchema.parse(data)
  const supabase = await createServerClient()
  
  const { error } = await supabase
    .from('bookings')
    .insert(validated)
  
  if (error) {
    throw new Error(error.message)
  }
  
  return { success: true }
}
```

#### Pattern: Error Boundaries

```tsx
// app/error.tsx
'use client'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div>
      <h2>Something went wrong!</h2>
      <button onClick={reset}>Try again</button>
    </div>
  )
}
```

---

## Checklist de Qualité Code

Avant de commiter :

- [ ] ✅ TypeScript strict mode : 0 erreurs
- [ ] ✅ Tous les imports utilisés (pas d'imports inutilisés)
- [ ] ✅ Props typées explicitement
- [ ] ✅ Gestion des valeurs null/undefined
- [ ] ✅ Pas de `any` (sauf cas exceptionnels documentés)
- [ ] ✅ Tests passent
- [ ] ✅ Linter passe (`npm run lint`)
- [ ] ✅ Build passe (`npm run build`)
