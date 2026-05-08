/**
 * Partner Dashboard Skeleton — TICKET-032 (W3-A10)
 * =================================================
 *
 * Byte-for-byte loading silhouette for `app/partner/dashboard/page.tsx`.
 * Mirrors:
 *
 *   1. Header — "Partner Elite" pill + h1 "Tableau de Bord" + tagline +
 *      2 right-side action buttons (Centre d'Aide / Créer une Offre)
 *
 *   2. Bento grid:
 *      • Scanner card           (cols=8, rows=2) — UniversalScanner
 *      • Status card            (cols=4, rows=2) — company name + Star
 *      • 4 KPI cards            (cols=3, rows=1 each)
 *      • Active Offers card     (cols=6, rows=2)
 *      • Recent Activity card   (cols=6, rows=2)
 *
 *   3. Quick Links row (5 pills)
 *
 * Server-component compatible. Tailwind only. animate-pulse +
 * motion-reduce variant supplied by SKELETON_BASE on every atom.
 */

import * as React from 'react'
import { SkeletonBar, SkeletonCircle, SKELETON_BASE } from '../atoms'
import { cn } from '@/lib/utils'

/* -------------------------------------------------------------------------- */
/*  Header                                                                     */
/* -------------------------------------------------------------------------- */

function HeaderSilhouette() {
  return (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-white/5 pb-10">
      {/* Left */}
      <div className="space-y-3">
        <SkeletonBar width="w-28" height="h-5" rounded="rounded-full" />
        {/* h1 — text-5xl md:text-6xl */}
        <SkeletonBar width="w-80" height="h-14 md:h-16" />
        <SkeletonBar width="w-72" height="h-5" />
      </div>
      {/* Right — 2 buttons (h-14) */}
      <div className="flex gap-4">
        <div className={cn(SKELETON_BASE, 'h-14 w-40 rounded-2xl')} />
        <div className={cn(SKELETON_BASE, 'h-14 w-48 rounded-2xl')} />
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Scanner BentoCard (cols=8, rows=2) — tall, ~480px                          */
/* -------------------------------------------------------------------------- */

function ScannerCardSilhouette() {
  return (
    <div
      className={cn(
        'rounded-3xl border border-white/5 bg-white/[0.02] p-6 sm:p-8 flex flex-col',
        'md:col-span-8 md:row-span-2 min-h-[480px]',
      )}
    >
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <div className={cn(SKELETON_BASE, 'h-12 w-12 rounded-2xl')} />
          <div className="space-y-2">
            <SkeletonBar width="w-48" height="h-5" />
            <SkeletonBar width="w-40" height="h-3" />
          </div>
        </div>
        <SkeletonBar width="w-12" height="h-3" />
      </div>
      {/* Scanner placeholder area */}
      <div className="flex-grow flex items-center justify-center">
        <div className={cn(SKELETON_BASE, 'aspect-square w-full max-w-[280px] rounded-3xl')} />
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Status card (cols=4, rows=2)                                               */
/* -------------------------------------------------------------------------- */

function StatusCardSilhouette() {
  return (
    <div
      className={cn(
        'rounded-3xl border border-white/5 bg-zinc-900/60 p-6 sm:p-8 flex flex-col justify-between',
        'md:col-span-4 md:row-span-2 min-h-[480px]',
      )}
    >
      <div className="space-y-6">
        {/* Star icon center */}
        <div className="flex justify-center">
          <SkeletonCircle size={80} />
        </div>
        {/* Centered name + tagline */}
        <div className="text-center space-y-3">
          <div className="flex justify-center">
            <SkeletonBar width="w-48" height="h-8" />
          </div>
          <div className="space-y-2 px-4">
            <SkeletonBar width="w-full" height="h-3" />
            <SkeletonBar width="w-2/3" height="h-3" className="mx-auto" />
          </div>
        </div>
      </div>
      {/* Bottom: type row + button */}
      <div className="space-y-4 px-2">
        <div className="flex justify-between items-end">
          <SkeletonBar width="w-12" height="h-3" />
          <SkeletonBar width="w-20" height="h-7" />
        </div>
        <SkeletonBar width="w-full" height="h-10" rounded="rounded-xl" />
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  KPI card (cols=3, rows=1)                                                  */
/* -------------------------------------------------------------------------- */

function KPICardSilhouette() {
  return (
    <div className="rounded-3xl border border-white/5 bg-white/[0.02] p-6 flex flex-col justify-between md:col-span-3 min-h-[200px]">
      <div className="flex justify-between items-start">
        <div className={cn(SKELETON_BASE, 'h-12 w-12 rounded-2xl')} />
        <SkeletonBar width="w-16" height="h-5" rounded="rounded-full" />
      </div>
      <div className="mt-4 space-y-2">
        <SkeletonBar width="w-20" height="h-3" />
        <SkeletonBar width="w-32" height="h-10" />
        <SkeletonBar width="w-24" height="h-3" />
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Wide list card (cols=6, rows=2) — Active Offers / Recent Activity          */
/* -------------------------------------------------------------------------- */

function WideListCardSilhouette({
  rows = 3,
  withAvatar = false,
}: {
  rows?: number
  withAvatar?: boolean
}) {
  return (
    <div className="rounded-3xl border border-white/5 bg-white/[0.02] p-6 sm:p-8 md:col-span-6 md:row-span-2 min-h-[400px]">
      {/* Header row */}
      <div className="flex justify-between items-center mb-8">
        <SkeletonBar width="w-48" height="h-7" />
        <SkeletonBar width="w-24" height="h-4" />
      </div>
      {/* List rows */}
      <div className="space-y-4">
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className="flex items-center justify-between p-5 rounded-2xl bg-white/[0.02] border border-white/5"
          >
            <div className="flex items-center gap-4">
              {withAvatar ? (
                <SkeletonCircle size={48} />
              ) : (
                <div className={cn(SKELETON_BASE, 'h-12 w-12 rounded-2xl')} />
              )}
              <div className="space-y-2">
                <SkeletonBar width="w-32" height="h-4" />
                <SkeletonBar width="w-24" height="h-3" />
              </div>
            </div>
            <div className="space-y-2 text-right">
              <SkeletonBar width="w-16" height="h-4" />
              <SkeletonBar width="w-12" height="h-3" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Quick links row (5 pills)                                                  */
/* -------------------------------------------------------------------------- */

function QuickLinksSilhouette() {
  const widths = ['w-32', 'w-28', 'w-24', 'w-24', 'w-20']
  return (
    <div className="flex flex-wrap gap-4 pt-10">
      {widths.map((w, i) => (
        <div
          key={i}
          className={cn(SKELETON_BASE, 'h-11 rounded-2xl', w)}
        />
      ))}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Main export                                                                */
/* -------------------------------------------------------------------------- */

export function PartnerDashboardSkeleton() {
  return (
    <div
      role="status"
      aria-label="Chargement du tableau de bord partenaire"
      aria-busy="true"
      className="min-h-screen bg-[#030303] text-white overflow-hidden"
    >
      <div className="relative z-10 max-w-7xl mx-auto p-6 md:p-10 space-y-10">
        <HeaderSilhouette />

        {/* Bento grid — 12-col with auto-rows */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 sm:gap-4 md:gap-6 auto-rows-[minmax(220px,auto)]">
          <ScannerCardSilhouette />
          <StatusCardSilhouette />

          <KPICardSilhouette />
          <KPICardSilhouette />
          <KPICardSilhouette />
          <KPICardSilhouette />

          <WideListCardSilhouette rows={2} />
          <WideListCardSilhouette rows={3} withAvatar />
        </div>

        <QuickLinksSilhouette />
      </div>

      <span className="sr-only">Chargement…</span>
    </div>
  )
}

export default PartnerDashboardSkeleton
