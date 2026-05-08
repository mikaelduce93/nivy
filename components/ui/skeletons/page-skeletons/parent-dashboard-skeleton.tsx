/**
 * Parent Dashboard Skeleton — TICKET-032 (W3-A10)
 * ================================================
 *
 * Byte-for-byte loading silhouette for `app/parent/page.tsx`. Mirrors:
 *
 *   1. SECTION 1 — Sponsor cockpit header
 *      • "ESPACE PARENT ACTIF" badge
 *      • h1 "Centre de Contrôle" (5xl/6xl)
 *      • Tagline
 *      • Quick Financial Overview pill (right side, glass card)
 *      • TeenSponsorHeader (avatar row, "stories" style)
 *
 *   2. SECTION 2 — ParentalApprovalList (conditional, render placeholder)
 *
 *   3. SECTION 3 — 12-col split:
 *      • lg:col-span-8 — EvolutionTracker × N + SponsorChallenge + Limit cards
 *      • lg:col-span-4 — FinancialOverview + 2 action buttons + UpcomingEvents
 *
 * The skeleton uses atoms.tsx primitives (animate-pulse + motion-reduce
 * variant via SKELETON_BASE).
 *
 * Server-component compatible. Tailwind only.
 */

import * as React from 'react'
import { SkeletonBar, SkeletonCircle, SKELETON_BASE } from '../atoms'
import { cn } from '@/lib/utils'

/* -------------------------------------------------------------------------- */
/*  Header — sponsor cockpit                                                   */
/* -------------------------------------------------------------------------- */

function HeaderSilhouette() {
  return (
    <header className="relative space-y-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-10">
        {/* LEFT — title block */}
        <div className="space-y-4">
          {/* "ESPACE PARENT ACTIF" pill */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10">
            <SkeletonCircle size={16} />
            <SkeletonBar width="w-32" height="h-3" />
          </div>
          {/* h1 (5xl..6xl) */}
          <SkeletonBar width="w-80" height="h-14 md:h-16" />
          {/* tagline */}
          <SkeletonBar width="w-64" height="h-5" />
        </div>

        {/* RIGHT — Quick Financial Overview glass pill */}
        <div className="flex items-center gap-10 bg-white/[0.03] border border-white/10 p-8 rounded-[3rem]">
          <div className="text-right space-y-2">
            <SkeletonBar width="w-24" height="h-3" />
            <SkeletonBar width="w-32" height="h-10" />
          </div>
          <div className="w-px h-16 bg-white/10" />
          <div className="space-y-2">
            <SkeletonBar width="w-20" height="h-3" />
            <SkeletonBar width="w-24" height="h-8" />
          </div>
        </div>
      </div>

      {/* TeenSponsorHeader — stories-style avatar row */}
      <section className="pt-4">
        <div className="flex items-center gap-4 overflow-x-auto">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-2 shrink-0">
              <SkeletonCircle size={64} />
              <SkeletonBar width="w-16" height="h-3" />
            </div>
          ))}
        </div>
      </section>
    </header>
  )
}

/* -------------------------------------------------------------------------- */
/*  Evolution tracker silhouette                                               */
/* -------------------------------------------------------------------------- */

function EvolutionTrackerSilhouette() {
  return (
    <div className="rounded-3xl border border-white/5 bg-white/[0.02] p-6 sm:p-8 space-y-6">
      {/* teen name + chip */}
      <div className="flex items-center justify-between">
        <SkeletonBar width="w-40" height="h-6" />
        <SkeletonBar width="w-20" height="h-5" rounded="rounded-full" />
      </div>
      {/* 4 stat bars */}
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="flex justify-between">
              <SkeletonBar width="w-24" height="h-3" />
              <SkeletonBar width="w-12" height="h-3" />
            </div>
            <SkeletonBar width="w-full" height="h-2" rounded="rounded-full" />
          </div>
        ))}
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Sponsor challenge form + limit card row                                    */
/* -------------------------------------------------------------------------- */

function ChallengeAndLimitRow() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* SponsorChallengeForm */}
      <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-6 space-y-4">
        <SkeletonBar width="w-32" height="h-4" />
        <SkeletonBar width="w-full" height="h-10" rounded="rounded-xl" />
        <SkeletonBar width="w-full" height="h-20" rounded="rounded-xl" />
        <SkeletonBar width="w-32" height="h-10" rounded="rounded-xl" />
      </div>
      {/* Limit BentoCard */}
      <div className="rounded-2xl border border-white/5 bg-zinc-900/40 p-6 flex items-center justify-between">
        <div className="space-y-2">
          <SkeletonBar width="w-28" height="h-3" />
          <SkeletonBar width="w-32" height="h-8" />
        </div>
        <SkeletonBar width="w-20" height="h-10" rounded="rounded-xl" />
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Financial overview + buttons + upcoming events                             */
/* -------------------------------------------------------------------------- */

function FinancialPilotColumn() {
  return (
    <div className="space-y-10">
      {/* Section heading */}
      <div className="flex items-center gap-3">
        <SkeletonCircle size={20} />
        <SkeletonBar width="w-32" height="h-3" />
      </div>

      {/* FinancialOverview BentoCard (rows={2}) — minimum tall card */}
      <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-6 space-y-4 min-h-[400px]">
        <SkeletonBar width="w-40" height="h-5" />
        <SkeletonBar width="w-full" height="h-32" rounded="rounded-xl" />
        <div className="space-y-2 pt-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between">
              <SkeletonBar width="w-24" height="h-3" />
              <SkeletonBar width="w-16" height="h-3" />
            </div>
          ))}
        </div>
      </div>

      {/* 2 action buttons grid */}
      <div className="grid grid-cols-2 gap-4">
        <div className={cn(SKELETON_BASE, 'h-20 rounded-3xl')} />
        <div className={cn(SKELETON_BASE, 'h-20 rounded-3xl')} />
      </div>

      {/* UpcomingEvents BentoCard (rows={1}) */}
      <div className="rounded-2xl border border-white/5 bg-zinc-900/40 p-6 space-y-4 min-h-[180px]">
        <SkeletonBar width="w-40" height="h-5" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <SkeletonCircle size={36} />
            <div className="flex-1 space-y-1">
              <SkeletonBar width="w-3/4" height="h-3" />
              <SkeletonBar width="w-1/2" height="h-3" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Main export                                                                */
/* -------------------------------------------------------------------------- */

export function ParentDashboardSkeleton() {
  return (
    <div
      role="status"
      aria-label="Chargement du tableau de bord parent"
      aria-busy="true"
      className="relative min-h-screen bg-[#020408] text-white overflow-x-hidden"
    >
      <div className="relative z-10 container-wide py-16 px-4 md:px-8 max-w-[1600px] mx-auto space-y-16 pb-32">
        {/* SECTION 1 */}
        <HeaderSilhouette />

        {/* SECTION 3 — Evolution + Financial pilot */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* LEFT col (8/12) */}
          <div className="lg:col-span-8 space-y-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <SkeletonCircle size={20} />
                <SkeletonBar width="w-40" height="h-3" />
              </div>
              <SkeletonBar width="w-20" height="h-3" />
            </div>

            <div className="space-y-10">
              {/* Two teens worth of progression cards (representative) */}
              <div className="space-y-8">
                <EvolutionTrackerSilhouette />
                <ChallengeAndLimitRow />
              </div>
              <div className="space-y-8">
                <EvolutionTrackerSilhouette />
                <ChallengeAndLimitRow />
              </div>
            </div>
          </div>

          {/* RIGHT col (4/12) */}
          <div className="lg:col-span-4">
            <FinancialPilotColumn />
          </div>
        </div>
      </div>

      <span className="sr-only">Chargement…</span>
    </div>
  )
}

export default ParentDashboardSkeleton
