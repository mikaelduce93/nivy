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
  /**
   * Optional `view-transition-name` morph id (TICKET-024). When set the
   * whole card participates in the native View Transitions morph to its
   * detail page. The matching name must be applied to the detail-page
   * hero — see `app/teen/quests/[id]/quest-detail-client.tsx`. Names must
   * be unique within a single document, so callers should derive them
   * from the row id (e.g. `vt-quest-${quest.id}`).
   */
  morphId?: string
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
    accentText: "text-ink",
    accentDot: "bg-gold",
    accentBg: "bg-gold/15",
    accentRing: "ring-gold/40",
    surface: "bg-gold/5",
    progressFrom: "from-gold",
    progressTo: "to-gold",
    glow: "bg-gold/30",
    defaultIcon: "Flame",
  },
  weekly: {
    label: "Weekly",
    accentText: "text-ink",
    accentDot: "bg-teal",
    accentBg: "bg-teal/15",
    accentRing: "ring-teal/40",
    surface: "bg-teal/5",
    progressFrom: "from-teal",
    progressTo: "to-teal",
    glow: "bg-teal/30",
    defaultIcon: "Calendar",
  },
  monthly: {
    label: "Monthly",
    accentText: "text-ink",
    accentDot: "bg-pink",
    accentBg: "bg-pink/15",
    accentRing: "ring-pink/40",
    surface: "bg-pink/5",
    progressFrom: "from-pink",
    progressTo: "to-pink",
    glow: "bg-pink/30",
    defaultIcon: "Trophy",
  },
  seasonal: {
    label: "Seasonal",
    accentText: "text-ink",
    accentDot: "bg-coral",
    accentBg: "bg-coral/15",
    accentRing: "ring-coral/40",
    surface: "bg-coral/5",
    progressFrom: "from-coral",
    progressTo: "to-coral",
    glow: "bg-coral/30",
    defaultIcon: "Sparkles",
  },
  physical: {
    label: "Physique",
    accentText: "text-ink",
    accentDot: "bg-lime",
    accentBg: "bg-lime/15",
    accentRing: "ring-lime/40",
    surface: "bg-lime/5",
    progressFrom: "from-lime",
    progressTo: "to-lime",
    glow: "bg-lime/30",
    defaultIcon: "Dumbbell",
  },
  friend: {
    label: "Entre amis",
    accentText: "text-ink",
    accentDot: "bg-pink",
    accentBg: "bg-pink/15",
    accentRing: "ring-pink/40",
    surface: "bg-pink/5",
    progressFrom: "from-pink",
    progressTo: "to-pink",
    glow: "bg-pink/30",
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
  morphId,
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
        <span className="inline-flex items-center gap-1 rounded-full border border-ink bg-success-soft px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-ink">
          <CheckCircle2 className="h-3 w-3" aria-hidden />
          Terminé
        </span>
      )
    }
    if (isLocked) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-line bg-muted px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-mute">
          <Lock className="h-3 w-3" aria-hidden />
          Verrouillé
        </span>
      )
    }
    if (isExpired) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-line bg-muted px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-mute">
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
        <div className="relative overflow-hidden rounded-t-2xl">
          <div className="relative h-36 w-full bg-paper-2">
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
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-ink/50" />
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

          {/* Reward chips — XP chip hidden when there's no reward (e.g. a
              no-stake friend défi after #206: bragging-rights, no XP transfer). */}
          <div className="flex shrink-0 flex-col items-end gap-1">
            {safeXp > 0 ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-ink bg-gold/15 px-2 py-0.5 text-[11px] font-black tabular-nums text-ink">
                <Zap className="h-3 w-3" aria-hidden />+{safeXp.toLocaleString()} XP
              </span>
            ) : null}
            {safeCoins > 0 ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-ink bg-coral/15 px-2 py-0.5 text-[11px] font-black tabular-nums text-ink">
                <Coins className="h-3 w-3" aria-hidden />+{safeCoins.toLocaleString()}
              </span>
            ) : null}
          </div>
        </div>

        {/* Title */}
        <h3
          className={cn(
            "text-base font-black leading-snug text-ink sm:text-lg",
            (isLocked || isExpired) && "text-mute",
          )}
        >
          {title}
        </h3>

        {/* Description */}
        {description ? (
          <p
            className={cn(
              "mt-1 line-clamp-2 text-sm leading-snug text-mute",
              (isLocked || isExpired) && "text-mute",
            )}
          >
            {description}
          </p>
        ) : null}

        {/* Progress bar */}
        {showProgress ? (
          <div className="mt-4">
            <div className="mb-1 flex items-center justify-between text-[10px]">
              <span className="font-bold uppercase tracking-wider text-mute">
                Progression
              </span>
              <span className="font-black tabular-nums text-ink">
                {progress!.current.toLocaleString()} /{" "}
                {progress!.target.toLocaleString()}
                <span className="ml-1 text-mute">({progressPct}%)</span>
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-paper-2">
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
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-mute">
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
                  "inline-flex items-center gap-1 rounded-full border-2 border-ink bg-ink px-3 py-1.5 text-[11px] font-black text-paper",
                  "transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-stkr-pink",
                  "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[color:var(--focus-ring-color,var(--ring))]",
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
    "group relative block overflow-hidden rounded-2xl border-2 transition-all duration-200",
    "bg-card border-ink shadow-stkr-md",
    isInteractive &&
      "hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-stkr",
    isInteractive &&
      "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[color:var(--focus-ring-color,var(--ring))] focus-visible:ring-offset-2",
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

  // TICKET-024 — when a morphId is supplied we pin the View Transitions
  // name as an inline style. Inline keeps the value out of the Tailwind JIT
  // (the id is per-instance and unique per row) and means the browser is the
  // only consumer. Anchors that share the same name with an element on the
  // destination page get auto-morphed by the engine.
  const morphStyle = morphId
    ? ({ viewTransitionName: morphId } as React.CSSProperties)
    : undefined

  if (cardHref) {
    return (
      <Link href={cardHref} aria-label={ariaLabel} className={baseClasses} style={morphStyle}>
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
