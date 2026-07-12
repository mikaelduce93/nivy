import { NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { getUserRole } from "@/lib/auth/get-user-role"
import { validateCsrfRequest } from "@/lib/security/csrf"
import { logDbError } from "@/lib/observability/log-db-error"
import { isMissingRelation, rpcTryVariants } from "@/lib/games/server"
import type { AnswerVerdict } from "@/lib/games/types"

/**
 * POST /api/teen/games/sessions/[id]/answer — soumet UNE réponse (SPEC-G4 §7.1).
 *
 * Body: { questionIndex, answerIndex }
 *
 * Chemin autoritaire de la spec : RPC `submit_game_answer(p_session_id,
 * p_question_index, p_answer_index)` (mig 182, SECURITY DEFINER) — elle relit
 * `educational_quizzes.questions` en interne, calcule `is_correct` elle-même
 * et appende le verdict dans `game_sessions.answers` (stockage autoritaire,
 * red-team #13). Le client n'a JAMAIS vu la bonne réponse avant ce retour.
 */

const bodySchema = z.object({
  questionIndex: z.number().int().min(0).max(49),
  answerIndex: z.number().int().min(0).max(9),
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
    const { questionIndex, answerIndex } = validation.data

    const supabase = await createClient()
    // Signature fixée par la spec §7.1 — une seule variante.
    const attempt = await rpcTryVariants(supabase, "submit_game_answer", [
      {
        p_session_id: id,
        p_question_index: questionIndex,
        p_answer_index: answerIndex,
      },
    ])

    if (attempt.missing || isMissingRelation(attempt.error)) {
      return NextResponse.json({ ok: false, reason: "unavailable" }, { status: 503 })
    }
    if (attempt.error) {
      logDbError("api.games.sessions.answer", attempt.error)
      return NextResponse.json(
        { ok: false, message: "Réponse refusée" },
        { status: 400 },
      )
    }

    const verdict = normalizeVerdict(attempt.data)
    return NextResponse.json(verdict)
  } catch (error) {
    logDbError("api.games.sessions.answer", error)
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}

/**
 * Le verdict est révélé APRÈS soumission, question par question (même règle
 * que le quiz solo). Si la forme du jsonb diverge, on renvoie `correct: null`
 * — le client avance sans feedback plutôt que de crasher.
 */
function normalizeVerdict(raw: unknown): AnswerVerdict {
  if (typeof raw === "boolean") {
    return { ok: true, correct: raw, correctIndex: null }
  }
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const rec = raw as Record<string, unknown>
    const correct =
      typeof rec.is_correct === "boolean"
        ? rec.is_correct
        : typeof rec.correct === "boolean"
          ? rec.correct
          : null
    const correctIndex =
      typeof rec.correct_index === "number"
        ? rec.correct_index
        : typeof rec.correctIndex === "number"
          ? rec.correctIndex
          : null
    return { ok: true, correct, correctIndex }
  }
  return { ok: true, correct: null, correctIndex: null }
}
