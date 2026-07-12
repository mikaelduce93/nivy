import { redirect } from "next/navigation"
import { getUserRole } from "@/lib/auth/get-user-role"
import { Suspense } from "react"
import { StreakClient } from "./streak-client"
import { getLifetimeStats, getActivityHistory } from "@/gamification-system/features/stats-dashboard/actions"
import { getDailyChallenges } from "@/features/gamification/actions"
import type { UserChallenge } from "@/features/gamification/schema"

export default async function StreakPage() {
  const userInfo = await getUserRole()

  if (!userInfo || userInfo.role !== "teen") {
    redirect("/auth/redirect")
  }

  const teenId = userInfo.teenData?.id ?? userInfo.profileId

  // #40 — read-only render. The streak WRITE runs post-hydration via the teen
  // layout's StreakPinger, not here (no DB mutation / revalidatePath in render).
  const [lifetimeStats, history, challenges] = await Promise.all([
    getLifetimeStats().catch(() => null),
    getActivityHistory(10).catch(() => []),
    // G2-B (D4 P0) — moteur unique user_challenges : mêmes défis du jour que
    // le hub /teen/quests. L'ancien getDailyMissions (moteur parallèle
    // user_missions) affichait des missions auto-« complétées + N XP » dont
    // l'XP n'était jamais crédité — triggers neutralisés (migration 171).
    getDailyChallenges(teenId)
      .then((r) => (r.success ? r.data : ([] as UserChallenge[])))
      .catch(() => [] as UserChallenge[]),
  ])

  const currentStreak = lifetimeStats?.current_login_streak ?? 0

  const bestStreak = lifetimeStats?.longest_login_streak ?? currentStreak

  // Build streak history from activity records
  const streakHistory = history.map((day: any) => ({
    date: day.activity_date as string,
    completed: (day.time ?? 0) > 0 || (day.xp_earned ?? 0) > 0,
    xpEarned: day.xp_earned ?? 0,
  }))

  // Défis du jour (user_challenges) → DAILY_TASKS. `completed` reflète le
  // moteur réel : l'XP affiché est bien celui crédité par completeChallenge.
  const dailyTasks = (challenges || []).slice(0, 6).map((c) => ({
    id: c.id,
    title: c.challenge?.title ?? "Défi du jour",
    completed: c.status === "completed",
    xp: c.challenge?.xp_reward ?? 0,
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

  // #201 Stop the lies — streakMultiplier (jamais appliqué) et streakPasses
  // (colonne inexistante, toujours 0) retirés : ne plus promettre de mécaniques
  // non implémentées.
  const props = JSON.parse(
    JSON.stringify({
      currentStreak,
      bestStreak,
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
