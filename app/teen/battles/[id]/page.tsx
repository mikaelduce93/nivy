/**
 * /teen/battles/[id] — salon d'une battle 1v1 synchrone (G4-B2, spec
 * docs/specs/SPEC-G4-BATTLES-MINIJEUX.md §3.2/§3.3).
 *
 * Page serveur : gate rôle teen, charge la battle + les 2 lignes
 * participants (RLS SELECT = auth.uid() IN (creator_id, opponent_id) —
 * un 3e compte n'obtient AUCUNE ligne → notFound, et ne recevra aucun
 * événement realtime, spec §3.1). Les identités passent par
 * resolveTeenIdentities (pattern mig 148).
 *
 * Table absente (mig 181 pas encore appliquée) → « bientôt », zéro crash.
 */
// drift-allow: tables battles/battle_participants livrées par la mig 181 (train G4, agent DB parallèle) — régénérer db-relations.json après application.
import { notFound, redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getUserRole } from "@/lib/auth/get-user-role"
import { logDbError } from "@/lib/observability/log-db-error"
import { resolveTeenIdentities } from "@/lib/server/teen-identities"
import {
  isMissingSchemaError,
  type BattleParticipantRow,
  type BattlePlayer,
  type BattleRow,
} from "@/lib/battles/types"
import { BattlesComingSoon } from "../battles-coming-soon"
import { BattleRoomClient } from "./battle-room-client"

export const dynamic = "force-dynamic"

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

interface BattleRoomPageProps {
  params: Promise<{ id: string }>
}

export default async function BattleRoomPage({ params }: BattleRoomPageProps) {
  const { id } = await params
  if (!UUID_RE.test(id)) notFound()

  const userInfo = await getUserRole()
  if (!userInfo || userInfo.role !== "teen") redirect("/auth/redirect")
  const teenId = userInfo.profileId

  const supabase = await createClient()

  const { data: battle, error: battleError } = await supabase
    .from("battles")
    .select("*")
    .eq("id", id)
    .maybeSingle()

  if (battleError) {
    if (isMissingSchemaError(battleError)) return <BattlesComingSoon />
    logDbError("battles.room", battleError)
    notFound()
  }
  // RLS renvoie 0 ligne pour un non-participant — même réponse qu'un id
  // inexistant (pas d'oracle d'existence).
  if (!battle) notFound()

  const row = battle as unknown as BattleRow
  if (row.creator_id !== teenId && row.opponent_id !== teenId) notFound()

  const { data: participantRows, error: participantsError } = await supabase
    .from("battle_participants")
    .select("*")
    .eq("battle_id", id)
  if (participantsError) logDbError("battles.room.participants", participantsError)

  const opponentId = row.creator_id === teenId ? row.opponent_id : row.creator_id
  const identities = await resolveTeenIdentities(supabase, [teenId, opponentId])

  const toPlayer = (playerId: string): BattlePlayer => {
    const ident = identities.get(playerId)
    return {
      id: playerId,
      pseudo: ident?.pseudo ?? "Anonyme",
      avatar_url: ident?.avatar_url ?? null,
      level: ident?.level ?? 1,
    }
  }

  return (
    <div className="min-h-screen pb-32">
      <BattleRoomClient
        teenId={teenId}
        me={toPlayer(teenId)}
        opponent={toPlayer(opponentId)}
        initialBattle={JSON.parse(JSON.stringify(row))}
        initialParticipants={JSON.parse(
          JSON.stringify((participantRows ?? []) as unknown as BattleParticipantRow[]),
        )}
      />
    </div>
  )
}
