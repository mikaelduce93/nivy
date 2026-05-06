import { getUserRole } from "@/lib/auth/get-user-role"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getAchievementStats } from "@/gamification-system/features/achievements/actions"
import { getUserRank } from "@/gamification-system/features/leaderboard/actions"
import { getLifetimeStats } from "@/gamification-system/features/stats-dashboard/actions"
import { ProfileHubClient } from "./profile-hub-client"

async function getTeenProfile(profileId: string) {
  const supabase = await createClient()

  const { data: profile, error } = await supabase
    .from("profiles")
    .select(`
      *,
      teen_data:teens (*)
    `)
    .eq("id", profileId)
    .single()

  if (error) {
    console.error("Error fetching profile:", error)
    return null
  }

  return profile
}

async function getFriendsCount(teenId: string) {
  const supabase = await createClient()

  const { count } = await supabase
    .from("teen_connections")
    .select("*", { count: "exact", head: true })
    .or(`teen_id.eq.${teenId},friend_id.eq.${teenId}`)
    .eq("status", "accepted")

  return count || 0
}

export default async function TeenProfilePage() {
  const userInfo = await getUserRole()

  if (!userInfo || userInfo.role !== "teen") {
    redirect("/auth/redirect")
  }

  const profile = await getTeenProfile(userInfo.profileId)
  const teenId = userInfo.teenData?.id

  // Fetch additional data in parallel
  const [achievementStats, userRank, lifetimeStats, friendsCount] = await Promise.all([
    teenId ? getAchievementStats(teenId) : Promise.resolve({ success: false, data: null }),
    teenId ? getUserRank({ teenId, type: 'all_time' }) : Promise.resolve({ success: false, data: null }),
    getLifetimeStats(),
    teenId ? getFriendsCount(teenId) : Promise.resolve(0)
  ])

  const teenData = userInfo.teenData
  const achievements = (achievementStats as { data?: { unlocked_count: number; total_count: number } }).data || { unlocked_count: 0, total_count: 50 }
  const lifetime = (lifetimeStats || {}) as {
    total_xp?: number
    best_login_streak?: number
    longest_login_streak?: number
    current_login_streak?: number
    total_events_attended?: number
    total_missions_completed?: number
  }

  // Serialize data for client
  const profileData = {
    profile: JSON.parse(JSON.stringify(profile || {})),
    teen: JSON.parse(JSON.stringify(teenData || {})),
    userInfo: {
      fullName: userInfo.fullName,
      profileId: userInfo.profileId,
    },
    stats: {
      level: teenData?.level || 1,
      coins: teenData?.coins || 0,
      rank: (userRank as { data?: { rank?: number } }).data?.rank ?? null,
      friendsCount,
      totalXp: lifetime.total_xp || 0,
      bestStreak: lifetime.best_login_streak || lifetime.longest_login_streak || 0,
      currentStreak: lifetime.current_login_streak || 0,
      badges: achievements.unlocked_count,
      totalBadges: achievements.total_count,
      eventsAttended: lifetime.total_events_attended || 0,
      missionsCompleted: lifetime.total_missions_completed || 0,
    },
    title: teenData?.title || "Rookie",
    titleIcon: teenData?.titleIcon || "🌱",
  }

  return <ProfileHubClient data={profileData} />
}
