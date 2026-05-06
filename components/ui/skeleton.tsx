/**
 * Skeleton (primitive)
 * ====================
 *
 * Single source of truth for skeleton loading states across the app.
 * See `docs/design/SKELETON_SYSTEM.md` for the full architecture.
 *
 * QUAND UTILISER QUOI :
 *
 * - `@/components/ui/skeleton` (CE FICHIER) :
 *     Primitive bas-niveau. Un simple <div> animé `bg-muted animate-pulse rounded-md`.
 *     Theme-aware (clair/sombre). A utiliser pour composer ses propres skeletons
 *     inline (badges, lignes, blocs).
 *
 * - `@/components/ui/skeleton-variants` :
 *     Variants premium framer-motion (shimmer, glow, stagger) — pour pages
 *     vitrines / dashboards où l'animation enrichie ajoute de la valeur.
 *
 * - `@/components/ui/skeletons/page-skeleton` :
 *     Skeleton complet de page (header + sections) pour les `loading.tsx` Next.js.
 *     Compose la primitive.
 *
 * - `@/components/ui/skeletons/dashboard-skeletons` :
 *     Skeletons spécifiques au dashboard teen. Re-exporte la primitive et
 *     compose des layouts dédiés (hero, bento, mission, map preview...).
 *
 * - `@/components/ui/states/skeleton-set` :
 *     Library de skeleton "compose" (event card, ticket, profil, table...).
 *     Compose la primitive.
 *
 * Règle :
 * - Toujours utiliser ce fichier (ou un wrapper thin). Aucun nouveau composant
 *   ne doit redéfinir un `<div>` skeleton local avec ses propres `bg-*` /
 *   animations.
 */

import { cn } from '@/lib/utils'

function Skeleton({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="skeleton"
      className={cn('bg-muted animate-pulse rounded-md', className)}
      {...props}
    />
  )
}

export { Skeleton }
