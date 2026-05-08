"use client"

/**
 * <Celebrate> — Wave 3 / TICKET-022 + TICKET-030
 * ================================================
 *
 * Unified celebration primitive for the 6 success moments in the teen flow:
 * chore approved, savings goal reached, level up, food delivered,
 * mentor session confirmed, friend request accepted.
 *
 * API
 * ----
 *   <Celebrate
 *     trigger={booleanThatFlipsTrueOnce}
 *     variant="confetti" | "sparkles" | "levelup"
 *     onComplete={() => setTrigger(false)}
 *   />
 *
 * Behaviour
 * ----------
 * - `trigger` is edge-triggered: when it goes false → true the effect plays
 *   exactly once. Caller flips it back via onComplete.
 * - Honours `prefers-reduced-motion`: no particles, replaced by a single
 *   check-icon scale-in (~600ms) that still acknowledges success.
 * - `variant` selects palette + density; "levelup" gets the heaviest,
 *   "confetti" classic, "sparkles" lightest.
 *
 * Implementation notes
 * --------------------
 * - Uses `canvas-confetti` (already in deps) — the project's existing
 *   ConfettiBurst / Confetti components do the same and are kept for
 *   backward compatibility, but Celebrate is the canonical surface for the
 *   six wired call-sites in this ticket.
 * - Renders nothing on the SSR pass; portals into the body via fixed div
 *   only when the reduced-motion check icon is on screen.
 */

import * as React from "react"
import canvasConfetti from "canvas-confetti"
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

export type CelebrateVariant = "confetti" | "sparkles" | "levelup"

export interface CelebrateProps {
  /**
   * Edge-triggered: a `false → true` transition fires the effect once.
   * Flip back to `false` from `onComplete` to allow re-firing.
   */
  trigger: boolean
  variant?: CelebrateVariant
  /** Called after the visible effect ends (~duration of the variant). */
  onComplete?: () => void
  /** Optional extra class on the reduced-motion check overlay. */
  className?: string
}

const VARIANT_CONFIG: Record<
  CelebrateVariant,
  {
    particleCount: number
    spread: number
    startVelocity: number
    scalar: number
    gravity: number
    ticks: number
    colors: string[]
    duration: number
  }
> = {
  confetti: {
    particleCount: 90,
    spread: 70,
    startVelocity: 35,
    scalar: 1,
    gravity: 0.9,
    ticks: 200,
    colors: ["#8b5cf6", "#f43f5e", "#10b981", "#fbbf24", "#0ea5e9", "#ec4899"],
    duration: 1800,
  },
  sparkles: {
    particleCount: 40,
    spread: 55,
    startVelocity: 25,
    scalar: 0.8,
    gravity: 0.6,
    ticks: 150,
    colors: ["#fde047", "#fbbf24", "#ffffff", "#a78bfa"],
    duration: 1200,
  },
  levelup: {
    particleCount: 160,
    spread: 110,
    startVelocity: 50,
    scalar: 1.2,
    gravity: 0.8,
    ticks: 260,
    colors: ["#fbbf24", "#f59e0b", "#fde047", "#a78bfa", "#ffffff"],
    duration: 2400,
  },
}

function usePrefersReducedMotion(): boolean {
  const [prefers, setPrefers] = React.useState(false)
  React.useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
    setPrefers(mq.matches)
    const onChange = (e: MediaQueryListEvent) => setPrefers(e.matches)
    // Safari < 14 fallback
    if (typeof mq.addEventListener === "function") {
      mq.addEventListener("change", onChange)
      return () => mq.removeEventListener("change", onChange)
    }
    mq.addListener(onChange)
    return () => mq.removeListener(onChange)
  }, [])
  return prefers
}

export function Celebrate({
  trigger,
  variant = "confetti",
  onComplete,
  className,
}: CelebrateProps) {
  const prefersReducedMotion = usePrefersReducedMotion()
  const [showCheck, setShowCheck] = React.useState(false)
  const lastTriggerRef = React.useRef<boolean>(false)
  const onCompleteRef = React.useRef(onComplete)

  // Keep latest onComplete without re-firing the effect on each render.
  React.useEffect(() => {
    onCompleteRef.current = onComplete
  }, [onComplete])

  React.useEffect(() => {
    // Edge-trigger: only fire on a false → true transition.
    const prev = lastTriggerRef.current
    lastTriggerRef.current = trigger
    if (!trigger || prev) return
    if (typeof window === "undefined") return

    const cfg = VARIANT_CONFIG[variant]

    if (prefersReducedMotion) {
      // Reduced-motion path: silent check-icon scale-in (~600ms) — no
      // particles, no sound trigger from this primitive.
      setShowCheck(true)
      const t = window.setTimeout(() => {
        setShowCheck(false)
        onCompleteRef.current?.()
      }, 700)
      return () => window.clearTimeout(t)
    }

    // Standard path: canvas-confetti burst from a slightly-above-center
    // origin so particles arc visibly inside the viewport.
    canvasConfetti({
      particleCount: cfg.particleCount,
      spread: cfg.spread,
      startVelocity: cfg.startVelocity,
      scalar: cfg.scalar,
      gravity: cfg.gravity,
      ticks: cfg.ticks,
      colors: cfg.colors,
      origin: { x: 0.5, y: 0.4 },
      zIndex: 100,
      disableForReducedMotion: true,
    })

    // levelup gets a second symmetric burst from the corners for extra punch.
    if (variant === "levelup") {
      window.setTimeout(() => {
        canvasConfetti({
          particleCount: 60,
          angle: 60,
          spread: 55,
          origin: { x: 0, y: 0.7 },
          colors: cfg.colors,
          zIndex: 100,
          disableForReducedMotion: true,
        })
        canvasConfetti({
          particleCount: 60,
          angle: 120,
          spread: 55,
          origin: { x: 1, y: 0.7 },
          colors: cfg.colors,
          zIndex: 100,
          disableForReducedMotion: true,
        })
      }, 250)
    }

    const t = window.setTimeout(() => {
      onCompleteRef.current?.()
    }, cfg.duration)
    return () => window.clearTimeout(t)
  }, [trigger, variant, prefersReducedMotion])

  // Reduced-motion check overlay. In the standard path we render nothing
  // (canvas-confetti paints into its own canvas and cleans itself up).
  if (!showCheck) return null

  return (
    <div
      aria-hidden="true"
      className={cn(
        "fixed inset-0 z-[120] flex items-center justify-center pointer-events-none",
        className,
      )}
    >
      <span
        className={cn(
          "flex items-center justify-center rounded-full bg-emerald-500/95 text-white shadow-2xl",
          "h-20 w-20 motion-safe:animate-in motion-safe:zoom-in-50 motion-safe:fade-in-0",
        )}
        style={{
          // Inline animation keeps this independent of the project's tw config:
          // a single 600ms scale-in/out so even users on systems where the
          // reduced-motion path is taken get a beat of confirmation.
          animation: "celebrateCheckIn 600ms ease-out forwards",
        }}
      >
        <Check className="h-10 w-10" strokeWidth={3} />
      </span>
      <style>{`
        @keyframes celebrateCheckIn {
          0%   { transform: scale(0.4); opacity: 0; }
          40%  { transform: scale(1.08); opacity: 1; }
          70%  { transform: scale(1); opacity: 1; }
          100% { transform: scale(1); opacity: 0; }
        }
      `}</style>
    </div>
  )
}

export default Celebrate
