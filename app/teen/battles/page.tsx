/**
 * /teen/battles — lobby des battles 1v1 synchrones (G4-B2, spec
 * docs/specs/SPEC-G4-BATTLES-MINIJEUX.md §3.3).
 *
 * Page serveur : gate rôle teen, charge
 *   1. mes battles (RLS `auth.uid() IN (creator_id, opponent_id)` — le
 *      prédicat .or() est ajouté explicitement pour les index, pattern
 *      friend-defis) ;
 *   2. mes amis `friendships.status='accepted'` — SEULS adversaires
 *      autorisés v1 (spec §5.1-1, revérifié serveur par create_battle) ;
 *   3. les identités via resolveTeenIdentities (pattern mig 148 —
 *      COALESCE(teens.pseudo, profiles.full_name), jamais user_profiles).
 *
 * Si la table `battles` n'existe pas encore (mig 181 livrée en parallèle),
 * on rend l'écran « Les battles arrivent bientôt » — jamais de crash.
 */
// drift-allow: tables battles/battle_participants livrées par la mig 181 (train G4, agent DB parallèle) — régénérer db-relations.json après application.
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getUserRole } from "@/lib/auth/get-user-role"
import { logDbError } from "@/lib/observability/log-db-error"
import { resolveTeenIdentities } from "@/lib/server/teen-identities"
import {
  isMissingSchemaError,
  type BattleListItem,
  type BattlePlayer,
  type BattleResolution,
  type BattleStatus,
} from "@/lib/battles/types"
import { BattlesComingSoon } from "./battles-coming-soon"
import { BattlesListClient } from "./battles-list-client"

export const dynamic = "force-dynamic"

interface BattleListRow {
  id: string
  status: BattleStatus
  resolution: BattleResolution
  is_draw: boolean | null
  winner_id: string | null
  creator_id: string
  opponent_id: string
  current_round: number
  rounds_total: number
  created_at: string
  expires_at: string | null
}

export default async function BattlesPage() {
  const userInfo = await getUserRole()
  if (!userInfo || userInfo.role !== "teen") redirect("/auth/redirect")

  // Invariant identité battles v1 : teens.id = auth.uid() (spec §3.5).
  const teenId = userInfo.profileId
  const supabase = await createClient()

  // 1. Mes battles ------------------------------------------------------
  const { data: battleRows, error: battlesError } = await supabase
    .from("battles")
    .select(
      "id, status, resolution, is_draw, winner_id, creator_id, opponent_id, current_round, rounds_total, created_at, expires_at",
    )
    .or(`creator_id.eq.${teenId},opponent_id.eq.${teenId}`)
    .order("created_at", { ascending: false })
    .limit(50)

  if (battlesError) {
    if (isMissingSchemaError(battlesError)) {
      // Socle DB pas encore appliqué → dégradation honnête, zéro crash.
      return <BattlesComingSoon />
    }
    logDbError("battles.list", battlesError)
  }

  const battles = (battleRows ?? []) as unknown as BattleListRow[]

  // 2. Amis acceptés (les deux sens de la paire) -------------------------
  const { data: friendRows, error: friendsError } = await supabase
    .from("friendships")
    .select("user1_id, user2_id, status")
    .or(`user1_id.eq.${teenId},user2_id.eq.${teenId}`)
    .eq("status", "accepted")
    .limit(50)
  if (friendsError) logDbError("battles.friendships", friendsError)

  const friendIds = Array.from(
    new Set(
      (friendRows ?? []).map((r: { user1_id: string; user2_id: string }) =>
        r.user1_id === teenId ? r.user2_id : r.user1_id,
      ),
    ),
  ).filter(Boolean)

  // 3. Identités (adversaires des battles + amis) ------------------------
  const otherIds = battles.map((b) =>
    b.creator_id === teenId ? b.opponent_id : b.creator_id,
  )
  const identities = await resolveTeenIdentities(supabase, [...otherIds, ...friendIds])

  const toPlayer = (id: string): BattlePlayer => {
    const ident = identities.get(id)
    return {
      id,
      pseudo: ident?.pseudo ?? "Anonyme",
      avatar_url: ident?.avatar_url ?? null,
      level: ident?.level ?? 1,
    }
  }

  const items: BattleListItem[] = battles.map((b) => ({
    id: b.id,
    status: b.status,
    resolution: b.resolution ?? null,
    is_draw: Boolean(b.is_draw),
    winner_id: b.winner_id,
    current_round: b.current_round,
    rounds_total: b.rounds_total,
    created_at: b.created_at,
    expires_at: b.expires_at,
    iAmCreator: b.creator_id === teenId,
    other: toPlayer(b.creator_id === teenId ? b.opponent_id : b.creator_id),
  }))

  const friends: BattlePlayer[] = friendIds.map(toPlayer)

  return (
    <div className="min-h-screen pb-32">
      <BattlesListClient teenId={teenId} battles={items} friends={friends} />
    </div>
  )
}
