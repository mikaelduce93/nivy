import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getUserRole } from "@/lib/auth/get-user-role"
import { getQuizAnswerKey } from "@/lib/quiz/server"
import { submitQuizSchema } from "@/lib/quiz/schema"
import { recordSignalAsync } from "@/lib/analytics/signals"

/**
 * POST /api/teen/quiz/submit
 *
 * Body: { quizId, answers, timeSpentSeconds? }
 *
 * Re-grades the quiz server-side from the canonical answer key, persists a
 * `quiz_attempts` row, and grants XP through the existing `add_xp_to_user`
 * RPC (the same path used by `app/api/teen/education/quizzes/route.ts`).
 *
 * J0 (spec G4 §3.0, migration 180) : la clé de réponses est lue via
 * `getQuizAnswerKey` (lecture authenticated pré-180, bascule service-role
 * une fois la colonne verrouillée). `correct`/`explanation` ne sont renvoyés
 * qu'ICI, après soumission, question par question — jamais dans le payload
 * initial du runner.
 */
export async function POST(request: NextRequest) {
  try {
    const userInfo = await getUserRole()
    if (!userInfo || userInfo.role !== "teen" || !userInfo.teenData?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const teenId = userInfo.teenData.id
    const body = await request.json().catch(() => null)
    const validation = submitQuizSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 },
      )
    }

    const { quizId, answers, timeSpentSeconds } = validation.data
    const supabase = await createClient()

    // Quiz metadata via le client user (la RLS 022 vérifie is_active) — la
    // colonne `questions` n'est plus dans ce select (verrouillée par la 180).
    const { data: quiz, error: quizError } = await supabase
      .from("educational_quizzes")
      .select("id, title, passing_score, xp_reward, subject, tags")
      .eq("id", quizId)
      .eq("is_active", true)
      .maybeSingle()

    if (quizError) {
      console.error("[teen/quiz/submit] quiz fetch error:", quizError)
      return NextResponse.json({ error: "Failed to load quiz" }, { status: 500 })
    }
    if (!quiz) {
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 })
    }

    // Answer key — server-side scoring only (J0).
    const questions = await getQuizAnswerKey(supabase, quizId)
    if (!questions) {
      return NextResponse.json({ error: "Failed to load quiz" }, { status: 500 })
    }
    if (questions.length === 0) {
      return NextResponse.json({ error: "Quiz has no questions" }, { status: 400 })
    }

    if (answers.length !== questions.length) {
      return NextResponse.json(
        { error: `Expected ${questions.length} answers, got ${answers.length}` },
        { status: 400 },
      )
    }

    // Score
    let correctCount = 0
    const results = questions.map((q, i) => {
      const userAnswer = answers[i]
      const isCorrect = userAnswer === q.correct
      if (isCorrect) correctCount += 1
      return {
        question: q.question,
        userAnswer,
        correctAnswer: q.correct,
        isCorrect,
      }
    })

    // J0 — la correction/explication n'est révélée qu'APRÈS soumission, dans
    // cette réponse (le payload initial du runner est strippé). La version
    // persistée dans quiz_attempts.answers reste `results` (shape inchangée).
    const responseResults = results.map((r, i) => ({
      ...r,
      explanation: questions[i]?.explanation ?? null,
    }))

    const score = Math.round((correctCount / questions.length) * 100)
    const passingScore = quiz.passing_score ?? 60
    const passed = score >= passingScore

    // Anti-farm (audit 2026-07-11 Q4, P0) — politique PO : rejouer un quiz
    // reste possible (entraînement, la tentative est toujours enregistrée),
    // mais l'XP n'est crédité qu'à la PREMIÈRE réussite. On détecte un crédit
    // antérieur via xp_earned > 0 (plutôt que la colonne GENERATED `passed`,
    // figée sur score >= 60 et qui peut diverger de quiz.passing_score).
    let alreadyRewarded = false
    if (passed) {
      const { data: priorReward, error: priorRewardError } = await supabase
        .from("quiz_attempts")
        .select("id")
        .eq("teen_id", teenId)
        .eq("quiz_id", quizId)
        .gt("xp_earned", 0)
        .limit(1)
        .maybeSingle()
      if (priorRewardError) {
        // Fail-open : une erreur transitoire ne doit pas priver une vraie
        // première réussite de son XP. La garde DB (migration 169, à
        // appliquer) servira de filet idempotent côté add_xp_to_user.
        console.error(
          "[teen/quiz/submit] prior-reward check error:",
          priorRewardError,
        )
      }
      alreadyRewarded = Boolean(priorReward)
    }

    // XP (only on FIRST pass); bonus on high scores, mirrors education/quizzes/route.ts
    let xpEarned = 0
    if (passed && !alreadyRewarded) {
      const baseXp = quiz.xp_reward ?? 50
      if (score >= 90) xpEarned = Math.round(baseXp * 1.5)
      else if (score >= 80) xpEarned = Math.round(baseXp * 1.25)
      else xpEarned = baseXp
    }

    const { data: attempt, error: insertError } = await supabase
      .from("quiz_attempts")
      .insert({
        teen_id: teenId,
        quiz_id: quizId,
        score,
        answers: results,
        correct_count: correctCount,
        total_questions: questions.length,
        completed_at: new Date().toISOString(),
        time_spent_seconds: timeSpentSeconds ?? null,
        // `passed` est une colonne GENERATED ALWAYS (score >= 60) en base —
        // l'insérer explicitement lève 428C9. La DB la calcule. Le `passed`
        // JS ci-dessus reste utilisé pour l'XP et la réponse.
        xp_earned: xpEarned,
      })
      .select("id")
      .single()

    if (insertError) {
      console.error("[teen/quiz/submit] insert error:", insertError)
      return NextResponse.json(
        { error: "Failed to save quiz attempt" },
        { status: 500 },
      )
    }

    // Wave 1.4 — record this quiz in quiz_seen_history so the recommender enforces
    // the whitepaper §29.9 invariant (no repeat within 7 days).
    {
      const { error: seenError } = await supabase
        .from("quiz_seen_history")
        .upsert(
          { teen_id: teenId, quiz_id: quizId, last_seen: new Date().toISOString() },
          { onConflict: "teen_id,quiz_id" },
        )
      if (seenError) {
        console.error("[teen/quiz/submit] quiz_seen_history upsert error:", seenError)
      }
    }

    // Grant XP via canonical RPC (same as education/quizzes route)
    if (xpEarned > 0) {
      const { error: xpError } = await supabase.rpc("add_xp_to_user", {
        p_teen_id: teenId,
        p_xp_amount: xpEarned,
        p_source_type: "quiz",
        p_source_category: quiz.subject,
        p_source_id: quizId,
        p_description: `Quiz reussi: ${quiz.title}`,
      })
      if (xpError) {
        // Don't roll back the attempt — log and continue
        console.error("[teen/quiz/submit] add_xp_to_user error:", xpError)
      }
    }

    // Wave 2 — TICKET-010: capture personalization signal (best-effort, non-blocking).
    //
    // The DB-level `record_signal` RPC enforces a fixed `signal_type` enum
    // ('view'|'click'|'start'|'complete'|'abandon'|'share'|'favorite'|'dismiss'|'report'),
    // so we map the ticket's semantic distinction (quiz_completed vs quiz_attempted)
    // to (complete vs abandon) at the RPC layer and preserve the richer name in
    // metadata.signal_subtype for downstream consumers (recommender / analytics).
    //
    // Tags come straight from the quiz row so the recommender's tag-overlap
    // affinity scoring (see migration 052) can attribute this signal to the
    // canonical interest_taxonomy buckets.
    //
    // Weight scales 0.5-1.0 with score: a perfect pass should reinforce affinity
    // strongly, a marginal-pass or fail should reinforce weakly. Score is 0-100,
    // so weight = 0.5 + (score/100)*0.5, clamped to [0.5, 1.0].
    const signalWeight = Math.min(
      1.0,
      Math.max(0.5, 0.5 + (score / 100) * 0.5),
    )
    const signalSubtype = passed ? "quiz_completed" : "quiz_attempted"
    const quizTags = Array.isArray(quiz.tags) ? (quiz.tags as string[]) : []

    recordSignalAsync({
      teenId,
      signalType: passed ? "complete" : "abandon",
      targetType: "quiz",
      targetId: quizId,
      weight: signalWeight,
      metadata: {
        signal_subtype: signalSubtype,
        score,
        passing_score: passingScore,
        correct_count: correctCount,
        total_questions: questions.length,
        subject: quiz.subject ?? null,
        tags: quizTags,
      },
    })

    // V1.3-A — correlate this attempt with any pending impression for the
    // rollup. Flips status to 'completed' (when passed) or 'rejected'
    // (when failed) and records actual_performance. Window: 7 days,
    // matching the impression's expires_at. Best-effort, non-fatal.
    try {
      const sevenDaysAgo = new Date(
        Date.now() - 7 * 24 * 60 * 60 * 1000,
      ).toISOString()
      const newStatus = passed ? "completed" : "rejected"
      const { error: corrErr } = await supabase
        .from("content_recommendations")
        .update({
          status: newStatus,
          actual_performance: score,
        })
        .eq("teen_id", teenId)
        .eq("content_type", "quiz")
        .eq("content_id", quizId)
        .in("status", ["shown", "accepted"])
        .gte("recommended_at", sevenDaysAgo)
      if (corrErr) {
        console.warn(
          "[teen/quiz/submit] reco correlation failed:",
          corrErr.message,
        )
      }
    } catch (err) {
      console.warn(
        "[teen/quiz/submit] reco correlation threw:",
        (err as Error).message,
      )
    }

    return NextResponse.json({
      success: true,
      attempt: {
        id: attempt.id,
        score,
        passed,
        correctCount,
        totalQuestions: questions.length,
        xpEarned,
        // Anti-farm : retour honnête pour l'écran de fin — pas de faux gain.
        xpAwarded: xpEarned > 0,
        alreadyRewarded,
        results: responseResults,
      },
    })
  } catch (error) {
    console.error("[teen/quiz/submit] unexpected:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
