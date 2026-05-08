'use client'

/**
 * Parent dashboard — page-level lazy wrappers (TICKET-034 / TICKET-035)
 * ======================================================================
 *
 * Below-the-fold heavy components are split out here. `next/dynamic` with
 * `ssr: false` requires a Client boundary, which is exactly what this
 * file provides — `app/parent/page.tsx` itself is a Server Component.
 *
 * The 3 heaviest below-the-fold components on the parent dashboard:
 *   1. FinancialOverview — chart-heavy, recharts/svg
 *   2. EvolutionTracker  — per-teen radial / progress charts
 *   3. SponsorChallengeForm — large form + validation runtime
 *
 * Each fallback mirrors the rough silhouette of its real component so
 * the parent dashboard does not jump (CLS) when the chunks resolve.
 */

import dynamic from 'next/dynamic'
import * as React from 'react'
import { SkeletonCard } from '@/components/ui/skeletons/presets'
import type { ComponentProps } from 'react'

import type { FinancialOverview as FinancialOverviewType } from '@/components/parent/dashboard/financial-overview'
import type { EvolutionTracker as EvolutionTrackerType } from '@/components/parent/dashboard/evolution-tracker'
import type { SponsorChallengeForm as SponsorChallengeFormType } from '@/components/parent/sponsor-challenge-form'

/* -------------------------------------------------------------------------- */
/*  FinancialOverview — chart card (~ 2 rows tall)                            */
/* -------------------------------------------------------------------------- */

function FinancialOverviewSkeleton() {
  return (
    <SkeletonCard
      noImage
      lines={4}
      className="min-h-[440px] border-white/5 bg-zinc-900/40"
    />
  )
}

export const LazyFinancialOverview = dynamic<
  ComponentProps<typeof FinancialOverviewType>
>(
  () =>
    import('@/components/parent/dashboard/financial-overview').then((mod) => ({
      default: mod.FinancialOverview,
    })),
  {
    loading: () => <FinancialOverviewSkeleton />,
    ssr: false,
  },
)

/* -------------------------------------------------------------------------- */
/*  EvolutionTracker — per-teen progress chart row                            */
/* -------------------------------------------------------------------------- */

function EvolutionTrackerSkeleton() {
  return (
    <SkeletonCard
      noImage
      lines={5}
      className="min-h-[260px] border-white/5 bg-zinc-900/40"
    />
  )
}

export const LazyEvolutionTracker = dynamic<
  ComponentProps<typeof EvolutionTrackerType>
>(
  () =>
    import('@/components/parent/dashboard/evolution-tracker').then((mod) => ({
      default: mod.EvolutionTracker,
    })),
  {
    loading: () => <EvolutionTrackerSkeleton />,
    ssr: false,
  },
)

/* -------------------------------------------------------------------------- */
/*  SponsorChallengeForm — interactive form (validation, modals)              */
/* -------------------------------------------------------------------------- */

function SponsorChallengeFormSkeleton() {
  return (
    <SkeletonCard
      noImage
      lines={3}
      className="min-h-[200px] border-white/5 bg-zinc-900/40"
    />
  )
}

export const LazySponsorChallengeForm = dynamic<
  ComponentProps<typeof SponsorChallengeFormType>
>(
  () =>
    import('@/components/parent/sponsor-challenge-form').then((mod) => ({
      default: mod.SponsorChallengeForm,
    })),
  {
    loading: () => <SponsorChallengeFormSkeleton />,
    ssr: false,
  },
)
