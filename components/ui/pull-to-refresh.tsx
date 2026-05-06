"use client"

import * as React from "react"
import { Loader2, ArrowDown } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * PullToRefresh — Mobile-first pull-to-refresh wrapper.
 *
 * - Listens to touch events on its scroll container.
 * - Activates only when the user pulls *down* while scrollTop is at 0.
 * - Fires `onRefresh` once the pull crosses `threshold`.
 * - Shows a soft spinner / arrow indicator while pulling and refreshing.
 * - Honors `prefers-reduced-motion` (no transform animation, just a state swap).
 *
 * Usage:
 *   <PullToRefresh onRefresh={async () => { await refetch() }}>
 *     <YourScrollableContent />
 *   </PullToRefresh>
 */
export interface PullToRefreshProps {
  onRefresh: () => Promise<void> | void
  /** Pull distance (in px) before triggering refresh. Default 80. */
  threshold?: number
  /** Maximum visible pull distance (in px). Default 120. */
  maxPull?: number
  /** Extra className on the outer wrapper. */
  className?: string
  /** Disable the gesture entirely (useful on desktop). */
  disabled?: boolean
  children: React.ReactNode
}

export function PullToRefresh({
  onRefresh,
  threshold = 80,
  maxPull = 120,
  className,
  disabled = false,
  children,
}: PullToRefreshProps) {
  const containerRef = React.useRef<HTMLDivElement | null>(null)
  const startYRef = React.useRef<number | null>(null)
  const [pullDistance, setPullDistance] = React.useState(0)
  const [isRefreshing, setIsRefreshing] = React.useState(false)
  const reducedMotionRef = React.useRef(false)

  React.useEffect(() => {
    if (typeof window === "undefined") return
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
    reducedMotionRef.current = mq.matches
    const handler = (e: MediaQueryListEvent) => {
      reducedMotionRef.current = e.matches
    }
    mq.addEventListener?.("change", handler)
    return () => mq.removeEventListener?.("change", handler)
  }, [])

  const handleTouchStart = React.useCallback(
    (e: React.TouchEvent<HTMLDivElement>) => {
      if (disabled || isRefreshing) return
      // Only engage when scrolled to top.
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
      // Resistance curve: feels rubbery past the threshold.
      const eased = Math.min(maxPull, delta * 0.55)
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
        await onRefresh()
      } finally {
        setIsRefreshing(false)
        setPullDistance(0)
      }
    } else {
      setPullDistance(0)
    }
  }, [disabled, isRefreshing, onRefresh, pullDistance, threshold])

  const indicatorOpacity = Math.min(1, pullDistance / threshold)
  const willTrigger = pullDistance >= threshold
  const reduced = reducedMotionRef.current

  return (
    <div
      ref={containerRef}
      className={cn("relative", className)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    >
      {/* Indicator */}
      <div
        aria-hidden={!isRefreshing && pullDistance === 0}
        className={cn(
          "pointer-events-none absolute left-0 right-0 top-0 z-30 flex justify-center",
          "transition-opacity",
          reduced ? "duration-0" : "duration-150",
        )}
        style={{
          opacity: isRefreshing ? 1 : indicatorOpacity,
          transform: reduced
            ? "none"
            : `translateY(${Math.max(0, pullDistance - 32)}px)`,
        }}
      >
        <div
          className={cn(
            "mt-2 flex h-10 w-10 items-center justify-center rounded-full border border-white/10",
            "bg-zinc-900/85 shadow-lg backdrop-blur-md text-white",
          )}
          role="status"
          aria-live="polite"
          aria-label={isRefreshing ? "Actualisation en cours" : "Tirer pour actualiser"}
        >
          {isRefreshing ? (
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
          ) : (
            <ArrowDown
              className={cn(
                "h-5 w-5 transition-transform",
                reduced ? "duration-0" : "duration-200",
                willTrigger ? "rotate-180" : "rotate-0",
              )}
              aria-hidden="true"
            />
          )}
        </div>
      </div>

      {/* Content (translated only if motion is OK) */}
      <div
        style={{
          transform: reduced ? "none" : `translateY(${pullDistance}px)`,
          transition: pullDistance === 0 && !isRefreshing ? "transform 200ms ease" : "none",
          willChange: reduced ? "auto" : "transform",
        }}
      >
        {children}
      </div>
    </div>
  )
}

export default PullToRefresh
