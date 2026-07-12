/**
 * Classement hebdo amis/crew de /teen/games — assemblage serveur (J7, spec
 * docs/specs/SPEC-G4-BATTLES-MINIJEUX.md §6.4/§8 J7).
 *
 * AUCUN classement global public (§9 P8 : amis+crew uniquement, privacy
 * mineurs). Le périmètre est le graphe du teen courant :
 *   1. amis `friendships.status='accepted'` (colonnes canon mig 024
 *      user1_id/user2_id — les deux sens de la paire) ;
 *   2. co-membres de SON crew via la RPC SECURITY DEFINER self-only
 *      `get_user_crew` (mig 146) — impossible d'énumérer le crew d'autrui.
 *
 * Les agrégats (victoires battles / points mini-jeux) sont lus avec le client
 * service-role : la RLS de `battles`/`game_sessions` (mig 181) est
 * participant/self-only, un teen ne peut donc PAS lire les lignes de ses amis
 * avec son propre JWT. Le service-role n'est utilisé QU'avec des filtres
 * `.in()` sur les ids du graphe calculé ci-dessus — un teen hors graphe
 * n'apparaît jamais (critère de done J7).
 *
 * Identités : helper resolveTeenIdentities (pattern mig 148 —
 * COALESCE(teens.pseudo, profiles.full_name), jamais user_profiles). On lui
 * passe le client service-role : depuis la mig 147 la lecture publique de
 * `teens` est verrouillée (self/parent), le JWT du teen ne résout donc pas
 * les pseudos de ses amis — le scope reste borné aux ids du graphe.
 *
 * Tables absentes (mig 181 pas encore appliquée) → compteurs à zéro,
 * jamais de crash (même contrat honnête que lib/games/server.ts).
 */
// drift-allow: tables battles/game_sessions livrées par la mig 181 (train G4, agent DB parallèle) — régénérer db-relations.json après application.

import "server-only"

import { createClient } from "@/lib/supabase/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { logDbError } from "@/lib/observability/log-db-error"
import { resolveTeenIdentities } from "@/lib/server/teen-identities"
import { isMissingSchemaError } from "@/lib/battles/types"
import { casablancaDayStartUtc } from "@/lib/games/day"
import type { CrewLadderInfo, LadderRow, WeeklyLadder } from "./ladder-types"

const CASABLANCA_TZ = "Africa/Casablanca"

/**
 * Instant UTC du lundi 00:00 courant à Casablanca (« semaine » des classements,
 * même définition locale que le jour anti-farm §6.2-3). On recule jour local
 * par jour local (≤ 6 pas) pour rester exact autour des changements d'heure
 * marocains (Ramadan/DST).
 */
export function casablancaWeekStartUtc(now: Date = new Date()): Date {
  let dayStart = casablancaDayStartUtc(now)
  const weekdayFmt = new Intl.DateTimeFormat("en-US", {
    timeZone: CASABLANCA_TZ,
    weekday: "short",
  })
  for (let i = 0; i < 6; i++) {
    if (weekdayFmt.format(dayStart) === "Mon") break
    // -12 h depuis le minuit local = instant fermement dans le jour local
    // précédent, dont on reprend le minuit local.
    dayStart = casablancaDayStartUtc(new Date(dayStart.getTime() - 12 * 3_600_000))
  }
  return dayStart
}

interface CrewMemberJson {
  user_id?: string
  pseudo?: string | null
  level?: number | null
}

interface UserCrewJson {
  has_crew?: boolean
  crew?: { name?: string | null; total_challenges_won?: number | null }
  members?: CrewMemberJson[]
}

function sortRows(rows: LadderRow[]): LadderRow[] {
  return rows.sort(
    (a, b) =>
      b.wins - a.wins || b.points - a.points || a.pseudo.localeCompare(b.pseudo, "fr"),
  )
}

export async function getWeeklyLadder(teenId: string): Promise<WeeklyLadder> {
  const weekStartIso = casablancaWeekStartUtc().toISOString()
  const emptyCrew: CrewLadderInfo = {
    hasCrew: false,
    name: null,
    totalChallengesWon: 0,
    rows: [],
  }

  try {
    const supabase = await createClient()

    // 1. Amis accepted (les deux sens de la paire — colonnes canon mig 024).
    const { data: friendRows, error: friendsError } = await supabase
      .from("friendships")
      .select("user1_id, user2_id")
      .or(`user1_id.eq.${teenId},user2_id.eq.${teenId}`)
      .eq("status", "accepted")
      .limit(100)
    if (friendsError) logDbError("games.ladder.friendships", friendsError)
    const friendIds = Array.from(
      new Set(
        ((friendRows ?? []) as { user1_id: string; user2_id: string }[]).map((r) =>
          r.user1_id === teenId ? r.user2_id : r.user1_id,
        ),
      ),
    ).filter((id) => id && id !== teenId)

    // 2. Mon crew — RPC SECURITY DEFINER self-only (mig 146).
    const { data: crewData, error: crewError } = await supabase.rpc("get_user_crew", {
      p_user_id: teenId,
    })
    if (crewError) logDbError("games.ladder.crew", crewError)
    const crewJson = (crewData ?? null) as unknown as UserCrewJson | null
    const hasCrew = Boolean(crewJson?.has_crew)
    const crewMembers: CrewMemberJson[] = hasCrew
      ? (crewJson?.members ?? []).filter((m) => typeof m?.user_id === "string")
      : []

    // 3. Agrégats de la semaine — service-role scopé au graphe (voir en-tête).
    const friendScope = [teenId, ...friendIds]
    const crewScope = crewMembers.map((m) => m.user_id as string)
    const allIds = Array.from(new Set([...friendScope, ...crewScope]))

    const winsById = new Map<string, number>()
    const pointsById = new Map<string, number>()
    let identities = new Map<
      string,
      { pseudo: string | null; avatar_url: string | null; level: number }
    >()

    try {
      const svc = createServiceRoleClient()

      const [winsRes, scoresRes] = await Promise.all([
        // Victoires battles de la semaine : winner_id posé par resolve_battle
        // (résolutions score/forfait ; les draws/expired n'ont pas de winner).
        svc
          .from("battles")
          .select("winner_id")
          .eq("status", "resolved")
          .gte("resolved_at", weekStartIso)
          .in("winner_id", allIds),
        // Points mini-jeux de la semaine : sessions complétées (score serveur).
        svc
          .from("game_sessions")
          .select("teen_id, score")
          .eq("status", "completed")
          .gte("completed_at", weekStartIso)
          .in("teen_id", allIds),
      ])

      if (winsRes.error) {
        // Table absente = mig 181 pas appliquée → zéros silencieux.
        if (!isMissingSchemaError(winsRes.error)) {
          logDbError("games.ladder.battleWins", winsRes.error)
        }
      } else {
        for (const row of (winsRes.data ?? []) as unknown as {
          winner_id: string | null
        }[]) {
          if (!row.winner_id) continue
          winsById.set(row.winner_id, (winsById.get(row.winner_id) ?? 0) + 1)
        }
      }

      if (scoresRes.error) {
        if (!isMissingSchemaError(scoresRes.error)) {
          logDbError("games.ladder.gameScores", scoresRes.error)
        }
      } else {
        for (const row of (scoresRes.data ?? []) as unknown as {
          teen_id: string
          score: number | null
        }[]) {
          pointsById.set(row.teen_id, (pointsById.get(row.teen_id) ?? 0) + (row.score ?? 0))
        }
      }

      // 4. Identités des amis (le roster crew arrive déjà résolu par la RPC).
      identities = await resolveTeenIdentities(svc, friendScope)
    } catch (error) {
      // Service-role indisponible (env sans clé) : on retombe sur le client
      // user pour les identités — les compteurs restent à zéro.
      logDbError("games.ladder.serviceRole", error)
      identities = await resolveTeenIdentities(supabase, friendScope)
    }

    const toRow = (id: string, pseudo: string | null, level: number | null): LadderRow => ({
      id,
      pseudo: pseudo || "Anonyme",
      level: level ?? 1,
      wins: winsById.get(id) ?? 0,
      points: pointsById.get(id) ?? 0,
      isMe: id === teenId,
    })

    const friends = sortRows(
      friendScope.map((id) => {
        const ident = identities.get(id)
        return toRow(id, ident?.pseudo ?? null, ident?.level ?? null)
      }),
    )

    const crew: CrewLadderInfo = hasCrew
      ? {
          hasCrew: true,
          name: crewJson?.crew?.name ?? null,
          totalChallengesWon: crewJson?.crew?.total_challenges_won ?? 0,
          rows: sortRows(
            crewMembers.map((m) => toRow(m.user_id as string, m.pseudo ?? null, m.level ?? null)),
          ),
        }
      : emptyCrew

    return { weekStartIso, hasFriends: friendIds.length > 0, friends, crew }
  } catch (error) {
    logDbError("games.ladder", error)
    return { weekStartIso, hasFriends: false, friends: [], crew: emptyCrew }
  }
}
