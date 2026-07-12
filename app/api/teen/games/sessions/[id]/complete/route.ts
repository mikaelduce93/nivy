import { NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { getUserRole } from "@/lib/auth/get-user-role"
import { validateCsrfRequest } from "@/lib/security/csrf"
import { logDbError } from "@/lib/observability/log-db-error"
import { isPlayableSlug } from "@/lib/games/catalog"
import {
  buildXpInfo,
  getCreditedTodayForSlug,
  isMissingRelation,
  rpcTryVariants,
} from "@/lib/games/server"
import type { CompleteResult } from "@/lib/games/types"

/**
 * POST /api/teen/games/sessions/[id]/complete — clôt la session (SPEC-G4 §7.1).
 *
 * Body: { slug, moves?, durationSeconds? }
 *
 * RPC `complete_game_session(p_session_id, p_client_stats)` (mig 183) : le
 * score final des jeux quiz est calculé côté serveur À PARTIR DE
 * `game_sessions.answers` UNIQUEMENT — `p_client_stats` y est ignoré. L'XP
 * est crédité par le serveur (`add_xp_to_user`, plafonds §6.2 : idempotence
 * + 3 sessions/jeu/jour).
 *
 * ⚠️ EXCEPTION M1 (Memory, §7.2 — explicitement bornée) : pour `memory`, la
 * validation est une PLAUSIBILITÉ sur `p_client_stats` (mig 183, J6) :
 * cartes retournées ≥ 16 (minimum théorique 8 paires → 16) et durée ≥ 10 s ;
 * implausible ⇒ XP=0 mais session `completed`. Le client (`memory-run.tsx`)
 * compte des TENTATIVES (2 cartes retournées chacune) — la conversion
 * tentatives × 2 = `card_flips` se fait ICI, avant l'appel RPC. C'est la
 * SEULE surface G4 où le client influence son crédit — bornée à ≤ 15 XP/
 * session, 3 sessions/jour, idempotente. Si l'enjeu XP montait, basculer sur
 * `flip(i)` serveur.
 */

const bodySchema = z.object({
  slug: z.string().min(1),
  moves: z.number().int().min(0).max(10_000).optional(),
  durationSeconds: z.number().min(0).max(86_400).optional(),
})

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    if (!(await validateCsrfRequest(request))) {
      return NextResponse.json({ ok: false, message: "CSRF" }, { status: 403 })
    }

    const userInfo = await getUserRole()
    if (!userInfo || userInfo.role !== "teen" || !userInfo.teenData?.id) {
      return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    if (!z.string().uuid().safeParse(id).success) {
      return NextResponse.json({ ok: false, message: "Session invalide" }, { status: 400 })
    }

    const body = await request.json().catch(() => null)
    const validation = bodySchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { ok: false, message: validation.error.errors[0].message },
        { status: 400 },
      )
    }
    const { slug, moves, durationSeconds } = validation.data

    // Contrat final (mig 183) : p_client_stats = { card_flips, duration_seconds }.
    // `moves` (tentatives de 2 cartes, memory-run.tsx) → card_flips = moves × 2.
    const hasStats = typeof moves === "number" || typeof durationSeconds === "number"
    const stats = hasStats
      ? {
          card_flips: typeof moves === "number" ? moves * 2 : null,
          duration_seconds: durationSeconds ?? null,
        }
      : null

    const supabase = await createClient()
    // Signature fixée par la mig 183 — une seule variante (rpcTryVariants ne
    // sert plus qu'à détecter l'infra absente : PGRST202 ⇒ 503 « bientôt »).
    const attempt = await rpcTryVariants(supabase, "complete_game_session", [
      { p_session_id: id, p_client_stats: stats },
    ])

    if (attempt.missing || isMissingRelation(attempt.error)) {
      return NextResponse.json({ ok: false, reason: "unavailable" }, { status: 503 })
    }
    if (attempt.error) {
      logDbError("api.games.sessions.complete", attempt.error)
      return NextResponse.json(
        { ok: false, message: "Clôture refusée" },
        { status: 400 },
      )
    }

    const rec =
      attempt.data && typeof attempt.data === "object" && !Array.isArray(attempt.data)
        ? (attempt.data as Record<string, unknown>)
        : {}
    if (rec.success === false) {
      logDbError("api.games.sessions.complete", {
        message: typeof rec.error === "string" ? rec.error : "complete: success=false",
      })
      return NextResponse.json({ ok: false, message: "Clôture refusée" }, { status: 400 })
    }

    const score =
      typeof rec.score === "number"
        ? rec.score
        : typeof rec.final_score === "number"
          ? rec.final_score
          : null
    const xpAwarded =
      typeof rec.xp_awarded === "number"
        ? rec.xp_awarded
        : typeof rec.xp === "number"
          ? rec.xp
          : 0

    // Recompte APRÈS clôture : l'écran de fin affiche le plafond à jour.
    const creditedToday = isPlayableSlug(slug)
      ? (await getCreditedTodayForSlug(slug)).creditedToday
      : 0

    const result: CompleteResult = {
      ok: true,
      score,
      xpAwarded,
      xp: buildXpInfo(creditedToday),
    }
    return NextResponse.json(result)
  } catch (error) {
    logDbError("api.games.sessions.complete", error)
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
