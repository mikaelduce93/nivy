# Guide de contribution - Teens Party Morocco

## Prérequis

- Node.js 20+
- npm 10+
- Git

## Installation

```bash
# Cloner le repo
git clone <repo-url>
cd teen

# Installer les dépendances
npm install

# Copier les variables d'environnement
cp env.template .env.local

# Lancer le serveur de développement
npm run dev
```

## Commandes utiles

```bash
# Développement
npm run dev           # Serveur dev (http://localhost:3000)
npm run build         # Build production
npm run start         # Serveur production

# Tests
npm run test          # Tests unitaires (watch mode)
npm run test:run      # Tests unitaires (une fois)
npm run test:e2e      # Tests E2E Playwright
npm run test:all      # Tous les tests

# Qualité
npm run lint          # ESLint

# Storybook
npm run storybook     # Lancer Storybook
```

---

## Ajouter une nouvelle feature

### Étape 1: Créer la structure

```bash
# Créer les dossiers pour la feature
mkdir -p components/features/ma-feature
mkdir -p app/ma-feature
```

Structure type:

```
components/features/ma-feature/
├── index.ts                    # Re-exports
├── ma-feature-card.tsx         # Composant principal
├── ma-feature-list.tsx         # Liste
├── ma-feature-form.tsx         # Formulaire (si besoin)
└── ma-feature.types.ts         # Types TypeScript

app/ma-feature/
├── page.tsx                    # Page principale
├── loading.tsx                 # État de chargement
├── error.tsx                   # Gestion d'erreur
└── [id]/
    └── page.tsx                # Page de détail
```

### Étape 2: Créer le schéma de validation

```tsx
// lib/validation/schemas.ts

// Ajouter le schéma pour la feature
export const maFeatureSchema = z.object({
  title: z.string().min(2, 'Titre requis').max(100),
  description: z.string().max(2000).optional(),
  category: z.enum(['cat1', 'cat2', 'cat3']),
  price: priceSchema,
  // ...
})

export type MaFeatureInput = z.infer<typeof maFeatureSchema>
```

### Étape 3: Créer les Server Actions

```tsx
// app/actions/ma-feature.ts
'use server'

import { createServerClient } from '@/lib/supabase/server'
import { maFeatureSchema } from '@/lib/validation/schemas'
import { revalidatePath } from 'next/cache'

export async function createMaFeature(data: unknown) {
  // 1. Validation
  const result = maFeatureSchema.safeParse(data)
  if (!result.success) {
    return {
      success: false,
      error: 'Données invalides',
      fieldErrors: result.error.flatten().fieldErrors
    }
  }

  // 2. Vérification auth (si nécessaire)
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Non authentifié' }
  }

  // 3. Insertion en base
  const { data: created, error } = await supabase
    .from('ma_feature')
    .insert({
      ...result.data,
      user_id: user.id,
    })
    .select()
    .single()

  if (error) {
    console.error('Create ma-feature error:', error)
    return { success: false, error: 'Erreur lors de la création' }
  }

  // 4. Revalidation du cache
  revalidatePath('/ma-feature')

  return { success: true, data: created }
}

export async function getMaFeatures() {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from('ma_feature')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}
```

### Étape 4: Créer les composants UI

```tsx
// components/features/ma-feature/ma-feature-card.tsx
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface MaFeatureCardProps {
  item: {
    id: string
    title: string
    description?: string
    category: string
  }
}

export function MaFeatureCard({ item }: MaFeatureCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{item.title}</CardTitle>
          <Badge>{item.category}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        {item.description && (
          <p className="text-muted-foreground">{item.description}</p>
        )}
      </CardContent>
    </Card>
  )
}
```

```tsx
// components/features/ma-feature/ma-feature-form.tsx
'use client'

import { useSecureForm } from '@/lib/hooks/use-secure-form'
import { maFeatureSchema } from '@/lib/validation/schemas'
import { createMaFeature } from '@/features/ma-feature'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

export function MaFeatureForm() {
  const { form, state, handleSecureSubmit, hasError, getError } = useSecureForm({
    schema: maFeatureSchema,
    defaultValues: {
      title: '',
      description: '',
      category: 'cat1',
    },
    onSuccess: () => {
      toast.success('Créé avec succès!')
    },
    onError: (error) => {
      toast.error(error)
    },
    resetOnSuccess: true,
  })

  return (
    <form onSubmit={handleSecureSubmit(createMaFeature)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="title">Titre</Label>
        <Input
          id="title"
          {...form.register('title')}
          aria-invalid={hasError('title')}
        />
        {hasError('title') && (
          <p className="text-sm text-destructive">{getError('title')}</p>
        )}
      </div>

      {/* Autres champs... */}

      <Button type="submit" disabled={state.isSubmitting}>
        {state.isSubmitting ? 'Création...' : 'Créer'}
      </Button>
    </form>
  )
}
```

```tsx
// components/features/ma-feature/index.ts
export { MaFeatureCard } from './ma-feature-card'
export { MaFeatureForm } from './ma-feature-form'
export { MaFeatureList } from './ma-feature-list'
```

### Étape 5: Créer les pages

```tsx
// app/ma-feature/page.tsx
import { getMaFeatures } from '@/features/ma-feature'
import { MaFeatureList } from '@/components/features/ma-feature'

export const metadata = {
  title: 'Ma Feature | Teens Party Morocco',
  description: 'Description de la feature',
}

export default async function MaFeaturePage() {
  const items = await getMaFeatures()

  return (
    <main className="container py-8">
      <h1 className="text-3xl font-bold mb-8">Ma Feature</h1>
      <MaFeatureList items={items} />
    </main>
  )
}
```

```tsx
// app/ma-feature/loading.tsx
import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <main className="container py-8">
      <Skeleton className="h-10 w-48 mb-8" />
      <div className="grid gap-4 md:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-48" />
        ))}
      </div>
    </main>
  )
}
```

### Étape 6: Ajouter les tests

```tsx
// tests/unit/validation/ma-feature.test.ts
import { describe, it, expect } from 'vitest'
import { maFeatureSchema } from '@/lib/validation/schemas'

describe('maFeatureSchema', () => {
  it('accepts valid data', () => {
    const data = {
      title: 'Mon titre',
      category: 'cat1',
    }
    expect(() => maFeatureSchema.parse(data)).not.toThrow()
  })

  it('rejects empty title', () => {
    const data = {
      title: '',
      category: 'cat1',
    }
    expect(() => maFeatureSchema.parse(data)).toThrow()
  })
})
```

```tsx
// tests/e2e/ma-feature.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Ma Feature', () => {
  test('displays list', async ({ page }) => {
    await page.goto('/ma-feature')
    await expect(page.getByRole('heading', { name: 'Ma Feature' })).toBeVisible()
  })

  test('creates new item', async ({ page }) => {
    await page.goto('/ma-feature/creer')
    await page.fill('[name="title"]', 'Nouveau titre')
    await page.click('button[type="submit"]')
    await expect(page.getByText('Créé avec succès')).toBeVisible()
  })
})
```

### Étape 7: Créer la story Storybook

```tsx
// stories/features/MaFeatureCard.stories.tsx
import type { Meta, StoryObj } from '@storybook/react'
import { MaFeatureCard } from '@/components/features/ma-feature'

const meta: Meta<typeof MaFeatureCard> = {
  title: 'Features/MaFeature/Card',
  component: MaFeatureCard,
  parameters: {
    layout: 'centered',
  },
}

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    item: {
      id: '1',
      title: 'Exemple de titre',
      description: 'Description de exemple',
      category: 'cat1',
    },
  },
}

export const WithoutDescription: Story = {
  args: {
    item: {
      id: '2',
      title: 'Sans description',
      category: 'cat2',
    },
  },
}
```

---

## Conventions de code

### TypeScript

```tsx
// ✅ Bon: Types explicites pour les props
interface ButtonProps {
  variant?: 'default' | 'outline' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  children: React.ReactNode
}

// ❌ Mauvais: any
function Button(props: any) { ... }
```

### Components

```tsx
// ✅ Bon: Composant fonctionnel avec types
export function MyComponent({ title, onClick }: MyComponentProps) {
  return (
    <div>
      <h2>{title}</h2>
      <button onClick={onClick}>Click</button>
    </div>
  )
}

// ❌ Mauvais: export default anonyme
export default function({ title, onClick }) { ... }
```

### Imports

```tsx
// ✅ Bon: Imports groupés et ordonnés
// 1. React/Next
import { useState } from 'react'
import { useRouter } from 'next/navigation'

// 2. Libs externes
import { z } from 'zod'
import { motion } from 'framer-motion'

// 3. Composants internes
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

// 4. Utils/hooks/types
import { cn } from '@/lib/utils'
import type { User } from '@/types'
```

### CSS/Tailwind

```tsx
// ✅ Bon: Classes ordonnées logiquement
<div className="
  flex items-center justify-between    // Layout
  p-4 gap-2                            // Spacing
  bg-card rounded-lg border            // Visual
  hover:bg-accent transition-colors    // States
">

// ❌ Mauvais: Classes désordonnées
<div className="border p-4 flex rounded-lg hover:bg-accent bg-card gap-2">
```

---

## Git workflow

### Branches

```
main           # Production
├── develop    # Intégration
├── feature/*  # Nouvelles features
├── fix/*      # Bug fixes
└── hotfix/*   # Fixes urgents production
```

### Commits

Format: `type(scope): description`

```bash
feat(events): add event filtering by category
fix(auth): resolve session expiry issue
docs(readme): update installation steps
style(button): adjust padding on mobile
refactor(forms): extract validation logic
test(booking): add e2e tests for payment flow
chore(deps): update dependencies
```

### Pull Requests

1. Créer une branche depuis `develop`
2. Faire les changements
3. Lancer les tests (`npm run test:all`)
4. Créer une PR vers `develop`
5. Attendre la review
6. Merger après approbation

---

## Checklist avant PR

- [ ] Les tests passent (`npm run test:all`)
- [ ] Le lint passe (`npm run lint`)
- [ ] Le build fonctionne (`npm run build`)
- [ ] La feature est testée manuellement
- [ ] Les types TypeScript sont corrects
- [ ] La documentation est à jour (si nécessaire)
- [ ] Les stories Storybook sont créées (pour les composants UI)
