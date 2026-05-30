import { redirect } from "next/navigation"
import { getUserRole } from "@/lib/auth/get-user-role"
import { Suspense } from "react"
import { StreakClient } from "./streak-client"
import { getLifetimeStats, getActivityHistory } from "@/gamification-system/features/stats-dashboard/actions"
import { getDailyMissions } from "@/gamification-system/features/missions/actions"

export default async function StreakPage() {
  const userInfo = await getUserRole()

  if (!userInfo || userInfo.role !== "teen") {
    redirect("/auth/redirect")
  }

  // #40 — read-only render. The streak WRITE runs post-hydration via the teen
  // layout's StreakPinger, not here (no DB mutation / revalidatePath in render).
  const [lifetimeStats, history, missionsResult] = await Promise.all([
    getLifetimeStats().catch(() => null),
    getActivityHistory(10).catch(() => []),
    getDailyMissions().catch(() => ({ data: [], error: null })),
  ])

  const currentStreak = lifetimeStats?.current_login_streak ?? 0

  const bestStreak = lifetimeStats?.longest_login_streak ?? currentStreak

  // Build streak history from activity records
  const streakHistory = history.map((day: any) => ({
    date: day.activity_date as string,
    completed: (day.time ?? 0) > 0 || (day.xp_earned ?? 0) > 0,
    xpEarned: day.xp_earned ?? 0,
  }))

  // Daily missions become the DAILY_TASKS
  const dailyTasks = (missionsResult.data || []).slice(0, 6).map((m: any) => ({
    id: m.id as string,
    title: m.name as string,
    completed: m.status === "completed" || m.status === "claimed",
    xp: m.xp_reward as number,
  }))

  // Static milestones config — no backing table yet, but values are
  // deterministic and don't need a DB row. Unlocked status derives from currentStreak.
  const MILESTONES = [
    { days: 3,   xpReward: 50,   badge: "🔥", title: "Démarrage" },
    { days: 7,   xpReward: 150,  badge: "💪", title: "En forme" },
    { days: 14,  xpReward: 300,  badge: "⚡", title: "Électrique" },
    { days: 30,  xpReward: 500,  badge: "🌟", title: "Étoile" },
    { days: 60,  xpReward: 1000, badge: "🏆", title: "Champion" },
    { days: 100, xpReward: 2000, badge: "👑", title: "Légende" },
  ]

  const milestones = MILESTONES.map((m) => ({
    ...m,
    unlocked: currentStreak >= m.days,
  }))

  // XP multiplier: 1x base, +0.1 per 7-day tier
  const streakMultiplier = Math.min(3.0, 1 + Math.floor(currentStreak / 7) * 0.1)

  // Streak protection passes — from lifetime stats if available
  const streakPasses = (lifetimeStats as any)?.streak_passes ?? 0

  const props = JSON.parse(
    JSON.stringify({
      currentStreak,
      bestStreak,
      streakMultiplier,
      streakPasses,
      milestones,
      streakHistory,
      dailyTasks,
    })
  )

  return (
    <div className="min-h-screen pb-32">
      <Suspense fallback={<StreakSkeleton />}>
        <StreakClient {...props} />
      </Suspense>
    </div>
  )
}

function StreakSkeleton() {
  return (
    <div className="space-y-8 pt-6 animate-pulse">
      <div className="h-14 bg-card rounded-2xl w-64" />
      <div className="h-48 bg-card rounded-2xl" />
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="h-40 bg-card rounded-2xl" />
        ))}
      </div>
    </div>
  )
}
