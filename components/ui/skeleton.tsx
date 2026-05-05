/**
 * Skeleton (primitive)
 * ====================
 *
 * Skeleton loading primitive utilisée partout dans l'app.
 *
 * QUAND UTILISER QUOI (catalogue Agent 7) :
 *
 * - `@/components/ui/skeleton` (CE FICHIER) :
 *     Primitive bas-niveau. Un simple <div> animé `bg-accent animate-pulse rounded-md`.
 *     A utiliser pour composer ses propres skeletons inline (badges, lignes, blocs).
 *
 * - `@/components/ui/skeleton-variants` :
 *     Variants prêts à l'emploi (card, list-item, avatar, etc.) basés sur la primitive.
 *     A utiliser quand on veut un look standardisé sans recomposer.
 *
 * - `@/components/ui/skeletons/page-skeleton` :
 *     Skeleton complet de page (header + sections). Pour les `loading.tsx` Next.js.
 *
 * - `@/components/ui/skeletons/dashboard-skeletons` :
 *     Skeletons spécifiques aux pages dashboard (stats cards, widgets).
 *
 * - `@/components/ui/states/skeleton-set` :
 *     Skeletons combinés "tout-en-un" pour states de chargement de blocs UI
 *     (utilisé par `state-wrapper.tsx`).
 *
 * - `@/components/ui/effects/elite-skeleton` :
 *     Skeleton premium avec effet shimmer/glow. Réservé aux écrans "elite"
 *     (premium, ambassador, partner) où le visual identity demande l'effet.
 *
 * Règle de consolidation Agent 7 (Phase 2) :
 * - Aucune variante n'est supprimée : chacune répond à un besoin réel.
 * - Pour un nouveau skeleton, préférer composer depuis cette primitive ou
 *   utiliser `skeleton-variants` avant d'en créer un nouveau.
 */

import { cn } from '@/lib/utils'

function Skeleton({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="skeleton"
      className={cn('bg-accent animate-pulse rounded-md', className)}
      {...props}
    />
  )
}

export { Skeleton }
