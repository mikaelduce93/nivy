/**
 * Teen Dashboard Skeleton — TICKET-032 (W3-A10)
 * ==============================================
 *
 * Byte-for-byte loading silhouette for `app/teen/page.tsx`. Mirrors the
 * exact DOM rhythm of:
 *   1. AvatarCoach  (rounded-2xl card, ~88px tall)
 *   2. TwinCurrencyGauge (XP + coins, ~96px tall)
 *   3. Hero         (~280px on mobile / ~340px on desktop)
 *   4. BentoGrid    (3 rows: priority+actions+friends, map+crew, profile+xp+feed)
 *   5. Mobile dock  (h-16 spacer)
 *
 * The skeleton uses the SkeletonBar / SkeletonCircle / SkeletonImage atoms
 * which already share `SKELETON_BASE` (animate-pulse + motion-reduce variant).
 *
 * Fidelity rules:
 *   - Heights match the real component to prevent CLS on hydration.
 *   - Tailwind tokens only (no inline px) so the skeleton scales with theme.
 *   - Server-component compatible (no `'use client'` directive).
 *
 * If you change `app/teen/page.tsx` or `teen-dashboard-content.tsx` layout,
 * update this file in lockstep.
 */

import * as React from 'react'
import { SkeletonBar, SkeletonCircle, SKELETON_BASE } from '../atoms'
import { cn } from '@/lib/utils'

/* -------------------------------------------------------------------------- */
/*  Top sliver — AvatarCoach + TwinCurrencyGauge                               */
/* -------------------------------------------------------------------------- */

function AvatarCoachSilhouette() {
  return (
    <div
      aria-hidden
      className="rounded-2xl border border-emerald-400/10 bg-gradient-to-br from-emerald-500/5 via-transparent to-transparent p-4 sm:p-5"
    >
      <div className="flex items-start gap-3">
        <SkeletonCircle size={48} />
        <div className="min-w-0 flex-1 space-y-2">
          <SkeletonBar width="w-20" height="h-3" />
          <SkeletonBar width="w-3/4" height="h-4" />
          <SkeletonBar width="w-1/2" height="h-3" />
        </div>
      </div>
    </div>
  )
}

function TwinCurrencyGaugeSilhouette() {
  return (
    <div
      aria-hidden
      className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4"
    >
      {/* XP card */}
      <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4 sm:p-5 space-y-3">
        <div className="flex items-center justify-between">
          <SkeletonBar width="w-12" height="h-3" />
          <SkeletonBar width="w-16" height="h-3" />
        </div>
        <SkeletonBar width="w-32" height="h-8" />
        <SkeletonBar width="w-full" height="h-2" rounded="rounded-full" />
      </div>
      {/* Coins card */}
      <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4 sm:p-5 space-y-3">
        <div className="flex items-center justify-between">
          <SkeletonBar width="w-16" height="h-3" />
          <SkeletonBar width="w-12" height="h-3" />
        </div>
        <SkeletonBar width="w-28" height="h-8" />
        <SkeletonBar width="w-2/3" height="h-2" rounded="rounded-full" />
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Hero — variant-agnostic silhouette                                         */
/* -------------------------------------------------------------------------- */

function HeroSilhouette() {
  return (
    <div
      aria-hidden
      className="rounded-3xl border border-white/5 bg-card/40 p-5 sm:p-7 md:p-9"
    >
      <div className="flex items-center gap-4 sm:gap-6">
        <SkeletonCircle size={64} className="sm:!h-20 sm:!w-20 md:!h-24 md:!w-24" />
        <div className="flex-1 space-y-3">
          <SkeletonBar width="w-16" height="h-3" />
          <SkeletonBar width="w-40" height="h-8" />
          <SkeletonBar width="w-24" height="h-6" rounded="rounded-full" />
        </div>
        <div className="hidden sm:flex gap-3">
          <div className={cn(SKELETON_BASE, 'h-20 w-24 rounded-2xl')} />
          <div className={cn(SKELETON_BASE, 'h-20 w-24 rounded-2xl')} />
        </div>
      </div>
      <div className="mt-6 sm:mt-8 space-y-3">
        <div className="flex justify-between">
          <SkeletonBar width="w-32" height="h-4" />
          <SkeletonBar width="w-40" height="h-4" />
        </div>
        <SkeletonBar width="w-full" height="h-4" rounded="rounded-full" />
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Bento card silhouette — generic                                            */
/* -------------------------------------------------------------------------- */

function BentoCardSilhouette({
  className,
  showAvatarRow = false,
}: {
  className?: string
  showAvatarRow?: boolean
}) {
  return (
    <div
      aria-hidden
      className={cn(
        'rounded-2xl border border-white/5 bg-white/[0.02] p-5 sm:p-6 space-y-3 min-h-[140px] sm:min-h-[160px] md:min-h-[180px]',
        className,
      )}
    >
      <div className="flex items-center justify-between">
        <SkeletonBar width="w-24" height="h-3" />
        <SkeletonCircle size={32} />
      </div>
      <SkeletonBar width="w-3/4" height="h-5" />
      {showAvatarRow ? (
        <div className="flex gap-2 pt-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCircle key={i} size={28} />
          ))}
        </div>
      ) : (
        <>
          <SkeletonBar width="w-full" height="h-3" />
          <SkeletonBar width="w-2/3" height="h-3" />
        </>
      )}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Mobile bottom-nav spacer                                                    */
/* -------------------------------------------------------------------------- */

function MobileDockSpacer() {
  return <div aria-hidden className="h-16 md:hidden" />
}

/* -------------------------------------------------------------------------- */
/*  Main export                                                                */
/* -------------------------------------------------------------------------- */

export function TeenDashboardSkeleton() {
  return (
    <div
      role="status"
      aria-label="Chargement du tableau de bord"
      aria-busy="true"
      className="relative min-h-screen bg-[#020203] text-white overflow-x-hidden"
    >
      {/* 1. AvatarCoach + TwinCurrencyGauge sliver — matches the wrapper in
            app/teen/page.tsx (px-3 sm:px-4 md:px-8, max-w-[1600px], pt-4..8). */}
      <div className="relative z-20 px-3 sm:px-4 md:px-8 max-w-[1600px] mx-auto pt-4 sm:pt-6 md:pt-8 space-y-4 sm:space-y-6">
        <AvatarCoachSilhouette />
        <TwinCurrencyGaugeSilhouette />
      </div>

      {/* 2. Dashboard content — matches teen-dashboard-content.tsx outer
            container (py-6..10, px-3..8, max-w-[1600px], space-y-6..12). */}
      <div className="relative z-10 py-6 sm:py-8 md:py-10 px-3 sm:px-4 md:px-8 max-w-[1600px] mx-auto space-y-6 sm:space-y-8 md:space-y-12 pb-24 md:pb-10">
        {/* Hero */}
        <HeroSilhouette />

        {/* Bento Grid — 12-col: row 1 (6+3+3), row 2 (5+7), row 3 (4+4+8) */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 sm:gap-4 md:gap-6 auto-rows-[minmax(140px,auto)] sm:auto-rows-[minmax(160px,auto)] md:auto-rows-[minmax(180px,auto)]">
          {/* Row 1 */}
          <BentoCardSilhouette className="md:col-span-6" />
          <BentoCardSilhouette className="md:col-span-3 md:row-span-2" />
          <BentoCardSilhouette className="md:col-span-3" showAvatarRow />

          {/* Row 2 */}
          <BentoCardSilhouette
            className="md:col-span-5 md:row-span-2 min-h-[200px] sm:min-h-[250px]"
          />
          <BentoCardSilhouette className="md:col-span-7 md:row-span-2" />

          {/* Row 3 */}
          <BentoCardSilhouette className="md:col-span-4" />
          <BentoCardSilhouette className="md:col-span-4" />
          <BentoCardSilhouette className="md:col-span-8 md:row-span-2" />
        </div>
      </div>

      {/* Mobile bottom nav spacer */}
      <MobileDockSpacer />

      <span className="sr-only">Chargement…</span>
    </div>
  )
}

export default TeenDashboardSkeleton
