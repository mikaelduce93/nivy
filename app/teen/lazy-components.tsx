'use client'

/**
 * Teen dashboard — page-level lazy wrappers (TICKET-034 / TICKET-035)
 * ====================================================================
 *
 * `TeenDashboardContent` is the giant below-the-fold client tree (Bento
 * grid, social feed, map, crew, marketplace overlay…). It dwarfs the
 * above-the-fold content (`AvatarCoach` + `TwinCurrencyGauge`) in JS
 * weight, so we ship it as a separate chunk.
 *
 * Why a thin "use client" wrapper?
 *   - `app/teen/page.tsx` is a Server Component. `next/dynamic({ ssr: false })`
 *     is illegal in Server Components in Next 16 — it must live in a
 *     Client boundary. This file IS that boundary.
 *
 * The skeleton fallback mirrors the eventual hero + bento dimensions to
 * avoid CLS while the chunk streams in.
 */

import dynamic from 'next/dynamic'
import * as React from 'react'
import {
  SkeletonCard,
  SkeletonHero,
  SkeletonStats,
} from '@/components/ui/skeletons/presets'
import type { ComponentProps } from 'react'

// Real component, used only for prop-typing of the dynamic surrogate.
// `import type` keeps it out of the runtime bundle.
import type { TeenDashboardContent as TeenDashboardContentType } from '@/components/teen/dashboard/teen-dashboard-content'

function TeenDashboardSkeleton() {
  return (
    <div className="relative z-10 py-6 sm:py-8 md:py-10 px-3 sm:px-4 md:px-8 max-w-[1600px] mx-auto space-y-6 sm:space-y-8 md:space-y-12 pb-24 md:pb-10">
      {/* Mirrors <Hero> footprint */}
      <SkeletonHero />
      {/* Mirrors the Bento grid first row (priority + quick + friends) */}
      <SkeletonStats count={3} columns="grid-cols-1 md:grid-cols-3" />
      {/* Map + crew row */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        <SkeletonCard className="md:col-span-5 min-h-[250px]" noImage lines={3} />
        <SkeletonCard className="md:col-span-7 min-h-[250px]" noImage lines={4} />
      </div>
      {/* Feed row */}
      <SkeletonCard noImage lines={5} />
    </div>
  )
}

export const LazyTeenDashboardContent = dynamic<
  ComponentProps<typeof TeenDashboardContentType>
>(
  () =>
    import('@/components/teen/dashboard/teen-dashboard-content').then(
      (mod) => ({ default: mod.TeenDashboardContent }),
    ),
  {
    loading: () => <TeenDashboardSkeleton />,
    ssr: false,
  },
)
