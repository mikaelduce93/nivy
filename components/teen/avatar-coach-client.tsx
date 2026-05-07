"use client"

/**
 * AvatarCoach v1 — client renderer.
 *
 * Pure visual + tiny dismiss interaction. No data fetching here.
 * Animations: framer-motion is already a hard dep across teen/dashboard,
 * but we keep this component lightweight (no framer) to avoid the bundle
 * cost on the dashboard root. CSS transitions only.
 */

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"

interface AvatarCoachClientProps {
  coachName: string
  teenFirstName: string
  message: string
  mood: string
  color: string
  skin: string
  cta: { label: string; href: string }
  messageId: string | null
  compact?: boolean
  className?: string
}

const MOOD_EMOJI: Record<string, string> = {
  happy: "😄",
  celebrating: "🎉",
  sad: "🥺",
  tired: "😴",
  focused: "🎯",
  neutral: "🐼",
}

export function AvatarCoachClient({
  coachName,
  message,
  mood,
  color,
  cta,
  messageId,
  compact = false,
  className,
}: AvatarCoachClientProps) {
  const router = useRouter()
  const [dismissing, setDismissing] = React.useState(false)
  const [dismissed, setDismissed] = React.useState(false)

  const moodEmoji = MOOD_EMOJI[mood] || MOOD_EMOJI.neutral

  // Build a soft gradient from the avatar color so the surface reflects mood.
  const gradient = React.useMemo(
    () =>
      `linear-gradient(135deg, ${withAlpha(color, 0.18)} 0%, ${withAlpha(
        color,
        0.04,
      )} 60%, transparent 100%)`,
    [color],
  )

  const handleDismiss = React.useCallback(async () => {
    if (!messageId || dismissing) return
    setDismissing(true)
    try {
      await fetch("/api/teen/avatar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "dismiss", messageId }),
      })
      setDismissed(true)
      // Refresh server data so the next message (if any) shows up.
      router.refresh()
    } catch {
      // Best-effort. Keep the UI usable on failure.
      setDismissing(false)
    }
  }, [messageId, dismissing, router])

  if (dismissed) return null

  return (
    <section
      aria-label={`Message de ${coachName}`}
      className={cn(
        "relative w-full overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02] backdrop-blur-md",
        "transition-all duration-300",
        compact ? "p-3 sm:p-4" : "p-4 sm:p-5 md:p-6",
        className,
      )}
      style={{ backgroundImage: gradient }}
    >
      {/* Decorative glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full blur-3xl opacity-40"
        style={{ background: color }}
      />

      <div className="relative flex items-start gap-3 sm:gap-4">
        {/* Avatar disc */}
        <div
          className={cn(
            "flex shrink-0 items-center justify-center rounded-full ring-2 ring-white/15 shadow-lg",
            compact ? "h-12 w-12 text-2xl" : "h-14 w-14 sm:h-16 sm:w-16 text-3xl sm:text-4xl",
          )}
          style={{
            background: `radial-gradient(circle at 30% 30%, ${withAlpha(color, 0.9)} 0%, ${withAlpha(color, 0.5)} 100%)`,
          }}
        >
          <span aria-hidden>{moodEmoji}</span>
        </div>

        {/* Message + CTA */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] sm:text-xs font-black uppercase tracking-[0.2em] text-white/60">
              {coachName}
            </span>
            <span
              className="inline-block h-1.5 w-1.5 rounded-full"
              style={{ background: color }}
              aria-hidden
            />
            <span className="text-[10px] sm:text-xs font-medium text-white/40 capitalize">
              {mood}
            </span>
          </div>

          <p
            className={cn(
              "mt-1 text-white",
              compact ? "text-sm leading-snug" : "text-base sm:text-lg leading-snug font-medium",
            )}
          >
            {message}
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Link
              href={cta.href}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs sm:text-sm font-bold",
                "bg-white text-black hover:bg-white/90 transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60",
              )}
            >
              {cta.label}
              <span aria-hidden>→</span>
            </Link>

            {messageId ? (
              <button
                type="button"
                onClick={handleDismiss}
                disabled={dismissing}
                className={cn(
                  "rounded-full px-3 py-2 text-xs font-semibold",
                  "text-white/60 hover:text-white hover:bg-white/5 transition-colors",
                  "disabled:opacity-50 disabled:cursor-not-allowed",
                )}
              >
                {dismissing ? "..." : "Plus tard"}
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  )
}

/**
 * Apply alpha to a hex/rgb/named color. Falls back to the original color
 * if it can't be parsed (CSS will still render).
 */
function withAlpha(color: string, alpha: number): string {
  const a = Math.max(0, Math.min(1, alpha))
  if (color.startsWith("#")) {
    const hex = color.slice(1)
    const full = hex.length === 3 ? hex.split("").map((c) => c + c).join("") : hex
    if (full.length === 6) {
      const r = parseInt(full.slice(0, 2), 16)
      const g = parseInt(full.slice(2, 4), 16)
      const b = parseInt(full.slice(4, 6), 16)
      return `rgba(${r}, ${g}, ${b}, ${a})`
    }
  }
  if (color.startsWith("rgb(")) {
    return color.replace("rgb(", "rgba(").replace(")", `, ${a})`)
  }
  // Named or unsupported — let CSS handle it; alpha can't be applied.
  return color
}
