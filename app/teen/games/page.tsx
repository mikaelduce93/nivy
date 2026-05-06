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
  // TODO(data): wire today_played / today_xp / win_streak from getUserGameStats once shape is known
  const stats: GameStats = {
    today_played: (statsResult as any)?.data?.games_played_today ?? 0,
    today_xp: (statsResult as any)?.data?.xp_earned_today ?? 0,
    total_wins: (statsResult as any)?.data?.total_wins ?? 0,
    win_streak: (statsResult as any)?.data?.win_streak ?? 0,
  }

  return <GamesClient games={JSON.parse(JSON.stringify(games))} stats={stats} />
}
