/**
 * Quiz server helpers
 * ===================
 * Used by RSC pages to fetch quiz data directly from Supabase, avoiding the
 * detour through HTTP. The /api/teen/quiz/* routes use the same queries —
 * keep them in sync if you change the shape.
 */

import "server-only"
import { createClient } from "@/lib/supabase/server"
import type { Quiz, QuizAttemptRow, QuizCategorySummary, QuizSummary } from "./schema"

export interface DailyQuizPayload {
  quiz: QuizSummary | null
  completedToday: boolean
}

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>

/** Row shape returned by the `recommend_quizzes_for_teen` RPC (migration 173). */
interface AdaptiveQuizRow {
  quiz_id: string
  score: number | null
  reason: string | null
}

/**
 * G3-B — adaptive quiz recommender (migration 173, ⚠️ file-only until applied).
 * Ranks active quizzes by weak subjects (quiz_attempts error history), level-
 * derived difficulty, spaced repetition of failed quizzes (2/4/7-day backoff)
 * and learning_style, excluding already-passed quizzes (0 XP since 169).
 *
 * Try/fallback pattern: while the function is not yet applied in the DB the
 * RPC fails with "function does not exist" (PostgREST PGRST202 / PG 42883) —
 * we swallow that silently and return [] so every caller falls back to the
 * pre-existing selection path unchanged.
 */
async function tryAdaptiveQuizRecommendations(
  supabase: SupabaseServerClient,
  teenId: string,
  limit: number,
): Promise<AdaptiveQuizRow[]> {
  try {
    const { data, error } = await supabase.rpc("recommend_quizzes_for_teen", {
      p_teen_id: teenId,
      p_limit: limit,
    })
    if (error) {
      const notDeployed =
        error.code === "PGRST202" ||
        error.code === "42883" ||
        /does not exist/i.test(error.message ?? "")
      if (!notDeployed) {
        console.warn("[quiz/server] recommend_quizzes_for_teen rpc error:", error.message)
      }
      return []
    }
    if (!Array.isArray(data)) return []
    return (data as unknown[]).filter(
      (r): r is AdaptiveQuizRow =>
        !!r && typeof (r as AdaptiveQuizRow).quiz_id === "string",
    )
  } catch (err) {
    console.warn("[quiz/server] recommend_quizzes_for_teen threw:", (err as Error).message)
    return []
  }
}

/**
 * V1.3-A — persist a served recommendation as an impression so the nightly
 * /api/cron/recommendation-metrics-rollup has a row to count. Best-effort:
 * never breaks the daily-quiz fetch on persistence failure. Shared by the
 * legacy recommend_for_teen path and the G3-B adaptive path (factor keys of
 * both reason formats are parsed).
 */
async function persistQuizImpression(
  supabase: SupabaseServerClient,
  teenId: string,
  quizId: string,
  score: number,
  reason: string,
): Promise<void> {
  try {
    const nowIso = new Date().toISOString()
    const expiresIso = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    const factors: Record<string, number | boolean> = {}
    for (const k of ["aff", "col", "fr", "nov", "ctx", "diff", "weak", "retry", "cool", "style"]) {
      const m = new RegExp(`\\b${k}=(-?[0-9]+(?:\\.[0-9]+)?)`).exec(reason)
      if (m) factors[k] = Number(m[1])
    }
    if (/seen7d=1/.test(reason)) factors.seen7d = true
    if (/\[coldstart\]/.test(reason)) factors.coldstart = true
    if (/\[no-neighbours\]/.test(reason)) factors.no_neighbours = true
    if (/\[lang-fallback\]/.test(reason)) factors.lang_fallback = true

    const { error: impErr } = await supabase
      .from("content_recommendations")
      .upsert(
        [
          {
            teen_id: teenId,
            content_type: "quiz",
            content_id: quizId,
            recommendation_score: Math.max(-99.99, Math.min(99.99, score)),
            confidence_level: null,
            recommendation_factors: factors,
            status: "shown",
            recommended_at: nowIso,
            shown_at: nowIso,
            expires_at: expiresIso,
          },
        ],
        { ignoreDuplicates: true },
      )
    if (impErr) {
      console.warn("[getDailyQuizForTeen] impression persist failed:", impErr.message)
    }
  } catch (err) {
    console.warn("[getDailyQuizForTeen] impression persist threw:", (err as Error).message)
  }
}

export async function getQuizCategoriesForTeen(
  teenId: string,
): Promise<{ categories: QuizCategorySummary[]; quizzesBySubject: Record<string, QuizSummary[]> }> {
  const supabase = await createClient()

  const { data: quizzes } = await supabase
    .from("educational_quizzes")
    .select(
      "id, code, title, description, subject, difficulty, grade_level, questions, time_limit_minutes, passing_score, xp_reward, icon",
    )
    .eq("is_active", true)
    .order("subject", { ascending: true })

  const { data: attempts } = await supabase
    .from("quiz_attempts")
    .select("quiz_id, passed")
    .eq("teen_id", teenId)
    .eq("passed", true)

  const passedSet = new Set((attempts ?? []).map((a) => a.quiz_id))

  // G3-B — mark the adaptive recommendations (migration 173) so the hub can
  // show a "Pour toi" label. Empty set while 173 is not applied → no label.
  const recommendedSet = new Set(
    (await tryAdaptiveQuizRecommendations(supabase, teenId, 5)).map((r) => r.quiz_id),
  )

  const map = new Map<string, QuizCategorySummary>()
  const bySubject: Record<string, QuizSummary[]> = {}

  for (const q of quizzes ?? []) {
    const sum = map.get(q.subject) ?? { id: q.subject, total: 0, completed: 0 }
    sum.total += 1
    if (passedSet.has(q.id)) sum.completed += 1
    map.set(q.subject, sum)

    const summary: QuizSummary = {
      id: q.id,
      code: q.code,
      title: q.title,
      description: q.description,
      subject: q.subject,
      difficulty: q.difficulty,
      grade_level: q.grade_level,
      questions_count: Array.isArray(q.questions) ? q.questions.length : 0,
      time_limit_minutes: q.time_limit_minutes,
      passing_score: q.passing_score,
      xp_reward: q.xp_reward,
      icon: q.icon,
      recommended: recommendedSet.has(q.id),
    }
    if (!bySubject[q.subject]) bySubject[q.subject] = []
    bySubject[q.subject].push(summary)
  }

  return { categories: Array.from(map.values()), quizzesBySubject: bySubject }
}

export async function getRecentQuizAttempts(
  teenId: string,
  limit = 10,
): Promise<Array<QuizAttemptRow & { quiz: { id: string; title: string; subject: string; icon: string | null } | null }>> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("quiz_attempts")
    .select(
      "id, teen_id, quiz_id, score, correct_count, total_questions, passed, xp_earned, time_spent_seconds, completed_at, created_at, quiz:quiz_id(id, title, subject, icon)",
    )
    .eq("teen_id", teenId)
    .order("created_at", { ascending: false })
    .limit(limit)

  // Supabase returns `quiz` as an object when single FK; type assertion to keep TS happy
  return (data ?? []) as unknown as Array<
    QuizAttemptRow & { quiz: { id: string; title: string; subject: string; icon: string | null } | null }
  >
}

export async function getDailyQuizForTeen(teenId: string): Promise<DailyQuizPayload> {
  const supabase = await createClient()

  // TICKET-011 (Q5) — read the teen's primary_language so we can pass it as a
  // filter to recommend_for_teen and the curated fallback. Defaults to 'fr'
  // for V1 when the row has no language set yet.
  const { data: teenLangRow } = await supabase
    .from("teens")
    .select("primary_language")
    .eq("id", teenId)
    .maybeSingle()
  const teenLanguage: string =
    ((teenLangRow as { primary_language?: string | null } | null)?.primary_language as string | null) ?? "fr"

  // G3-B — adaptive-first: weak subjects + level-derived difficulty + spaced
  // repetition of failed quizzes + passed-quiz exclusion (migration 173).
  // Returns [] while 173 is not applied → the legacy path below runs as before.
  let recommendedId: string | null = null
  const adaptiveRows = await tryAdaptiveQuizRecommendations(supabase, teenId, 1)
  if (adaptiveRows.length > 0) {
    recommendedId = adaptiveRows[0].quiz_id
    await persistQuizImpression(
      supabase,
      teenId,
      adaptiveRows[0].quiz_id,
      Number(adaptiveRows[0].score ?? 0),
      adaptiveRows[0].reason ?? "",
    )
  }

  // Wave 1.4 — legacy personalized recommender RPC (kept as fallback while
  // migration 173 is pending, and for teens whose adaptive pool is empty —
  // e.g. every eligible quiz already passed).
  // Falls back to a simple active-quiz query if the RPC errors so the UI never breaks.
  if (!recommendedId) {
    try {
      const { data: recos, error: rpcError } = await supabase.rpc("recommend_for_teen", {
        p_teen_id: teenId,
        p_content_type: "quiz",
        p_n: 1,
        p_language: teenLanguage,
      })
      if (rpcError) {
        console.warn("[getDailyQuizForTeen] recommend_for_teen rpc error:", rpcError.message)
      } else if (Array.isArray(recos) && recos.length > 0) {
        const top = recos[0] as { id?: string; score?: number; reason?: string } | string | null
        let topObj: { id?: string; score?: number; reason?: string } | null = null
        if (top && typeof top === "object" && typeof top.id === "string") {
          topObj = top
          recommendedId = top.id
        } else if (typeof top === "string") {
          try {
            const parsed = JSON.parse(top) as { id?: string; score?: number; reason?: string }
            if (parsed?.id) {
              topObj = parsed
              recommendedId = parsed.id
            }
          } catch {
            // ignore
          }
        }

        if (topObj?.id) {
          await persistQuizImpression(
            supabase,
            teenId,
            topObj.id,
            Number(topObj.score ?? 0),
            typeof topObj.reason === "string" ? topObj.reason : "",
          )
        }
      }
    } catch (err) {
      console.warn("[getDailyQuizForTeen] recommender threw:", (err as Error).message)
    }
  }

  // Fallback: if RPC returned nothing (e.g. all quizzes recently seen) pick the lowest-id
  // active quiz the teen has NOT seen in the last 7 days. TICKET-011 (Q5):
  // prefer rows matching the teen's primary_language; if that yields nothing
  // (FR-only DB today), drop the language filter so the UI never receives an
  // empty payload (whitepaper §29.9 invariant).
  if (!recommendedId) {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const { data: seen } = await supabase
      .from("quiz_seen_history")
      .select("quiz_id")
      .eq("teen_id", teenId)
      .gte("last_seen", sevenDaysAgo)
    const seenIds = new Set((seen ?? []).map((r) => r.quiz_id))

    const { data: poolLang } = await supabase
      .from("educational_quizzes")
      .select("id")
      .eq("is_active", true)
      .eq("language", teenLanguage)
      .order("id", { ascending: true })
    let fresh = (poolLang ?? []).find((q) => !seenIds.has(q.id))

    if (!fresh) {
      const { data: poolAny } = await supabase
        .from("educational_quizzes")
        .select("id")
        .eq("is_active", true)
        .order("id", { ascending: true })
      fresh = (poolAny ?? []).find((q) => !seenIds.has(q.id))
    }
    recommendedId = fresh?.id ?? null
  }

  // TICKET-004 — Wave 2: when even the broad active-quiz pool is exhausted
  // (all 7-day-burned, or `educational_quizzes` itself is empty), reach into
  // `curated_content_library` (30 admin-vetted entries seeded in V1.2 by
  // migration 067) via the `get_curated_content_fallback` RPC. The library
  // was unreachable from the teen runner before this wave — dead inventory.
  //
  // Mapping strategy: a curated row is a JSONB `content_data` payload, NOT an
  // `educational_quizzes` row. Surfacing its UUID directly would break
  // downstream FKs — `quiz_attempts.quiz_id`, `quiz_seen_history.quiz_id` and
  // the `/teen/quiz/[id]` runner all read from `educational_quizzes`. So we
  // materialize the curated payload into `educational_quizzes` ON CONFLICT
  // (code) DO UPDATE — idempotent, one materialized row per curated entry —
  // and use the resulting id downstream. Subsequent teens hitting the same
  // curated entry reuse the same materialized row.
  //
  // 7-day no-repeat invariant (whitepaper §29.9): the burn now happens in
  // POST /api/teen/quiz/[id]/start (Q3 / TICKET-009), so here we only READ
  // `quiz_seen_history` to skip recently-burned curated rows.
  if (!recommendedId) {
    let teenGrade: string | null = null
    try {
      const { data: t } = await supabase
        .from("teens")
        .select("grade_level")
        .eq("id", teenId)
        .maybeSingle()
      teenGrade = (t as { grade_level?: string | null } | null)?.grade_level ?? null
    } catch {
      // ignore — fallback still works without grade context
    }

    try {
      const { data: curatedRows, error: curatedErr } = await supabase.rpc(
        "get_curated_content_fallback",
        {
          p_content_type: "quiz",
          p_category: undefined,
          p_grade_level: teenGrade ?? undefined,
          p_limit: 5,
        },
      )
      if (curatedErr) {
        console.warn("[getDailyQuizForTeen] curated fallback rpc error:", curatedErr.message)
      } else if (Array.isArray(curatedRows) && curatedRows.length > 0) {
        const sevenDaysAgo2 = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
        const { data: seen2 } = await supabase
          .from("quiz_seen_history")
          .select("quiz_id")
          .eq("teen_id", teenId)
          .gte("last_seen", sevenDaysAgo2)
        const seenSet = new Set((seen2 ?? []).map((r) => r.quiz_id))

        type CuratedRow = {
          id: string
          content_type: string
          content_data: Record<string, unknown>
          title: string | null
          match_score: number | null
        }
        type CuratedQuizPayload = {
          title?: string
          description?: string
          subject?: string
          difficulty?: string
          grade_level?: string
          questions?: unknown[]
          time_limit_minutes?: number
          passing_score?: number
          xp_reward?: number
        }

        for (const row of curatedRows as CuratedRow[]) {
          const payload = (row?.content_data ?? {}) as CuratedQuizPayload
          // Deterministic code so re-materialization is idempotent across teens.
          const code = `curated_${row.id.replace(/-/g, "").slice(0, 16)}`

          const { data: upserted, error: upErr } = await supabase
            .from("educational_quizzes")
            .upsert(
              {
                code,
                title: payload.title ?? row.title ?? "Quiz",
                description: payload.description ?? null,
                subject: payload.subject ?? "Général",
                difficulty: payload.difficulty ?? "normal",
                grade_level: payload.grade_level ?? null,
                questions: Array.isArray(payload.questions) ? payload.questions : [],
                time_limit_minutes: payload.time_limit_minutes ?? 10,
                passing_score: payload.passing_score ?? 60,
                xp_reward: payload.xp_reward ?? 30,
                icon: "book-open",
                is_active: true,
                updated_at: new Date().toISOString(),
              },
              { onConflict: "code" },
            )
            .select("id")
            .maybeSingle()

          if (upErr) {
            console.warn("[getDailyQuizForTeen] curated materialize error:", upErr.message)
            continue
          }
          const materializedId = (upserted as { id?: string } | null)?.id
          if (materializedId && !seenSet.has(materializedId)) {
            recommendedId = materializedId
            break
          }
        }
      }
    } catch (err) {
      console.warn("[getDailyQuizForTeen] curated fallback threw:", (err as Error).message)
    }
  }

  if (!recommendedId) return { quiz: null, completedToday: false }

  const { data: today } = await supabase
    .from("educational_quizzes")
    .select(
      "id, code, title, description, subject, difficulty, grade_level, questions, time_limit_minutes, passing_score, xp_reward, icon",
    )
    .eq("id", recommendedId)
    .eq("is_active", true)
    .maybeSingle()

  if (!today) return { quiz: null, completedToday: false }

  // TICKET-009 — DO NOT burn the no-repeat slot on impression.
  // The seen_history upsert now lives in POST /api/teen/quiz/[id]/start,
  // fired by quiz-runner-client when the user actually starts the quiz.
  // (whitepaper §29.9 invariant — no quiz repeats within 7 days)

  const startOfDay = new Date()
  startOfDay.setUTCHours(0, 0, 0, 0)
  const { data: attempt } = await supabase
    .from("quiz_attempts")
    .select("id")
    .eq("teen_id", teenId)
    .eq("quiz_id", today.id)
    .gte("created_at", startOfDay.toISOString())
    .limit(1)
    .maybeSingle()

  return {
    quiz: {
      id: today.id,
      code: today.code,
      title: today.title,
      description: today.description,
      subject: today.subject,
      difficulty: today.difficulty,
      grade_level: today.grade_level,
      questions_count: Array.isArray(today.questions) ? today.questions.length : 0,
      time_limit_minutes: today.time_limit_minutes,
      passing_score: today.passing_score,
      xp_reward: today.xp_reward,
      icon: today.icon,
    },
    completedToday: Boolean(attempt),
  }
}

export async function getQuizById(id: string): Promise<Quiz | null> {
  const supabase = await createClient()
  const { data: quiz } = await supabase
    .from("educational_quizzes")
    .select(
      "id, code, title, description, subject, difficulty, grade_level, questions, time_limit_minutes, passing_score, xp_reward, icon",
    )
    .eq("id", id)
    .eq("is_active", true)
    .maybeSingle()

  if (!quiz) return null
  return {
    id: quiz.id,
    code: quiz.code,
    title: quiz.title,
    description: quiz.description,
    subject: quiz.subject,
    difficulty: quiz.difficulty,
    grade_level: quiz.grade_level,
    questions: Array.isArray(quiz.questions) ? (quiz.questions as Quiz["questions"]) : [],
    time_limit_minutes: quiz.time_limit_minutes,
    passing_score: quiz.passing_score,
    xp_reward: quiz.xp_reward,
    icon: quiz.icon,
  }
}

export async function getTeenQuizStats(
  teenId: string,
): Promise<{ totalCompleted: number; averageScore: number; totalXpEarned: number; perfectCount: number }> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("quiz_attempts")
    .select("score, xp_earned, passed")
    .eq("teen_id", teenId)
    .not("completed_at", "is", null)

  const rows = data ?? []
  if (rows.length === 0) {
    return { totalCompleted: 0, averageScore: 0, totalXpEarned: 0, perfectCount: 0 }
  }
  const totalCompleted = rows.length
  const averageScore = Math.round(rows.reduce((s, r) => s + (r.score ?? 0), 0) / totalCompleted)
  const totalXpEarned = rows.reduce((s, r) => s + (r.xp_earned ?? 0), 0)
  const perfectCount = rows.filter((r) => (r.score ?? 0) === 100).length
  return { totalCompleted, averageScore, totalXpEarned, perfectCount }
}
