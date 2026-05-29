"use client"

import { useEffect, useRef } from "react"
import { updateLoginStreak } from "@/gamification-system/features/stats-dashboard/actions"

/**
 * #40 — fires the login-streak WRITE once after hydration, OUTSIDE the RSC
 * render path. Previously updateLoginStreak() ran inside getTeenDashboardData's
 * render Promise.all, which performed a DB mutation + revalidatePath() during
 * render — illegal in Next.js (logged an error, revalidation was a no-op).
 *
 * Calling the Server Action from a client effect lets it mutate
 * user_lifetime_stats / user_daily_activity and revalidatePath('/profile',
 * '/stats') legitimately. Renders nothing.
 */
export function StreakPinger() {
  const fired = useRef(false)
  useEffect(() => {
    if (fired.current) return
    fired.current = true
    void updateLoginStreak().catch(() => {})
  }, [])
  return null
}
