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
