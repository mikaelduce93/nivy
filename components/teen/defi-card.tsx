/**
 * <DefiCard> — V1.1 P2.1 unifying component (FRONTEND_REDO).
 *
 * Single source-of-truth visual for any "défi" / quest tile:
 *   - daily / weekly / monthly / seasonal quests (cyan / indigo / purple / amber accents)
 *   - physical défis (emerald, with optional cover image)
 *   - friend défis (pink, peer-to-peer challenges)
 *
 * Server-component compatible (no `'use client'`). All animation is CSS only.
 *
 * Replaces the bespoke quest tiles scattered across:
 *   - app/teen/quests/* (daily/weekly/monthly/seasonal cards)
 *   - app/teen/defis-physiques/* (physical challenge tiles)
 *   - friend défi widgets in social hubs.
 *
 * B2/B3 will integrate; this PR delivers the component + a preview page.
 */

import * as React from "react"
import Link from "next/link"
import Image from "next/image"
import * as LucideIcons from "lucide-react"
import {
  Zap,
  Coins,
  CheckCircle2,
  Lock,
  Clock,
  ArrowRight,
  Target,
} from "lucide-react"
import { cn } from "@/lib/utils"

export type DefiVariant =
  | "daily"
  | "weekly"
  | "monthly"
  | "seasonal"
  | "physical"
  | "friend"

export type DefiStatus = "active" | "completed" | "expired" | "locked"

export interface DefiCardProps {
  type: DefiVariant
  title: string
  description?: string
  xpReward: number
  coinReward?: number
  status: DefiStatus
  progress?: { current: number; target: number }
  /** lucide-react icon name (e.g. "Flame", "Trophy"). Falls back to a sensible per-variant default. */
  iconName?: string
  /** If set, the whole card is a Link (full-tile click target). */
  href?: string
  /** Cover image — primarily for physical défis. Uses next/image. */
  imageUrl?: string
  /** Optional CTA button label. */
  ctaLabel?: string
  /** Optional CTA button href. If omitted but ctaLabel is set, the CTA falls back to `href`. */
  ctaHref?: string
  /** Days-left countdown chip. 0 = "Dernier jour", negative hidden. */
  daysLeft?: number
  className?: string
}

/** Tailwind-stable variant tokens. Each entry uses literal class strings (no interpolation)
 *  so Tailwind's JIT can detect them at build time. */
const VARIANT_TOKENS: Record<
  DefiVariant,
  {
    label: string
    accentText: string
    accentDot: string
    accentBg: string
    accentRing: string
    surface: string
    progressFrom: string
    progressTo: string
    glow: string
    defaultIcon: string
  }
> = {
  daily: {
    label: "Daily",
    accentText: "text-cyan-300",
    accentDot: "bg-cyan-300",
    accentBg: "bg-cyan-500/15",
    accentRing: "ring-cyan-400/30",
    surface:
      "bg-gradient-to-br from-cyan-500/10 via-cyan-500/[0.03] to-transparent",
    progressFrom: "from-cyan-400",
    progressTo: "to-sky-400",
    glow: "bg-cyan-500/40",
    defaultIcon: "Flame",
  },
  weekly: {
    label: "Weekly",
    accentText: "text-indigo-300",
    accentDot: "bg-indigo-300",
    accentBg: "bg-indigo-500/15",
    accentRing: "ring-indigo-400/30",
    surface:
      "bg-gradient-to-br from-indigo-500/10 via-indigo-500/[0.03] to-transparent",
    progressFrom: "from-indigo-400",
    progressTo: "to-violet-400",
    glow: "bg-indigo-500/40",
    defaultIcon: "Calendar",
  },
  monthly: {
    label: "Monthly",
    accentText: "text-purple-300",
    accentDot: "bg-purple-300",
    accentBg: "bg-purple-500/15",
    accentRing: "ring-purple-400/30",
    surface:
      "bg-gradient-to-br from-purple-500/10 via-purple-500/[0.03] to-transparent",
    progressFrom: "from-purple-400",
    progressTo: "to-fuchsia-400",
    glow: "bg-purple-500/40",
    defaultIcon: "Trophy",
  },
  seasonal: {
    label: "Seasonal",
    accentText: "text-amber-300",
    accentDot: "bg-amber-300",
    accentBg: "bg-amber-500/15",
    accentRing: "ring-amber-400/30",
    surface:
      "bg-gradient-to-br from-amber-500/10 via-amber-500/[0.03] to-transparent",
    progressFrom: "from-amber-400",
    progressTo: "to-orange-400",
    glow: "bg-amber-500/40",
    defaultIcon: "Sparkles",
  },
  physical: {
    label: "Physique",
    accentText: "text-emerald-300",
    accentDot: "bg-emerald-300",
    accentBg: "bg-emerald-500/15",
    accentRing: "ring-emerald-400/30",
    surface:
      "bg-gradient-to-br from-emerald-500/10 via-emerald-500/[0.03] to-transparent",
    progressFrom: "from-emerald-400",
    progressTo: "to-teal-400",
    glow: "bg-emerald-500/40",
    defaultIcon: "Dumbbell",
  },
  friend: {
    label: "Entre amis",
    accentText: "text-pink-300",
    accentDot: "bg-pink-300",
    accentBg: "bg-pink-500/15",
    accentRing: "ring-pink-400/30",
    surface:
      "bg-gradient-to-br from-pink-500/10 via-pink-500/[0.03] to-transparent",
    progressFrom: "from-pink-400",
    progressTo: "to-rose-400",
    glow: "bg-pink-500/40",
    defaultIcon: "Users",
  },
}

type LucideIconLike = React.ComponentType<{
  className?: string
  "aria-hidden"?: boolean
}>

function resolveIcon(
  iconName: string | undefined,
  fallback: string,
): LucideIconLike {
  const lib = LucideIcons as unknown as Record<string, unknown>
  if (iconName && typeof lib[iconName] !== "undefined") {
    return lib[iconName] as LucideIconLike
  }
  if (typeof lib[fallback] !== "undefined") {
    return lib[fallback] as LucideIconLike
  }
  return Target as LucideIconLike
}

function pct(current: number, target: number): number {
  if (!target || target <= 0) return 0
  return Math.max(0, Math.min(100, Math.round((current / target) * 100)))
}

export function DefiCard({
  type,
  title,
  description,
  xpReward,
  coinReward,
  status,
  progress,
  iconName,
  href,
  imageUrl,
  ctaLabel,
  ctaHref,
  daysLeft,
  className,
}: DefiCardProps) {
  const tokens = VARIANT_TOKENS[type]
  const Icon = resolveIcon(iconName, tokens.defaultIcon)

  const isCompleted = status === "completed"
  const isExpired = status === "expired"
  const isLocked = status === "locked"
  const isInteractive = !isLocked && !isExpired

  const safeXp = Math.max(0, xpReward || 0)
  const safeCoins = Math.max(0, coinReward || 0)

  const showProgress =
    !!progress &&
    typeof progress.current === "number" &&
    typeof progress.target === "number"
  const progressPct = showProgress
    ? pct(progress!.current, progress!.target)
    : 0

  const showDaysLeft =
    typeof daysLeft === "number" && daysLeft >= 0 && !isCompleted && !isExpired
  const daysLeftLabel =
    daysLeft === 0
      ? "Dernier jour"
      : daysLeft === 1
        ? "1 jour"
        : `${daysLeft} jours`

  const cardHref = isInteractive ? href : undefined
  const effectiveCtaHref = ctaHref ?? href
  const showCta = !!ctaLabel && !!effectiveCtaHref && isInteractive

  // Status badge content
  const statusBadge = (() => {
    if (isCompleted) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-emerald-300 ring-1 ring-emerald-400/30">
          <CheckCircle2 className="h-3 w-3" aria-hidden />
          Terminé
        </span>
      )
    }
    if (isLocked) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-zinc-700/40 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-zinc-400 ring-1 ring-zinc-500/30">
          <Lock className="h-3 w-3" aria-hidden />
          Verrouillé
        </span>
      )
    }
    if (isExpired) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-zinc-800/60 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-zinc-500 ring-1 ring-zinc-600/30">
          Expiré
        </span>
      )
    }
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ring-1",
          tokens.accentBg,
          tokens.accentText,
          tokens.accentRing,
        )}
      >
        <span
          className={cn("h-1.5 w-1.5 rounded-full animate-pulse", tokens.accentDot)}
          aria-hidden
        />
        Actif
      </span>
    )
  })()

  // Card body — shared between Link and div renderings.
  const body = (
    <>
      {/* Decorative glow */}
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full blur-3xl opacity-60 transition-opacity duration-300",
          tokens.glow,
          (isLocked || isExpired) && "opacity-10",
          isInteractive && "group-hover:opacity-90",
        )}
      />

      {/* Top image (physical variant typically) */}
      {imageUrl ? (
        <div className="relative overflow-hidden rounded-t-3xl">
          <div className="relative h-36 w-full bg-zinc-800/60">
            <Image
              src={imageUrl}
              alt=""
              fill
              sizes="(max-width: 640px) 100vw, 400px"
              className={cn(
                "object-cover transition-transform duration-500",
                isInteractive && "group-hover:scale-105",
                (isLocked || isExpired) && "opacity-40 grayscale",
              )}
            />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-zinc-950/80" />
          </div>
        </div>
      ) : null}

      <div className={cn("relative", imageUrl ? "px-5 pb-5 pt-4" : "p-5 sm:p-6")}>
        {/* Top row: variant tag + status + rewards */}
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <div
              className={cn(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                tokens.accentBg,
              )}
            >
              <Icon className={cn("h-4 w-4", tokens.accentText)} aria-hidden />
            </div>
            <div className="flex flex-col gap-0.5">
              <span
                className={cn(
                  "text-[10px] font-black uppercase tracking-[0.18em]",
                  tokens.accentText,
                )}
              >
                {tokens.label}
              </span>
              {statusBadge}
            </div>
          </div>

          {/* Reward chips */}
          <div className="flex shrink-0 flex-col items-end gap-1">
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-black tabular-nums text-amber-300 ring-1 ring-amber-400/30">
              <Zap className="h-3 w-3" aria-hidden />+{safeXp.toLocaleString()} XP
            </span>
            {safeCoins > 0 ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-cyan-500/15 px-2 py-0.5 text-[11px] font-black tabular-nums text-cyan-300 ring-1 ring-cyan-400/30">
                <Coins className="h-3 w-3" aria-hidden />+{safeCoins.toLocaleString()}
              </span>
            ) : null}
          </div>
        </div>

        {/* Title */}
        <h3
          className={cn(
            "text-base font-black leading-snug text-white sm:text-lg",
            (isLocked || isExpired) && "text-zinc-400",
          )}
        >
          {title}
        </h3>

        {/* Description */}
        {description ? (
          <p
            className={cn(
              "mt-1 line-clamp-2 text-sm leading-snug text-zinc-400",
              (isLocked || isExpired) && "text-zinc-500",
            )}
          >
            {description}
          </p>
        ) : null}

        {/* Progress bar */}
        {showProgress ? (
          <div className="mt-4">
            <div className="mb-1 flex items-center justify-between text-[10px]">
              <span className="font-bold uppercase tracking-wider text-zinc-500">
                Progression
              </span>
              <span className="font-black tabular-nums text-zinc-300">
                {progress!.current.toLocaleString()} /{" "}
                {progress!.target.toLocaleString()}
                <span className="ml-1 text-zinc-500">({progressPct}%)</span>
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
              <div
                className={cn(
                  "h-full rounded-full bg-gradient-to-r transition-[width] duration-500 ease-out",
                  tokens.progressFrom,
                  tokens.progressTo,
                )}
                style={{ width: `${progressPct}%` }}
                aria-hidden
              />
            </div>
          </div>
        ) : null}

        {/* Footer: days-left + CTA */}
        {showDaysLeft || showCta ? (
          <div className="mt-4 flex items-center justify-between gap-3">
            {showDaysLeft ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-zinc-400">
                <Clock className="h-3 w-3" aria-hidden />
                {daysLeftLabel}
              </span>
            ) : (
              <span aria-hidden />
            )}

            {showCta ? (
              <Link
                href={effectiveCtaHref!}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-[11px] font-black text-black",
                  "transition-colors hover:bg-white/90",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60",
                )}
              >
                {ctaLabel}
                <ArrowRight className="h-3 w-3" aria-hidden />
              </Link>
            ) : null}
          </div>
        ) : null}
      </div>
    </>
  )

  const baseClasses = cn(
    "group relative block overflow-hidden rounded-3xl border backdrop-blur-md transition-all duration-300",
    tokens.surface,
    "border-white/10",
    isInteractive &&
      "hover:-translate-y-0.5 hover:border-white/20 hover:shadow-2xl hover:shadow-black/40",
    isInteractive &&
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950",
    (isLocked || isExpired) && "opacity-70 saturate-50",
    className,
  )

  const ariaLabel = `${tokens.label} — ${title}${
    isLocked
      ? " (verrouillé)"
      : isExpired
        ? " (expiré)"
        : isCompleted
          ? " (terminé)"
          : ""
  }`

  if (cardHref) {
    return (
      <Link href={cardHref} aria-label={ariaLabel} className={baseClasses}>
        {body}
      </Link>
    )
  }

  return (
    <div aria-label={ariaLabel} className={baseClasses}>
      {body}
    </div>
  )
}

export default DefiCard
