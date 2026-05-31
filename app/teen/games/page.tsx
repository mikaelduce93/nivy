import { getUserRole } from "@/lib/auth/get-user-role"
import { redirect } from "next/navigation"
import { getMiniGameTypes, getUserGameStats } from "@/gamification-system/features/mini-games/actions"
import { GamesClient, type GameType, type GameStats } from "./games-client"

export default async function GamesPage() {
  const userInfo = await getUserRole()
  if (!userInfo || userInfo.role !== "teen") redirect("/auth/redirect")

  const [typesResult, statsResult] = await Promise.all([
    getMiniGameTypes().catch(() => ({ success: false, data: [] })),
    getUserGameStats().catch(() => ({ success: false, data: null })),
  ])

  const games: GameType[] = (typesResult.data || []) as any
  // getUserGameStats expose des cumuls (pas de ventilation « du jour » ni de
  // win_streak en base) : on ne mappe que les champs réellement renvoyés.
  const statsData = (statsResult as any)?.data
  const stats: GameStats = {
    total_played: statsData?.total_games_played ?? 0,
    total_xp: Math.round(statsData?.total_xp_earned ?? 0),
    total_wins: statsData?.win_count ?? 0,
  }

  return <GamesClient games={JSON.parse(JSON.stringify(games))} stats={stats} />
}
