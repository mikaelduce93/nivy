import { redirect } from "next/navigation"
import { getUserRole } from "@/lib/auth/get-user-role"
import { getUserGameStats } from "@/gamification-system/features/mini-games/actions"
import {
  GAME_DEFAULTS,
  PLAYABLE_GAME_SLUGS,
  XP_SESSIONS_PER_DAY,
} from "@/lib/games/catalog"
import {
  getGamesInfraSummary,
  getPlayableCatalogRows,
  type GamesInfraSummary,
} from "@/lib/games/server"
import { getWeeklyLadder } from "./ladder-data"
import { GamesClient, type GameCardData, type GameStats } from "./games-client"

export const dynamic = "force-dynamic"

/**
 * /teen/games — catalogue honnête (SPEC-G4 §7.4) + classement hebdo (J7).
 *
 * Seuls les 3 jeux construits (Quiz Rush, Memory, Vrai/Faux Sprint) sont
 * listés, chacun via un Link vers sa vraie page /teen/games/[slug] — plus
 * aucun CTA disabled. Les slugs legacy non construits (music_quiz,
 * blindtest, predictions…) ne sont plus affichés du tout. Une ligne
 * `mini_game_types` désactivée par l'admin masque le jeu correspondant.
 */
export default async function GamesPage() {
  const userInfo = await getUserRole()
  if (!userInfo || userInfo.role !== "teen") redirect("/auth/redirect")
  const teenId = userInfo.profileId

  const [statsResult, catalogRows, infra, ladder] = await Promise.all([
    getUserGameStats().catch(() => ({ success: false as const, data: undefined })),
    getPlayableCatalogRows().catch(() => []),
    getGamesInfraSummary().catch(
      (): GamesInfraSummary => ({ available: false, creditedToday: {} }),
    ),
    getWeeklyLadder(teenId),
  ])

  const statsData = statsResult.success ? statsResult.data : undefined
  const stats: GameStats = {
    total_played: statsData?.total_games_played ?? 0,
    total_xp: statsData?.total_xp_earned ?? 0,
    total_wins: statsData?.win_count ?? 0,
  }

  const games: GameCardData[] = PLAYABLE_GAME_SLUGS.filter((slug) => {
    // Ligne catalogue désactivée par l'admin = jeu masqué (catalogue honnête
    // §7.4) ; ligne absente (mig 183 pas encore passée) = défauts du code.
    const row = catalogRows.find((r) => r.slug === slug)
    return row ? row.is_active : true
  }).map((slug) => {
    const defaults = GAME_DEFAULTS[slug]
    const row = catalogRows.find((r) => r.slug === slug)
    return {
      slug,
      name: row?.name || defaults.name,
      emoji: defaults.emoji,
      description: row?.description || defaults.description,
      baseXp: row?.base_xp ?? defaults.baseXp,
      creditedToday: infra.creditedToday[slug] ?? 0,
      capPerDay: XP_SESSIONS_PER_DAY,
    }
  })

  return <GamesClient stats={stats} games={games} ladder={ladder} />
}
