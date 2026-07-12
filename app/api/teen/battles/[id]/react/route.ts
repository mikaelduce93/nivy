import { NextResponse } from "next/server"
import { z } from "zod"
import type { SupabaseClient } from "@supabase/supabase-js"
import { createClient } from "@/lib/supabase/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { validateCsrfRequest } from "@/lib/security/csrf"
import { logDbError } from "@/lib/observability/log-db-error"
import {
  BATTLE_REACTION_EMOJIS,
  REACTIONS_MAX_PER_BATTLE,
  REACTIONS_MAX_PER_ROUND,
  isMissingSchemaError,
} from "@/lib/battles/types"

/**
 * POST /api/teen/battles/[id]/react — réaction emoji pendant une battle
 * (spec docs/specs/SPEC-G4-BATTLES-MINIJEUX.md §3.2 « reaction » / §5.1-3,
 * red-team #8).
 *
 * Body : { emoji } — set FERMÉ de 6 (BATTLE_REACTION_EMOJIS), jamais de
 * texte libre entre mineurs.
 *
 * Gardes, dans l'ordre :
 *   1. CSRF (double-submit, pattern routes games) + auth getUser.
 *   2. Participant de la battle uniquement (créateur/opposant) — un tiers
 *      reçoit le même 404 qu'un id inexistant (pas d'oracle d'existence).
 *   3. Battle vivante (lobby/active) — sinon 409.
 *   4. Rate-limit SERVEUR ≤ 3/round et ≤ 10/battle par participant,
 *      persisté dans battle_participants.reactions_count/reactions_tally
 *      (mig 181:123-124) : le spam moqueur est borné ET auditable (§5.3).
 *      Dépassement → 429 (l'UI affiche « Doucement ! »).
 *   5. Broadcast émis SERVEUR (jamais par le client) : event `reaction`,
 *      payload {emoji, teen_id}, sur le channel `battle:{id}` — exactement
 *      ce qu'écoute battle-room-client.tsx.
 *
 * Écritures via service-role APRÈS les gardes : la table n'a aucune policy
 * d'écriture authenticated (mig 181) — c'est voulu, seule cette route (et
 * les RPC DEFINER) écrivent.
 *
 * Contrat de réponse consommé par l'UI : 404 → barre de réactions retirée
 * (socle absent/battle introuvable) ; 429 → toast « Doucement ! » ; 200
 * { success: true } sinon. Socle battles absent (mig 181 pas appliquée) →
 * 404, même dégradation douce que le reste du train G4.
 */
// drift-allow: tables battles/battle_participants livrées par la mig 181 (train G4, agent DB parallèle) — régénérer db-relations.json après application.

const paramsSchema = z.object({ id: z.string().uuid("Battle invalide") })
const bodySchema = z.object({ emoji: z.enum(BATTLE_REACTION_EMOJIS) })

/** Clé méta du tally jsonb pour le compteur PAR ROUND — ne peut pas entrer en
 *  collision avec le set fermé d'emojis ; les clés `_*` sont ignorées par la
 *  lecture d'audit par-emoji (§5.3). */
const ROUND_META_KEY = "_round"

interface BattleGateRow {
  id: string
  status: string
  current_round: number
  creator_id: string
  opponent_id: string
}

interface ParticipantCounters {
  reactions_count: number | null
  reactions_tally: Record<string, unknown> | null
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    if (!(await validateCsrfRequest(request))) {
      return NextResponse.json({ success: false, error: "csrf" }, { status: 403 })
    }

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ success: false, error: "unauthorized" }, { status: 401 })
    }

    const paramsValidation = paramsSchema.safeParse(await params)
    if (!paramsValidation.success) {
      return NextResponse.json({ success: false, error: "invalid_battle_id" }, { status: 400 })
    }
    const battleId = paramsValidation.data.id

    const body = await request.json().catch(() => null)
    const bodyValidation = bodySchema.safeParse(body)
    if (!bodyValidation.success) {
      return NextResponse.json({ success: false, error: "invalid_emoji" }, { status: 400 })
    }
    const emoji = bodyValidation.data.emoji

    // Service-role (écritures + broadcast) — cast non typé : battles/
    // battle_participants ne sont pas encore dans types/supabase.ts (types à
    // régénérer après application de la mig 181 par l'agent DB).
    const admin = createServiceRoleClient() as unknown as SupabaseClient

    // ------------------------------------------------------------ gardes
    const { data: battle, error: battleError } = await admin
      .from("battles")
      .select("id, status, current_round, creator_id, opponent_id")
      .eq("id", battleId)
      .maybeSingle()

    if (battleError) {
      // Socle absent (mig 181 pas appliquée) → 404 : l'UI retire la barre.
      if (isMissingSchemaError(battleError)) {
        return NextResponse.json({ success: false, error: "unavailable" }, { status: 404 })
      }
      logDbError("api.battles.react.battle", battleError)
      return NextResponse.json({ success: false, error: "server_error" }, { status: 500 })
    }

    const gate = battle as BattleGateRow | null
    // Inexistante OU appelant non participant : même 404 (pas d'oracle).
    if (!gate || (gate.creator_id !== user.id && gate.opponent_id !== user.id)) {
      return NextResponse.json({ success: false, error: "not_found" }, { status: 404 })
    }
    if (gate.status !== "lobby" && gate.status !== "active") {
      return NextResponse.json({ success: false, error: "battle_not_live" }, { status: 409 })
    }

    const { data: participant, error: participantError } = await admin
      .from("battle_participants")
      .select("reactions_count, reactions_tally")
      .eq("battle_id", battleId)
      .eq("teen_id", user.id)
      .maybeSingle()

    if (participantError) {
      logDbError("api.battles.react.participant", participantError)
      return NextResponse.json({ success: false, error: "server_error" }, { status: 500 })
    }
    const counters = participant as ParticipantCounters | null
    if (!counters) {
      return NextResponse.json({ success: false, error: "not_found" }, { status: 404 })
    }

    // -------------------------------------------------------- rate-limit
    const totalCount = counters.reactions_count ?? 0
    const tally: Record<string, unknown> =
      counters.reactions_tally && typeof counters.reactions_tally === "object"
        ? counters.reactions_tally
        : {}
    const roundMeta = tally[ROUND_META_KEY] as { no?: number; count?: number } | undefined
    const roundCount =
      roundMeta && roundMeta.no === gate.current_round ? (roundMeta.count ?? 0) : 0

    if (totalCount >= REACTIONS_MAX_PER_BATTLE || roundCount >= REACTIONS_MAX_PER_ROUND) {
      return NextResponse.json({ success: false, error: "rate_limited" }, { status: 429 })
    }

    // ------------------------------------------------------- persistance
    // Update CONDITIONNEL sur reactions_count (optimistic concurrency) :
    // deux requêtes simultanées ne peuvent pas compter la même réaction —
    // la perdante repart en 429 (throttle, l'UI a déjà son cooldown 1,2 s).
    const previousEmojiCount = typeof tally[emoji] === "number" ? (tally[emoji] as number) : 0
    const nextTally = {
      ...tally,
      [emoji]: previousEmojiCount + 1,
      [ROUND_META_KEY]: { no: gate.current_round, count: roundCount + 1 },
    }

    const { data: updatedRows, error: updateError } = await admin
      .from("battle_participants")
      .update({ reactions_count: totalCount + 1, reactions_tally: nextTally })
      .eq("battle_id", battleId)
      .eq("teen_id", user.id)
      .eq("reactions_count", totalCount)
      .select("reactions_count")

    if (updateError) {
      logDbError("api.battles.react.update", updateError)
      return NextResponse.json({ success: false, error: "server_error" }, { status: 500 })
    }
    if (!Array.isArray(updatedRows) || updatedRows.length === 0) {
      return NextResponse.json({ success: false, error: "rate_limited" }, { status: 429 })
    }

    // --------------------------------------------------------- broadcast
    // Émis SERVEUR (§3.2) sur `battle:{id}` — channel non souscrit ⇒
    // supabase-js passe par l'endpoint HTTP broadcast, aucun websocket
    // serveur. Best-effort : un échec de diffusion ne défait pas le compteur
    // (la réaction reste auditée), on le logge seulement.
    const channel = admin.channel(`battle:${battleId}`)
    try {
      const sendStatus = await channel.send({
        type: "broadcast",
        event: "reaction",
        payload: { emoji, teen_id: user.id },
      })
      if (sendStatus !== "ok") {
        console.warn("[api.battles.react] broadcast non délivré:", sendStatus)
      }
    } finally {
      await admin.removeChannel(channel)
    }

    return NextResponse.json({
      success: true,
      reactions_round: roundCount + 1,
      reactions_total: totalCount + 1,
    })
  } catch (error) {
    logDbError("api.battles.react", error)
    return NextResponse.json({ success: false, error: "server_error" }, { status: 500 })
  }
}
