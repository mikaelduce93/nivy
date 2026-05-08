# Skeleton System — NIVY

Architecture finalisée Phase 0 (Agent A1). Single primitive, multiple composers.

---

## 1. Architecture

```
components/ui/
├── skeleton.tsx                       # PRIMITIVE (single source of truth)
├── skeleton-variants.tsx              # PREMIUM variants (framer-motion)
├── skeletons/
│   ├── index.ts                       # barrel
│   ├── page-skeleton.tsx              # generic page-level layouts
│   └── dashboard-skeletons.tsx        # teen dashboard-specific layouts
└── states/
    └── skeleton-set.tsx               # composable library (event card, ticket, profile, ...)
```

### One primitive, one animation

The single source of truth is `components/ui/skeleton.tsx`:

```tsx
function Skeleton({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="skeleton"
      className={cn('bg-muted animate-pulse rounded-md', className)}
      {...props}
    />
  )
}
```

- **Animation**: `animate-pulse` (Tailwind built-in). Theme-aware background via `bg-muted`.
- **No framer-motion** at the primitive level — keeps bundle small for `loading.tsx` files.
- All composer files (`page-skeleton`, `dashboard-skeletons`, `skeleton-set`, `skeleton-variants`) wrap or compose this primitive.

### When to use what

| Need | Use |
|---|---|
| One-off skeleton bar inside a component | `Skeleton` from `@/components/ui/skeleton` |
| `loading.tsx` for a list/grid page (Next.js) | `PageSkeleton` / `GridSkeleton` / `ListSkeleton` from `@/components/ui/skeletons` |
| Loading state for the teen dashboard widgets | `HeroSkeleton`, `BentoCardSkeleton`, ... from `@/components/ui/skeletons/dashboard-skeletons` |
| Domain-specific skeleton (event card, ticket, profile, table, form, article) | `SkeletonEventCard`, `SkeletonTicketList`, ... from `@/components/ui/states/skeleton-set` |
| Premium animated marketing/dashboard skeleton (shimmer + glow + stagger) | `HeroSkeleton`, `MapSkeleton`, `DashboardSkeleton` from `@/components/ui/skeleton-variants` |

---

## 2. Theme-awareness

All skeleton surfaces use **theme-aware tokens** — never `bg-zinc-900` or `bg-white/5` raw:

| Surface | Token |
|---|---|
| Skeleton fill (the pulsing block itself) | `bg-muted` |
| Skeleton container (card-like wrapper) | `bg-card/50` or `bg-card/80` |
| Container border | `border-border/50` |

If you must override the fill (rare), use `bg-card`, `bg-secondary` or another semantic token — never a raw zinc/gray scale.

---

## 3. Examples

### A. Inline skeleton (primitive directly)

```tsx
import { Skeleton } from '@/components/ui/skeleton'

<div className="space-y-2">
  <Skeleton className="h-6 w-3/4" />
  <Skeleton className="h-4 w-1/2" />
</div>
```

### B. Generic loading page (`app/.../loading.tsx`)

```tsx
import { PageSkeleton } from '@/components/ui/skeletons'

export default function Loading() {
  return <PageSkeleton header={{ title: true, subtitle: true }} content="grid" itemCount={6} columns={3} />
}
```

### C. Domain-specific (event grid)

```tsx
import { SkeletonEventGrid } from '@/components/ui/states/skeleton-set'

if (isLoading) return <SkeletonEventGrid count={6} />
```

### D. Premium dashboard hero (with shimmer + glow + stagger)

```tsx
import { DashboardSkeleton } from '@/components/ui/skeleton-variants'

export default function TeenDashboardLoading() {
  return <DashboardSkeleton />
}
```

---

## 4. Creating a new skeleton

1. **Compose the primitive — never invent a local `<div className="bg-... animate-...">`.**
2. Use semantic tokens for backgrounds and borders (`bg-card`, `border-border`, `bg-muted`).
3. Match the pattern of one of the existing files:
   - Page-level → add to `components/ui/skeletons/page-skeleton.tsx`
   - Dashboard widget → add to `components/ui/skeletons/dashboard-skeletons.tsx`
   - Domain content (cards, lists, profiles) → add to `components/ui/states/skeleton-set.tsx`
   - Premium animated → add to `components/ui/skeleton-variants.tsx`
4. Export from the appropriate barrel (`skeletons/index.ts`) when relevant.

---

## 5. Audit / enforcement

Regression check:

```bash
# No raw zinc/gray skeleton backgrounds in components/ui/
rg "bg-zinc-9\d{2}|bg-gray-9\d{2}" components/ui/skeleton*

# Single Skeleton symbol — components shouldn't redefine it locally
rg "^export function Skeleton\b|^function Skeleton\b" components/
```

Expected:
- `components/ui/skeleton.tsx` defines `Skeleton`.
- `components/ui/skeletons/dashboard-skeletons.tsx` re-exports a thin wrapper that delegates to the primitive.
- `components/ui/skeleton-variants.tsx` defines its own `Skeleton` (premium framer-motion variant) — this one is intentionally distinct because it carries shimmer/glow/premium props.

If a new component redefines `Skeleton` locally, fold it back into one of the four files above.

---

## 6. `<MorphingSkeleton>` — Wave 2 TICKET-025 (W2-A11)

A dedicated lightweight primitive lives at:

```
components/ui/morphing-skeleton.tsx
```

It cross-fades a skeleton tree into real content with a subtle blur+scale
morph (the content "snaps into focus" rather than popping). Under
`prefers-reduced-motion: reduce` the swap is instant — no fade, no blur.

### Props

```ts
interface MorphingSkeletonProps {
  loading?: boolean       // defaults to true (loading.tsx use case)
  skeleton: ReactNode     // required — the skeleton tree
  children?: ReactNode    // the real content
  className?: string
}
```

### Adoption pattern (Wave 3 hand-tune phase)

There are two flavours of consumer.

**A. Next.js `loading.tsx` (~190 files generated by W2-A9 + W2-A10).**
The route segment unmounts the loading boundary the moment the page
streams in, so we always pass `loading` (defaulted to `true`) and `null`
children. The visible payoff is the *enter* fade — a smoother
appearance of the skeleton itself.

```tsx
// app/teen/<route>/loading.tsx
import { MorphingSkeleton } from '@/components/ui/morphing-skeleton'
import { PageSkeleton } from '@/components/ui/skeletons/page-skeleton'

export default function Loading() {
  return (
    <MorphingSkeleton skeleton={<PageSkeleton kind="dashboard" />}>
      {null}
    </MorphingSkeleton>
  )
}
```

**B. In-page `Suspense` boundaries / client components owning their own
loading state (React 19 `use()`, SWR, TanStack Query, etc.).**
Pass `loading={isLoading}` and the real children — both transitions
animate. This is where the cross-fade truly shines.

```tsx
'use client'
function Inbox() {
  const { data, isLoading } = useInbox()
  return (
    <MorphingSkeleton loading={isLoading} skeleton={<InboxSkeleton />}>
      <InboxList items={data} />
    </MorphingSkeleton>
  )
}
```

### Why a separate file from `skeleton-variants.tsx`

The primitive is intentionally isolated:
- `skeleton-variants.tsx` is a heavyweight client module (premium shimmer
  + 8 preset skeletons + `MorphingSkeleton`-legacy with `isLoading`).
  Importing it from every `loading.tsx` would balloon the loading bundle.
- `morphing-skeleton.tsx` is one component, one hook, one easing import.
  Safe to ship in every route's loading boundary.

The legacy variant inside `skeleton-variants.tsx` (with `isLoading`)
remains for back-compat. A `MorphingSkeletonCompat` shim is exported
from the new file for any straggler imports during migration.

### Wave 3 task

Wave 3 hand-tune (TICKET-032 in the dependency graph) replaces each
generated `loading.tsx` body with a `<MorphingSkeleton>` wrapper around
the route's preset skeleton. The codemod is mechanical — the primitive
is fixed; only the `skeleton` prop varies per route.
