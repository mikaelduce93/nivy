/**
 * Skeleton presets — TICKET-005 (W1-A4)
 * ======================================
 *
 * Composed shapes built from `./atoms`. Two tiers:
 *
 *   1. GENERIC presets (Card, List, Form, Stats, Hero) — usable on any
 *      page, parameterised by `count` / `fields`.
 *   2. COMPONENT-MATCHING presets — DefiCard, AvatarCoach,
 *      TwinCurrencyGauge silhouettes that mirror the EXACT dimensions
 *      and inner layout of the real components, so the swap on data
 *      arrival is visually seamless (no CLS, no jump).
 *
 * Server-component compatible. Tailwind only. Reduced-motion handled at
 * the atom layer (every atom uses `motion-reduce:animate-none`).
 *
 * The 3 critical-fidelity presets MUST be kept in lockstep with their
 * source components. When you change one of:
 *   - components/teen/defi-card.tsx
 *   - components/teen/avatar-coach-client.tsx
 *   - components/teen/twin-currency-gauge.tsx
 * also update the matching preset below. The dimension references next to
 * each section are the single source of truth used by the silhouette.
 */

import * as React from 'react'
import { cn } from '@/lib/utils'
import {
  SkeletonBar,
  SkeletonCircle,
  SkeletonImage,
  SkeletonText,
  SKELETON_BASE,
} from './atoms'

/* ========================================================================== */
/*  GENERIC PRESETS                                                            */
/* ========================================================================== */

/* -------------------------------------------------------------------------- */
/*  <SkeletonCard> — image + title + 2 lines                                   */
/* -------------------------------------------------------------------------- */

export interface SkeletonCardProps {
  /** Hide the top image. Defaults to false. */
  noImage?: boolean
  /** Number of body text lines. Defaults to 2. */
  lines?: number
  className?: string
}

export function SkeletonCard({
  noImage = false,
  lines = 2,
  className,
}: SkeletonCardProps) {
  return (
    <div
      data-slot="skeleton-card"
      className={cn(
        'overflow-hidden rounded-2xl border border-border bg-card',
        className,
      )}
    >
      {!noImage ? (
        <SkeletonImage aspectRatio="video" rounded="rounded-none" />
      ) : null}
      <div className="space-y-3 p-4 sm:p-5">
        <SkeletonBar height="h-5" width="w-3/4" />
        <SkeletonText lines={lines} lineHeight="h-3" />
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  <SkeletonList> — N rows                                                    */
/* -------------------------------------------------------------------------- */

export interface SkeletonListProps {
  /** Number of rows. Defaults to 5. */
  count?: number
  /** Show a leading avatar disc on each row. Defaults to true. */
  withAvatar?: boolean
  /** Show a trailing action chip on each row. Defaults to true. */
  withAction?: boolean
  className?: string
}

export function SkeletonList({
  count = 5,
  withAvatar = true,
  withAction = true,
  className,
}: SkeletonListProps) {
  return (
    <div
      data-slot="skeleton-list"
      className={cn(
        'divide-y divide-border rounded-xl border border-border bg-card',
        className,
      )}
    >
      {Array.from({ length: Math.max(1, count) }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-4">
          {withAvatar ? <SkeletonCircle size={48} /> : null}
          <div className="flex-1 space-y-2">
            <SkeletonBar height="h-4" width="w-3/4" />
            <SkeletonBar height="h-3" width="w-1/2" />
          </div>
          {withAction ? (
            <SkeletonBar height="h-8" width="w-20" rounded="rounded-lg" />
          ) : null}
        </div>
      ))}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  <SkeletonForm> — N field skeletons                                         */
/* -------------------------------------------------------------------------- */

export interface SkeletonFormProps {
  /** Number of fields. Defaults to 4. */
  fields?: number
  /** Render a final submit-button silhouette. Defaults to true. */
  withSubmit?: boolean
  className?: string
}

export function SkeletonForm({
  fields = 4,
  withSubmit = true,
  className,
}: SkeletonFormProps) {
  return (
    <div data-slot="skeleton-form" className={cn('space-y-6', className)}>
      {Array.from({ length: Math.max(1, fields) }).map((_, i) => (
        <div key={i} className="space-y-2">
          <SkeletonBar height="h-4" width="w-24" />
          <SkeletonBar height="h-11" width="w-full" rounded="rounded-lg" />
        </div>
      ))}
      {withSubmit ? (
        <SkeletonBar height="h-11" width="w-full" rounded="rounded-lg" />
      ) : null}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  <SkeletonStats> — KPI grid                                                 */
/* -------------------------------------------------------------------------- */

export interface SkeletonStatsProps {
  /** Number of KPI tiles. Defaults to 4. */
  count?: number
  /** Tailwind responsive column class string. Defaults to `'grid-cols-2 md:grid-cols-4'`. */
  columns?: string
  className?: string
}

export function SkeletonStats({
  count = 4,
  columns = 'grid-cols-2 md:grid-cols-4',
  className,
}: SkeletonStatsProps) {
  return (
    <div
      data-slot="skeleton-stats"
      className={cn('grid gap-4', columns, className)}
    >
      {Array.from({ length: Math.max(1, count) }).map((_, i) => (
        <div
          key={i}
          className="space-y-2 rounded-xl border border-border bg-card p-6"
        >
          <div className="flex items-center justify-between">
            <SkeletonBar height="h-4" width="w-20" />
            <SkeletonBar height="h-8" width="w-8" rounded="rounded-lg" />
          </div>
          <SkeletonBar height="h-8" width="w-24" />
          <SkeletonBar height="h-3" width="w-16" />
        </div>
      ))}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  <SkeletonHero> — page hero                                                 */
/* -------------------------------------------------------------------------- */

export interface SkeletonHeroProps {
  className?: string
}

export function SkeletonHero({ className }: SkeletonHeroProps) {
  return (
    <div
      data-slot="skeleton-hero"
      className={cn(
        'rounded-3xl border border-border bg-card p-5 sm:p-7 md:p-9',
        className,
      )}
    >
      <div className="flex items-center gap-4 sm:gap-6">
        <SkeletonCircle size={80} />
        <div className="flex-1 space-y-3">
          <SkeletonBar height="h-3" width="w-16" />
          <SkeletonBar height="h-8" width="w-40" />
          <SkeletonBar height="h-6" width="w-24" rounded="rounded-full" />
        </div>
        <div className="hidden gap-3 sm:flex">
          <SkeletonBar height="h-20" width="w-24" rounded="rounded-2xl" />
          <SkeletonBar height="h-20" width="w-24" rounded="rounded-2xl" />
        </div>
      </div>
      <div className="mt-6 space-y-3 sm:mt-8">
        <div className="flex justify-between">
          <SkeletonBar height="h-4" width="w-32" />
          <SkeletonBar height="h-4" width="w-40" />
        </div>
        <SkeletonBar height="h-4" width="w-full" rounded="rounded-full" />
      </div>
    </div>
  )
}

/* ========================================================================== */
/*  COMPONENT-MATCHING PRESETS                                                 */
/*                                                                             */
/*  These three presets are byte-for-byte silhouettes of their real            */
/*  components. The dimension comments next to each block reference the        */
/*  source-of-truth file so the silhouette can be re-verified after any        */
/*  visual refactor.                                                           */
/* ========================================================================== */

/* -------------------------------------------------------------------------- */
/*  <SkeletonDefiCard>                                                         */
/*                                                                             */
/*  Source: components/teen/defi-card.tsx                                      */
/*    - container: rounded-3xl border, p-5 sm:p-6 (or px-5 pb-5 pt-4 if image) */
/*    - top row: 9x9 icon disc + label/status stack | reward chip stack        */
/*    - title: text-base/lg font-black                                         */
/*    - description: 2 lines text-sm                                           */
/*    - progress: h-1.5 rounded-full                                           */
/*    - footer: days-left chip + CTA pill                                      */
/* -------------------------------------------------------------------------- */

export interface SkeletonDefiCardProps {
  /** Render the optional cover image (physical défi variant). Default false. */
  withImage?: boolean
  /** Render the progress-bar block. Default true. */
  withProgress?: boolean
  /** Render the footer (days-left + CTA). Default true. */
  withFooter?: boolean
  className?: string
}

export function SkeletonDefiCard({
  withImage = false,
  withProgress = true,
  withFooter = true,
  className,
}: SkeletonDefiCardProps) {
  return (
    <div
      data-slot="skeleton-defi-card"
      aria-hidden
      className={cn(
        // mirrors DefiCard outer shell exactly
        'relative overflow-hidden rounded-3xl border border-white/10',
        'bg-gradient-to-br from-white/[0.04] via-white/[0.02] to-transparent backdrop-blur-md',
        className,
      )}
    >
      {/* Cover image — h-36 w-full when present */}
      {withImage ? (
        <div className={cn(SKELETON_BASE, 'h-36 w-full rounded-none')} />
      ) : null}

      <div className={cn('relative', withImage ? 'px-5 pb-5 pt-4' : 'p-5 sm:p-6')}>
        {/* Top row */}
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            {/* h-9 w-9 icon disc */}
            <div className={cn(SKELETON_BASE, 'h-9 w-9 rounded-xl')} />
            <div className="flex flex-col gap-1.5">
              {/* variant label (10px black uppercase) */}
              <SkeletonBar height="h-2.5" width="w-14" />
              {/* status pill */}
              <SkeletonBar height="h-4" width="w-16" rounded="rounded-full" />
            </div>
          </div>
          {/* Reward chips column */}
          <div className="flex shrink-0 flex-col items-end gap-1">
            <SkeletonBar height="h-5" width="w-20" rounded="rounded-full" />
            <SkeletonBar height="h-5" width="w-16" rounded="rounded-full" />
          </div>
        </div>

        {/* Title — text-base/lg font-black ≈ h-5 sm:h-6 */}
        <SkeletonBar height="h-5 sm:h-6" width="w-3/4" />

        {/* Description — 2 lines text-sm */}
        <div className="mt-2 space-y-1.5">
          <SkeletonBar height="h-3.5" width="w-full" />
          <SkeletonBar height="h-3.5" width="w-2/3" />
        </div>

        {/* Progress block */}
        {withProgress ? (
          <div className="mt-4">
            <div className="mb-1 flex items-center justify-between">
              <SkeletonBar height="h-2.5" width="w-20" />
              <SkeletonBar height="h-2.5" width="w-24" />
            </div>
            <div
              className={cn(SKELETON_BASE, 'h-1.5 w-full rounded-full')}
            />
          </div>
        ) : null}

        {/* Footer */}
        {withFooter ? (
          <div className="mt-4 flex items-center justify-between gap-3">
            <SkeletonBar height="h-3" width="w-16" />
            <SkeletonBar height="h-7" width="w-24" rounded="rounded-full" />
          </div>
        ) : null}
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  <SkeletonAvatarCoach>                                                      */
/*                                                                             */
/*  Source: components/teen/avatar-coach-client.tsx                            */
/*    - container: rounded-2xl border p-4 sm:p-5 md:p-6 (compact: p-3 sm:p-4) */
/*    - avatar disc: h-14 w-14 sm:h-16 sm:w-16 (compact: h-12 w-12)           */
/*    - header: coach name (10px) + dot + mood (10px)                          */
/*    - message: text-base sm:text-lg                                          */
/*    - CTA row: white pill px-4 py-2 + dismiss text                           */
/* -------------------------------------------------------------------------- */

export interface SkeletonAvatarCoachProps {
  /** Compact variant (sidebar / embedded). Default false. */
  compact?: boolean
  className?: string
}

export function SkeletonAvatarCoach({
  compact = false,
  className,
}: SkeletonAvatarCoachProps) {
  return (
    <section
      data-slot="skeleton-avatar-coach"
      aria-hidden
      className={cn(
        'relative w-full overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02] backdrop-blur-md',
        compact ? 'p-3 sm:p-4' : 'p-4 sm:p-5 md:p-6',
        className,
      )}
    >
      <div className="relative flex items-start gap-3 sm:gap-4">
        {/* Avatar disc — exact dimensions from real component */}
        {compact ? (
          <SkeletonCircle size={48} className="ring-2 ring-white/15" />
        ) : (
          <div
            className={cn(
              SKELETON_BASE,
              'h-14 w-14 shrink-0 rounded-full ring-2 ring-white/15 sm:h-16 sm:w-16',
            )}
          />
        )}

        <div className="min-w-0 flex-1">
          {/* Header: coach name (10px) · dot · mood (10px) */}
          <div className="flex items-center gap-2">
            <SkeletonBar height="h-2.5" width="w-16" />
            <div className={cn(SKELETON_BASE, 'h-1.5 w-1.5 rounded-full')} />
            <SkeletonBar height="h-2.5" width="w-12" />
          </div>

          {/* Message — text-base sm:text-lg ≈ h-4 sm:h-5, two lines */}
          <div className={cn('mt-2 space-y-2')}>
            <SkeletonBar height={compact ? 'h-3.5' : 'h-4 sm:h-5'} width="w-full" />
            <SkeletonBar height={compact ? 'h-3.5' : 'h-4 sm:h-5'} width="w-4/5" />
          </div>

          {/* CTA row: pill (h-9, ~w-40) + dismiss text */}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <SkeletonBar
              height="h-9"
              width="w-40"
              rounded="rounded-full"
            />
            <SkeletonBar height="h-8" width="w-20" rounded="rounded-full" />
          </div>
        </div>
      </div>
    </section>
  )
}

/* -------------------------------------------------------------------------- */
/*  <SkeletonTwinCurrencyGauge>                                                */
/*                                                                             */
/*  Source: components/teen/twin-currency-gauge.tsx                            */
/*    - 'compact' → inline-flex pill, w-px divider                             */
/*    - 'full'    → grid-cols-1 sm:grid-cols-[1fr_auto_1fr]                    */
/*                  Each side: p-5 sm:p-6                                       */
/*                  Header row: 9x9 icon disc + 10px label | level chip         */
/*                  Big number: text-3xl sm:text-4xl tabular-nums              */
/*                  Bar: h-1.5 rounded-full                                     */
/*                  Caption: 10px text                                          */
/* -------------------------------------------------------------------------- */

export interface SkeletonTwinCurrencyGaugeProps {
  variant?: 'compact' | 'full'
  className?: string
}

export function SkeletonTwinCurrencyGauge({
  variant = 'full',
  className,
}: SkeletonTwinCurrencyGaugeProps) {
  if (variant === 'compact') {
    return (
      <div
        data-slot="skeleton-twin-currency-gauge"
        aria-hidden
        className={cn(
          'inline-flex items-stretch gap-0 rounded-2xl border border-white/10 bg-zinc-900/60 backdrop-blur',
          className,
        )}
      >
        {/* XP pill content */}
        <div className="flex items-center gap-2 px-3 py-2">
          <div className={cn(SKELETON_BASE, 'h-3.5 w-3.5 rounded-sm')} />
          <SkeletonBar height="h-4" width="w-12" />
          <SkeletonBar height="h-2.5" width="w-6" />
          <SkeletonBar height="h-4" width="w-10" rounded="rounded-md" />
        </div>
        {/* Hard divider — matches the real `w-px bg-white/10` */}
        <div className="w-px bg-white/10" />
        {/* Coins pill content */}
        <div className="flex items-center gap-2 px-3 py-2">
          <div className={cn(SKELETON_BASE, 'h-3.5 w-3.5 rounded-sm')} />
          <SkeletonBar height="h-4" width="w-12" />
          <SkeletonBar height="h-2.5" width="w-8" />
          <SkeletonBar height="h-2.5" width="w-12" />
        </div>
      </div>
    )
  }

  // ---- FULL variant ----
  return (
    <div
      data-slot="skeleton-twin-currency-gauge"
      aria-hidden
      className={cn(
        'overflow-hidden rounded-3xl border border-white/10 bg-zinc-900/60 backdrop-blur',
        className,
      )}
    >
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr]">
        {/* XP side */}
        <div className="relative bg-gradient-to-br from-amber-500/10 to-orange-500/5 p-5 sm:p-6">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={cn(SKELETON_BASE, 'h-9 w-9 rounded-xl')} />
              <SkeletonBar height="h-2.5" width="w-20" />
            </div>
            <SkeletonBar height="h-5" width="w-12" rounded="rounded-lg" />
          </div>
          {/* Big number — text-3xl sm:text-4xl ≈ h-8 sm:h-10 */}
          <div className="flex items-baseline gap-2">
            <SkeletonBar height="h-8 sm:h-10" width="w-24" />
            <SkeletonBar height="h-3.5" width="w-8" />
          </div>
          {/* Level progress bar */}
          <div className="mt-4">
            <div className={cn(SKELETON_BASE, 'h-1.5 w-full rounded-full')} />
            <div className="mt-1.5">
              <SkeletonBar height="h-2.5" width="w-40" />
            </div>
          </div>
          {/* Caption — 10px */}
          <div className="mt-3">
            <SkeletonBar height="h-2.5" width="w-3/4" />
          </div>
        </div>

        {/* Vertical divider — sm+ uses gradient w-px h-3/4 */}
        <div
          className="hidden items-center justify-center bg-gradient-to-b from-transparent via-white/10 to-transparent px-1 sm:flex"
          aria-hidden
        >
          <div className="h-3/4 w-px bg-white/15" />
        </div>
        <div className="h-px w-full bg-white/10 sm:hidden" aria-hidden />

        {/* Coins side */}
        <div className="relative bg-gradient-to-br from-cyan-500/10 to-teal-500/5 p-5 sm:p-6">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={cn(SKELETON_BASE, 'h-9 w-9 rounded-xl')} />
              <SkeletonBar height="h-2.5" width="w-24" />
            </div>
            <SkeletonBar height="h-2.5" width="w-16" />
          </div>
          <div className="flex items-baseline gap-2">
            <SkeletonBar height="h-8 sm:h-10" width="w-24" />
            <SkeletonBar height="h-3.5" width="w-10" />
          </div>
          {/* Disponible / bloqué rows */}
          <div className="mt-4 space-y-1">
            <div className="flex items-center justify-between">
              <SkeletonBar height="h-2.5" width="w-16" />
              <SkeletonBar height="h-2.5" width="w-20" />
            </div>
            <div className="flex items-center justify-between">
              <SkeletonBar height="h-2.5" width="w-20" />
              <SkeletonBar height="h-2.5" width="w-12" />
            </div>
          </div>
          <div className="mt-3">
            <SkeletonBar height="h-2.5" width="w-3/4" />
          </div>
        </div>
      </div>
    </div>
  )
}

/* ========================================================================== */
/*  Aggregated namespace export                                                */
/* ========================================================================== */

export const SkeletonPresets = {
  Card: SkeletonCard,
  List: SkeletonList,
  Form: SkeletonForm,
  Stats: SkeletonStats,
  Hero: SkeletonHero,
  DefiCard: SkeletonDefiCard,
  AvatarCoach: SkeletonAvatarCoach,
  TwinCurrencyGauge: SkeletonTwinCurrencyGauge,
}
