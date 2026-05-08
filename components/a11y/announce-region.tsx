"use client"

/**
 * <AnnounceRegion> + useAnnounce()
 * ================================
 *
 * Wave 3 / TICKET-050 — single ARIA live region for celebration moments.
 *
 * Why this exists
 * ---------------
 * The 6 success moments in the teen flow (chore approved, savings goal
 * reached, level up, food delivered, mentor session confirmed, friend
 * request accepted) currently fire confetti + sound. Screen-reader users
 * get nothing. This component mounts a single
 * `<div aria-live="polite" aria-atomic="true" className="sr-only" />`
 * once near the root of the layout and exposes a context-based hook so any
 * client component can call `announce("Mission validée. Bravo!")`.
 *
 * Politeness level
 * ----------------
 * `aria-live="polite"` (NOT "assertive"). Celebrations are positive
 * acknowledgements, not interruptions — they should wait for any in-flight
 * announcement to finish before being read.
 *
 * Re-announcement
 * ---------------
 * The same message can fire twice in a row (e.g. two chores approved back
 * to back). To force the AT to read it again we clear the live region
 * 1500ms after each write — a subsequent identical write then registers
 * as a content change and is announced.
 *
 * SSR
 * ---
 * The provider is safe to render server-side: the inner `<div>` ships in
 * the HTML so AT can pick it up immediately on hydration. State only
 * mutates after a client effect.
 */

import * as React from "react"

interface AnnounceContextValue {
  /** Announce a message to assistive technology via the polite live region. */
  announce: (message: string) => void
}

const AnnounceContext = React.createContext<AnnounceContextValue | null>(null)

interface AnnounceRegionProps {
  children: React.ReactNode
}

/**
 * Provider + live region. Mount once near the root of the app layout.
 *
 * Renders `children` plus a single visually-hidden polite live region.
 * Children call `useAnnounce()` to push messages into it.
 */
export function AnnounceRegion({ children }: AnnounceRegionProps) {
  const [message, setMessage] = React.useState<string>("")
  const timeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  const announce = React.useCallback((next: string) => {
    if (!next) return
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    // Force a content change even when the new message equals the previous
    // one: clear first, then write on the next tick. AT only re-announces
    // when the live region's text node actually changes.
    setMessage("")
    // queueMicrotask runs before paint but after the current render commits;
    // setTimeout(_, 0) is the same idea with broader cross-browser support
    // for screen-reader observers.
    setTimeout(() => {
      setMessage(next)
      timeoutRef.current = setTimeout(() => {
        setMessage("")
        timeoutRef.current = null
      }, 1500)
    }, 50)
  }, [])

  // Cleanup on unmount — guards against stray timers in dev/HMR cycles.
  React.useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
    }
  }, [])

  const value = React.useMemo<AnnounceContextValue>(
    () => ({ announce }),
    [announce],
  )

  return (
    <AnnounceContext.Provider value={value}>
      {children}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {message}
      </div>
    </AnnounceContext.Provider>
  )
}

/**
 * Hook returning the `announce` function. Falls back to a no-op when
 * called outside the provider so tests / isolated stories don't crash.
 */
export function useAnnounce(): (message: string) => void {
  const ctx = React.useContext(AnnounceContext)
  if (ctx) return ctx.announce
  // Outside-of-provider fallback: silent in production, warn once in dev so
  // a missing provider gets noticed during integration.
  if (process.env.NODE_ENV !== "production") {
    // Use a stable warning to avoid flooding the console.
    if (
      typeof window !== "undefined" &&
      !(window as unknown as { __nivyAnnounceWarned?: boolean }).__nivyAnnounceWarned
    ) {
      ;(window as unknown as { __nivyAnnounceWarned?: boolean }).__nivyAnnounceWarned = true
      // eslint-disable-next-line no-console
      console.warn(
        "[useAnnounce] called outside <AnnounceRegion>. " +
          "Mount the provider in app/layout.tsx near the root.",
      )
    }
  }
  return () => {
    /* no-op */
  }
}

export default AnnounceRegion
