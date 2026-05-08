"use client"

/**
 * TICKET-037 (Wave 2 / W2-A15) — PullToRefresh primitive for teen list surfaces.
 *
 * What this gives us
 * ------------------
 * A mobile-first, touch-only pull-to-refresh wrapper that integrates with native
 * overscroll. Differences vs. the older `components/ui/pull-to-refresh.tsx`:
 *
 *   1. Touch-only by design. We mount the touch handlers ONLY on devices that
 *      report `(hover: none) and (pointer: coarse)` — i.e. real touch screens.
 *      Mouse pulls / trackpad overscroll are deliberately discouraged: desktop
 *      users have a Refresh button and Cmd+R; pull-to-refresh on desktop is
 *      almost always an accident.
 *   2. Spring-loaded indicator. The arrow rotates progressively as the user
 *      pulls. Once `threshold` is crossed it snaps via a CSS spring transition
 *      (cubic-bezier with overshoot). During `onRefresh()` execution the arrow
 *      is replaced by a spinner.
 *   3. `prefers-reduced-motion`: indicator snaps without a spring; content does
 *      not translate. This mirrors the pattern from W1-A5
 *      (`components/ui/motion.tsx`) — strip animation-driving props and render
 *      the final state immediately.
 *   4. Defaults to `router.refresh()`. The 7 teen list surfaces are server
 *      components, so a Next.js refresh is the right primitive — the parent
 *      RSC re-fetches and streams updated children. Callers can pass a custom
 *      `onRefresh` if they need to invalidate React Query / SWR caches first.
 *
 * Usage
 * -----
 *   <PullToRefresh>
 *     <ServerListContent />
 *   </PullToRefresh>
 *
 *   // Or with a custom refetch:
 *   <PullToRefresh onRefresh={async () => { await mutate(); router.refresh() }}>
 *     ...
 *   </PullToRefresh>
 */

import * as React from "react"
import { useRouter } from "next/navigation"
import { ArrowDown, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

export interface PullToRefreshProps {
  /** Called when the user crosses the pull threshold. Defaults to `router.refresh()`. */
  onRefresh?: () => Promise<void> | void
  /** Pull distance (in px) before refresh fires. Default 72. */
  threshold?: number
  /** Maximum visible pull distance (in px). Default 120. */
  maxPull?: number
  /** Extra className on the outer wrapper. */
  className?: string
  /** Disable entirely (e.g. when content is loading). */
  disabled?: boolean
  children: React.ReactNode
}

export function PullToRefresh({
  onRefresh,
  threshold = 72,
  maxPull = 120,
  className,
  disabled = false,
  children,
}: PullToRefreshProps) {
  const router = useRouter()
  const startYRef = React.useRef<number | null>(null)
  const [pullDistance, setPullDistance] = React.useState(0)
  const [isRefreshing, setIsRefreshing] = React.useState(false)
  // Detect touch device + reduced-motion at mount; both are stable enough to
  // keep in refs (no re-render cost on listener fire).
  const [isTouchDevice, setIsTouchDevice] = React.useState(false)
  const reducedMotionRef = React.useRef(false)

  React.useEffect(() => {
    if (typeof window === "undefined") return

    // Touch-device gate. `(hover: none) and (pointer: coarse)` is the well-known
    // CSS pattern for "real" touch screens — desktops with a touchscreen but a
    // mouse still report `hover: hover`, which is what we want.
    const touchMq = window.matchMedia("(hover: none) and (pointer: coarse)")
    setIsTouchDevice(touchMq.matches)
    const onTouchChange = (e: MediaQueryListEvent) => setIsTouchDevice(e.matches)
    touchMq.addEventListener?.("change", onTouchChange)

    // Reduced-motion gate.
    const motionMq = window.matchMedia("(prefers-reduced-motion: reduce)")
    reducedMotionRef.current = motionMq.matches
    const onMotionChange = (e: MediaQueryListEvent) => {
      reducedMotionRef.current = e.matches
    }
    motionMq.addEventListener?.("change", onMotionChange)

    return () => {
      touchMq.removeEventListener?.("change", onTouchChange)
      motionMq.removeEventListener?.("change", onMotionChange)
    }
  }, [])

  const trigger = React.useCallback(async () => {
    if (onRefresh) {
      await onRefresh()
    } else {
      // Server-component pages: re-render the RSC tree.
      router.refresh()
      // Give the router a tick so the indicator doesn't disappear before any
      // streaming UI starts updating. 250 ms feels right on real devices.
      await new Promise((r) => setTimeout(r, 250))
    }
  }, [onRefresh, router])

  const handleTouchStart = React.useCallback(
    (e: React.TouchEvent<HTMLDivElement>) => {
      if (disabled || isRefreshing) return
      // Only engage at the very top of the document. We deliberately read both
      // `scrollingElement` (which Safari sometimes leaves as `null`) and
      // `documentElement` to be safe.
      const scrollTop =
        document.scrollingElement?.scrollTop ??
        document.documentElement.scrollTop ??
        0
      if (scrollTop > 0) return
      startYRef.current = e.touches[0]?.clientY ?? null
    },
    [disabled, isRefreshing],
  )

  const handleTouchMove = React.useCallback(
    (e: React.TouchEvent<HTMLDivElement>) => {
      if (disabled || isRefreshing) return
      if (startYRef.current == null) return
      const currentY = e.touches[0]?.clientY ?? startYRef.current
      const delta = currentY - startYRef.current
      if (delta <= 0) {
        setPullDistance(0)
        return
      }
      // Rubber-band resistance — feels natural and keeps the indicator from
      // racing past `maxPull` on flick gestures.
      const eased = Math.min(maxPull, delta * 0.5)
      setPullDistance(eased)
    },
    [disabled, isRefreshing, maxPull],
  )

  const handleTouchEnd = React.useCallback(async () => {
    if (disabled) return
    const distance = pullDistance
    startYRef.current = null
    if (distance >= threshold && !isRefreshing) {
      setIsRefreshing(true)
      try {
        await trigger()
      } finally {
        setIsRefreshing(false)
        setPullDistance(0)
      }
    } else {
      setPullDistance(0)
    }
  }, [disabled, isRefreshing, pullDistance, threshold, trigger])

  // Don't bind handlers on non-touch devices: mouse pulls and trackpad
  // overscroll should be discouraged per ticket spec, and stripping the
  // listeners is cheaper than no-oping inside them.
  const touchHandlers = isTouchDevice
    ? {
        onTouchStart: handleTouchStart,
        onTouchMove: handleTouchMove,
        onTouchEnd: handleTouchEnd,
        onTouchCancel: handleTouchEnd,
      }
    : {}

  const indicatorOpacity = Math.min(1, pullDistance / threshold)
  const willTrigger = pullDistance >= threshold
  const reduced = reducedMotionRef.current
  // Spring snap once the threshold is crossed; a gentler ease-out below it.
  const indicatorSpring = reduced
    ? "none"
    : willTrigger
      ? "transform 220ms cubic-bezier(0.34, 1.56, 0.64, 1)" // overshoot
      : "transform 80ms ease-out"

  return (
    <div className={cn("relative", className)} {...touchHandlers}>
      {/* Indicator ------------------------------------------------------- */}
      <div
        aria-hidden={!isRefreshing && pullDistance === 0}
        className={cn(
          "pointer-events-none absolute left-0 right-0 top-0 z-30 flex justify-center",
          reduced ? "transition-none" : "transition-opacity duration-150",
        )}
        style={{
          opacity: isRefreshing ? 1 : indicatorOpacity,
          transform: reduced
            ? "none"
            : `translateY(${Math.max(0, pullDistance - 24)}px)`,
        }}
      >
        <div
          className={cn(
            "mt-2 flex h-10 w-10 items-center justify-center rounded-full",
            "border border-white/10 bg-zinc-900/85 text-white shadow-lg backdrop-blur-md",
          )}
          role="status"
          aria-live="polite"
          aria-label={isRefreshing ? "Actualisation en cours" : "Tirer pour actualiser"}
        >
          {isRefreshing ? (
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
          ) : (
            <ArrowDown
              className="h-5 w-5"
              aria-hidden="true"
              style={{
                transform: `rotate(${willTrigger ? 180 : Math.min(180, indicatorOpacity * 180)}deg)`,
                transition: indicatorSpring,
              }}
            />
          )}
        </div>
      </div>

      {/* Content --------------------------------------------------------- *
       *  We translate the content downward to mimic native overscroll. We  *
       *  skip this entirely under reduced-motion to avoid layout jitter.   *
       * ----------------------------------------------------------------- */}
      <div
        style={{
          transform: reduced ? "none" : `translateY(${pullDistance}px)`,
          transition:
            pullDistance === 0 && !isRefreshing && !reduced
              ? "transform 220ms cubic-bezier(0.34, 1.56, 0.64, 1)"
              : "none",
          willChange: reduced ? "auto" : "transform",
        }}
      >
        {children}
      </div>
    </div>
  )
}

export default PullToRefresh
