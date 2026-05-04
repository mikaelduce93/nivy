import { getUserRole } from "@/lib/auth/get-user-role"
import { redirect } from "next/navigation"
import { getAchievementStats, getRecentlyUnlocked } from "@/gamification-system/features/achievements/actions"
import { getUserRank } from "@/gamification-system/features/leaderboard/actions"
import { getTeenDashboardData } from "@/lib/server/teen-dashboard"
import { TeenDashboardContent } from "@/components/teen/dashboard/teen-dashboard-content"

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
    <TeenDashboardContent
      userInfo={userInfo}
      teenId={teenId}
      xpData={xpData}
      currentStreak={currentStreak}
      displayAction={displayAction}
      socialFeed={socialFeed}
      nextReward={nextReward}
    />
  )
}
