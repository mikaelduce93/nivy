'use client'

/**
 * <MorphingSkeleton> — Wave 2 TICKET-025
 * ======================================
 *
 * The single primitive every `loading.tsx` (and any in-page Suspense boundary)
 * wraps its skeleton in. It cross-fades the skeleton out as the real content
 * streams in, with a subtle blur+scale morph that feels like the content is
 * "snapping into focus" rather than popping in cold.
 *
 * Why a dedicated file (vs. the variant inside `skeleton-variants.tsx`):
 *   - That file is a heavyweight client module (premium shimmer + 8 preset
 *     skeletons). Importing it from every `loading.tsx` would ship far too
 *     much JS for the loading boundary itself.
 *   - This file is intentionally tiny: one component, framer-motion + a
 *     reduced-motion hook. Safe to ship in every loading bundle.
 *   - The TICKET specifies props `loading` / `children` / `skeleton`. The
 *     legacy variant uses `isLoading`; we keep that one for back-compat and
 *     re-export it under the new name here.
 *
 * USAGE (Wave 3 hand-tune phase will adopt across all 190 loading.tsx):
 *
 * ```tsx
 * // app/teen/<route>/loading.tsx
 * import { MorphingSkeleton } from '@/components/ui/morphing-skeleton'
 * import { PageSkeleton } from '@/components/ui/skeletons/page-skeleton'
 *
 * export default function Loading() {
 *   // In a Next.js loading.tsx file, `loading` is always true — the route
 *   // segment unmounts this component when the page resolves, and Next.js
 *   // performs the swap. MorphingSkeleton still adds the entrance fade.
 *   return (
 *     <MorphingSkeleton loading skeleton={<PageSkeleton kind="dashboard" />}>
 *       {null}
 *     </MorphingSkeleton>
 *   )
 * }
 * ```
 *
 * For client components that *own* the loading state (React 19 `use()`,
 * SWR, TanStack Query, etc.) — flip `loading` to false and the skeleton
 * cross-fades into `children`:
 *
 * ```tsx
 * 'use client'
 * function Inbox() {
 *   const { data, isLoading } = useInbox()
 *   return (
 *     <MorphingSkeleton loading={isLoading} skeleton={<InboxSkeleton />}>
 *       <InboxList items={data} />
 *     </MorphingSkeleton>
 *   )
 * }
 * ```
 *
 * REDUCED MOTION:
 *   Respects `prefers-reduced-motion: reduce`. Under that preference the
 *   component snaps between skeleton and content with zero animation —
 *   no fade, no blur, no scale.
 */

import * as React from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { EASE_DECELERATE, EASE_ACCELERATE } from '@/lib/motion/easing'
import { cn } from '@/lib/utils'

/* ==========================================================================
   PROPS
   ========================================================================== */

export interface MorphingSkeletonProps {
  /**
   * When `true`, render the `skeleton`. When `false`, cross-fade to
   * `children`. In a Next.js `loading.tsx` you typically pass `true`
   * (or simply omit it — defaults to `true`) and let the route segment
   * unmount the component when the page resolves.
   */
  loading?: boolean
  /** The skeleton tree (atoms, presets, bespoke layout). */
  skeleton: React.ReactNode
  /**
   * The real content. Rendered only when `loading === false`. May be `null`
   * inside `loading.tsx` (where the route segment provides the real content).
   */
  children?: React.ReactNode
  /** Optional className applied to the positioning wrapper. */
  className?: string
}

/* ==========================================================================
   ANIMATION TOKENS
   ========================================================================== */

const ENTER_DURATION = 0.32
const EXIT_DURATION = 0.24

/* ==========================================================================
   COMPONENT
   ========================================================================== */

export function MorphingSkeleton({
  loading = true,
  skeleton,
  children,
  className,
}: MorphingSkeletonProps) {
  const prefersReducedMotion = useReducedMotion()

  // Reduced-motion: snap, no fade, no blur, no scale.
  if (prefersReducedMotion) {
    return (
      <div className={cn('relative', className)}>
        {loading ? skeleton : children}
      </div>
    )
  }

  return (
    <div className={cn('relative', className)}>
      <AnimatePresence mode="wait" initial={false}>
        {loading ? (
          <motion.div
            key="morphing-skeleton"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{
              opacity: 0,
              scale: 0.98,
              filter: 'blur(8px)',
            }}
            transition={{
              duration: EXIT_DURATION,
              ease: EASE_ACCELERATE,
            }}
          >
            {skeleton}
          </motion.div>
        ) : (
          <motion.div
            key="morphing-content"
            initial={{
              opacity: 0,
              scale: 1.02,
              filter: 'blur(8px)',
            }}
            animate={{
              opacity: 1,
              scale: 1,
              filter: 'blur(0px)',
            }}
            transition={{
              duration: ENTER_DURATION,
              ease: EASE_DECELERATE,
            }}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ==========================================================================
   BACK-COMPAT ALIAS
   ==========================================================================
   The legacy variant in `components/ui/skeleton-variants.tsx` shipped with
   `isLoading` instead of `loading`. We re-export an alias so both names
   work during the Wave 2/3 migration and existing call sites don't break.
   ========================================================================== */

export interface MorphingSkeletonLegacyProps
  extends Omit<MorphingSkeletonProps, 'loading'> {
  isLoading: boolean
}

/**
 * @deprecated Prefer `<MorphingSkeleton loading={...} />`. This shim exists
 * only for code written against the original `skeleton-variants.tsx` API.
 */
export function MorphingSkeletonCompat({
  isLoading,
  ...rest
}: MorphingSkeletonLegacyProps) {
  return <MorphingSkeleton loading={isLoading} {...rest} />
}
