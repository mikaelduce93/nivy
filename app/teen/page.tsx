import { getUserRole } from "@/lib/auth/get-user-role"
import { redirect } from "next/navigation"
import { getAchievementStats, getRecentlyUnlocked } from "@/gamification-system/features/achievements/actions"
import { getUserRank } from "@/gamification-system/features/leaderboard/actions"
import { getTeenDashboardData } from "@/lib/server/teen-dashboard"
import { TeenDashboardContent } from "@/components/teen/dashboard/teen-dashboard-content"
import { AvatarCoach } from "@/components/teen/avatar-coach"
import { TwinCurrencyGauge } from "@/components/teen/twin-currency-gauge"
import { createClient } from "@/lib/supabase/server"

export default async function TeenDashboardPage() {
  const userInfo = await getUserRole()

  if (!userInfo || userInfo.role !== "teen") {
    redirect("/auth/redirect")
  }

  const { teenData } = userInfo
  const teenId = teenData?.id || ''

  // Fetch dashboard data (other gamification data fetched for future use)
  const [
    ,  // achievementStatsResult - reserved for future use
    ,  // userRankResult - reserved for future use
    ,  // recentAchievementsResult - reserved for future use
    dashboardData,
  ] = await Promise.all([
    teenId ? getAchievementStats(teenId).catch(() => ({ success: false, data: null })) : Promise.resolve({ success: false, data: null }),
    teenId ? getUserRank({ teenId, type: 'all_time' }).catch(() => ({ success: false, data: null })) : Promise.resolve({ success: false, data: null }),
    teenId ? getRecentlyUnlocked(teenId, 4).catch(() => ({ success: false, data: [] })) : Promise.resolve({ success: false, data: [] }),
    getTeenDashboardData().catch(() => null),
  ])

  // Extract data with fallbacks
  const currentStreak = dashboardData?.currentStreak || 0
  const xpData = dashboardData?.xp || { 
    total: 0, 
    level: teenData?.level || 1, 
    xpToNextLevel: 100, 
    xpInLevel: 0, 
    xpForNextLevel: 1000,
    progressPercent: 0 
  }
  const nextBestAction = dashboardData?.nextBestAction
  const socialFeed = dashboardData?.socialFeed || []
  const nextReward = dashboardData?.nextReward || { name: "Place de Cinéma", xpCost: 5000, progressPercent: 0 }

  // Twin-currency gauge inputs (whitepaper §5).
  // Coins balance → user_coins.balance (canonical source, already fetched in
  // getTeenDashboardData). Spendable = balance − sum(active savings_goals.current_saved_coins).
  const coinsBalance = dashboardData?.coins?.balance ?? teenData?.coins ?? 0
  let spendableCoins: number | undefined = undefined
  try {
    const supabase = await createClient()
    const { data: lockedRows } = await supabase
      .from("savings_goals")
      .select("current_saved_coins")
      .eq("teen_id", teenId)
      .eq("status", "active")
    const locked = (lockedRows || []).reduce(
      (acc: number, row: { current_saved_coins?: number | null }) =>
        acc + (row.current_saved_coins || 0),
      0
    )
    spendableCoins = Math.max(0, coinsBalance - locked)
  } catch {
    spendableCoins = undefined
  }

  // Build display action with fallback
  const displayAction = {
    mission: nextBestAction?.mission ? {
      id: nextBestAction.mission.id,
      name: nextBestAction.mission.name,
      description: "Complète cette mission pour gagner des XP !",
      xp: nextBestAction.mission.xp,
      progress: nextBestAction.mission.progress,
      type: "daily" as const
    } : {
      name: "Connexion Quotidienne",
      description: "Connecte-toi pour maintenir ton streak !",
      xp: 50,
      progress: 0,
      type: "daily" as const
    }
  }

  return (
    <>
      {/*
        AvatarCoach v1 — whitepaper §8 retention surface. Server-rendered above
        the dashboard content so it greets the teen before the bento grid loads.
        Empty-safe: renders defaults if no avatars row exists yet.
      */}
      <div className="relative z-20 px-3 sm:px-4 md:px-8 max-w-[1600px] mx-auto pt-4 sm:pt-6 md:pt-8 space-y-4 sm:space-y-6">
        <AvatarCoach fallbackName={userInfo.fullName} />
        {/*
          Twin-currency gauge — XP and coins are DIFFERENT currencies.
          Renders side-by-side per whitepaper §5 / §29 #1 (no convert).
        */}
        <TwinCurrencyGauge
          xp={xpData.total}
          level={xpData.level}
          xpToNextLevel={xpData.xpToNextLevel ?? (xpData as { xpForNextLevel?: number }).xpForNextLevel}
          xpInLevel={xpData.xpInLevel}
          coins={coinsBalance}
          spendableCoins={spendableCoins}
          variant="full"
        />
      </div>
      <TeenDashboardContent
        userInfo={userInfo}
        teenId={teenId}
        xpData={xpData}
        currentStreak={currentStreak}
        displayAction={displayAction}
        socialFeed={socialFeed}
        nextReward={nextReward}
      />
    </>
  )
}
