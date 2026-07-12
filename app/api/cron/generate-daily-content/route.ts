/**
 * Cron Job: Generate Daily Content
 *
 * V1.1 P2.4 (D2) — improvements:
 *   - Cohort-aware teen selection (grade_level / school_type / curriculum / primary_language).
 *     Replaces the previous query that referenced non-existent columns
 *     (`interests`, `profiles`, `school`) and crashed silently.
 *   - Interests sourced from `teen_interests` (the canonical taxonomy table from
 *     personalization-engine.md §2.1, populated at onboarding).
 *   - Quiz/mission generation now passes proper cohort context (grade_level,
 *     curriculum, language, top interests) to the AI generator so prompts are
 *     personalized — not flat.
 *   - Every generated payload runs through `checkContentSafety()` inside the
 *     generator (lib/ai/content-safety.ts) before it lands in DB.
 *
 * Moderation queue (audit 2026-07-11 Q1 — P0 minor safety):
 *   AI-generated quizzes and missions are inserted with `is_active: false` and
 *   a `DAILY_` code prefix — NEVER live by default. Quizzes go live only after
 *   human approval in /admin/content/review (POST /api/admin/content/review/:id
 *   flips is_active=true; reject archives the row under a REJECTED_ prefix).
 *   Until approval, teens are served from the manually seeded active bank:
 *   RLS ("Everyone can view active quizzes", 022_pillars_system.sql:1287),
 *   `recommend_for_teen` v2 and every lib/quiz/server.ts query all filter
 *   is_active=true, so pending content is unreachable.
 */

import { createHash } from "node:crypto"
import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import {
  ContentGenerator,
  type GenerationParams,
  type GeneratedQuiz,
} from "@/lib/ai/content-generator"
import { checkContentSafety } from "@/lib/ai/content-safety"

// ----- Cohort model ---------------------------------------------------------

interface TeenRow {
  id: string
  grade_level: string | null
  school_type: string | null
  curriculum: string | null
  primary_language: string | null
}

interface InterestRow {
  teen_id: string
  tag: string
}

interface CohortKey {
  grade_level: string
  school_type: string
  curriculum: string
  language: string
}

interface Cohort {
  key: CohortKey
  teenCount: number
  topInterests: string[]
}

function cohortId(k: CohortKey): string {
  return [k.grade_level, k.school_type, k.curriculum, k.language]
    .map((s) => (s || "_").replace(/[^A-Za-z0-9_-]/g, "_"))
    .join("|")
}

function buildCohorts(teens: TeenRow[], interests: InterestRow[]): Cohort[] {
  // Group teens by (grade_level, school_type, curriculum, primary_language).
  const byKey = new Map<string, { key: CohortKey; teenIds: Set<string> }>()
  for (const t of teens) {
    const key: CohortKey = {
      grade_level: t.grade_level || "unknown",
      school_type: t.school_type || "unknown",
      curriculum: t.curriculum || "unknown",
      language: t.primary_language || "french",
    }
    const id = cohortId(key)
    const bucket = byKey.get(id)
    if (bucket) {
      bucket.teenIds.add(t.id)
    } else {
      byKey.set(id, { key, teenIds: new Set([t.id]) })
    }
  }

  // Map teen_id -> cohortId so we can roll interest tags up by cohort.
  const teenToCohort = new Map<string, string>()
  for (const [id, b] of byKey.entries()) {
    for (const teenId of b.teenIds) teenToCohort.set(teenId, id)
  }

  const tagCounts = new Map<string, Map<string, number>>()
  for (const i of interests) {
    const cohort = teenToCohort.get(i.teen_id)
    if (!cohort) continue
    let inner = tagCounts.get(cohort)
    if (!inner) {
      inner = new Map<string, number>()
      tagCounts.set(cohort, inner)
    }
    inner.set(i.tag, (inner.get(i.tag) || 0) + 1)
  }

  const cohorts: Cohort[] = []
  for (const [id, b] of byKey.entries()) {
    const inner = tagCounts.get(id)
    const topInterests = inner
      ? [...inner.entries()].sort((a, c) => c[1] - a[1]).slice(0, 5).map(([tag]) => tag)
      : []
    cohorts.push({
      key: b.key,
      teenCount: b.teenIds.size,
      topInterests,
    })
  }

  // Stable order: largest cohort first.
  cohorts.sort((a, b) => b.teenCount - a.teenCount)
  return cohorts
}

// ----- Subject mapping (cohort -> AI generation params) --------------------

function subjectForCohort(cohort: Cohort): string {
  // Light heuristic — use the most popular interest as a hint, otherwise
  // pivot to a curriculum-aware default. The full content-aware mapping
  // belongs to `recommend_for_teen`, but for batch daily generation a single
  // representative subject per cohort is sufficient.
  const interest = cohort.topInterests[0]
  if (interest) {
    if (interest.startsWith("academic_math")) return "Mathématiques"
    if (interest.startsWith("academic_history")) return "Histoire"
    if (interest.startsWith("academic_geography")) return "Géographie"
    if (interest.startsWith("academic_languages")) return "Français"
    if (interest.startsWith("academic_philosophy")) return "Philosophie"
    if (interest.startsWith("science_")) return "Sciences"
    if (interest.startsWith("sport_")) return "Sciences" // physiologie, nutrition
    if (interest.startsWith("art_")) return "Français"
    if (interest.startsWith("tech_")) return "Sciences"
  }
  return "Mathématiques"
}

function categoryForCohort(cohort: Cohort): string {
  const top = cohort.topInterests[0] || ""
  if (top.startsWith("sport_")) return "sport"
  if (top.startsWith("academic_")) return "school"
  if (top.startsWith("art_")) return "creativity"
  if (top.startsWith("social_")) return "participation"
  return "general"
}

// ----- Code + structural validation helpers ---------------------------------

/**
 * Compact unique code for a generated row. Both `educational_quizzes.code`
 * and `mission_templates.code` are VARCHAR(50) (022_pillars_system.sql:111,
 * 003_missions_system.sql:19); the previous format
 * `DAILY_${today}_${cohortLabel}_${Date.now()}` overflowed 50 chars for most
 * real cohorts, so the insert failed (22001) and the moderation queue starved.
 * The full cohort label still lands in the `cohort_key` column — the code only
 * needs the DAILY_ prefix (moderation-queue convention) and uniqueness.
 * Length: 6 + 10 + 1 + 8 + 1 + ~9 = ~35 chars.
 */
function dailyCode(today: string, cohortLabel: string): string {
  const cohortHash = createHash("sha1").update(cohortLabel).digest("hex").slice(0, 8)
  return `DAILY_${today}_${cohortHash}_${Date.now().toString(36)}`
}

/**
 * Minimal structural gate before queueing a quiz for review (audit 2026-07-11).
 * The teen runner scores `userAnswer === q.correct` with integer answers
 * indexed into `options` (app/api/teen/quiz/submit/route.ts:70,
 * lib/quiz/schema.ts submitQuizSchema). A question without ≥2 options or with
 * an out-of-range `correct` would be unplayable or always-wrong — keep it out
 * of the moderation queue entirely. Returns a reason string, or null if OK.
 */
function quizStructureError(quiz: GeneratedQuiz): string | null {
  if (!Array.isArray(quiz.questions) || quiz.questions.length === 0) {
    return "no questions"
  }
  for (let i = 0; i < quiz.questions.length; i++) {
    const q = quiz.questions[i]
    if (typeof q.question !== "string" || q.question.trim() === "") {
      return `question ${i + 1}: missing text`
    }
    if (!Array.isArray(q.options) || q.options.length < 2) {
      return `question ${i + 1}: fewer than 2 options`
    }
    if (q.options.some((o) => typeof o !== "string" || o.trim() === "")) {
      return `question ${i + 1}: empty or non-string option`
    }
    if (
      typeof q.correct !== "number" ||
      !Number.isInteger(q.correct) ||
      q.correct < 0 ||
      q.correct >= q.options.length
    ) {
      return `question ${i + 1}: correct index missing or out of range`
    }
  }
  return null
}

// ----- Route ---------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    // Cron auth — fail-closed.
    const authHeader = request.headers.get("authorization")
    const cronSecret = process.env.CRON_SECRET
    const isVercelCron = request.headers.get("x-vercel-cron") !== null

    if (!isVercelCron) {
      if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }
    }

    // J0 (spec G4 §3.0) : client service-role — ce cron tournait sur le client
    // serveur anon (aucune session sur une requête Vercel Cron), donc ses
    // écritures `educational_quizzes`/`mission_templates` dépendaient de
    // grants anon, et le RETURNING de l'insert quiz aurait cassé une fois la
    // colonne `questions` verrouillée par la migration 180 (REVOKE SELECT
    // anon/authenticated ; service_role garde tout). Même pattern que les
    // autres crons (ex. tag-normalize). La route reste gated CRON_SECRET.
    const supabase = createServiceRoleClient()
    const today = new Date().toISOString().split("T")[0]

    // Idempotency — if today already finished, short-circuit.
    const { data: existingSchedule } = await supabase
      .from("daily_content_schedule")
      .select("*")
      .eq("target_date", today)
      .single()

    if (existingSchedule?.status === "completed") {
      return NextResponse.json({
        message: "Content already generated for today",
        schedule: existingSchedule,
      })
    }

    await supabase
      .from("daily_content_schedule")
      .upsert({
        target_date: today,
        status: "generating",
        started_at: new Date().toISOString(),
      })
      .select()
      .single()

    // ---- Cohort-aware teen selection ----
    // We fetch real columns only. `interests` lives in `teen_interests`,
    // not on the teens row.
    const { data: teensData, error: teensError } = await supabase
      .from("teens")
      .select("id, grade_level, school_type, curriculum, primary_language")
      .limit(500)

    if (teensError || !teensData) {
      throw new Error(`Failed to fetch teens: ${teensError?.message ?? "unknown"}`)
    }
    const teens = teensData as unknown as TeenRow[]

    // Pull interests for the active teen set in a single query.
    const teenIds = teens.map((t) => t.id)
    let interestRows: InterestRow[] = []
    if (teenIds.length > 0) {
      const { data: rawInterests, error: interestsError } = await supabase
        .from("teen_interests")
        .select("teen_id, tag")
        .in("teen_id", teenIds)
      if (interestsError) {
        // teen_interests table may not yet exist in installations that lag the
        // personalization-engine migration. Don't crash — just continue with
        // empty interests so we still group by curriculum / grade.
        console.warn(
          "[cron/generate-daily-content] teen_interests fetch failed:",
          interestsError.message,
        )
      } else if (rawInterests) {
        interestRows = rawInterests as unknown as InterestRow[]
      }
    }

    const cohorts = buildCohorts(teens, interestRows)

    // Cap fan-out: never generate for more than 12 cohorts per run to
    // protect token spend.
    const targetCohorts = cohorts.slice(0, 12)

    const provider = (process.env.AI_PROVIDER as "openai" | "claude") || "openai"
    const generator = new ContentGenerator(provider)

    const generationLog: Array<Record<string, unknown>> = []
    let generatedCount = 0
    let failedCount = 0
    let safetyBlockedCount = 0

    for (const cohort of targetCohorts) {
      const cohortLabel = cohortId(cohort.key)
      const subject = subjectForCohort(cohort)
      const category = categoryForCohort(cohort)

      // ---- Quiz ----
      try {
        const quizParams: GenerationParams = {
          contentType: "quiz",
          category,
          subject,
          gradeLevel: cohort.key.grade_level !== "unknown" ? cohort.key.grade_level : undefined,
          difficulty: "normal",
          interests: cohort.topInterests,
          count: 1,
        }

        const quiz = await generator.generateQuiz(quizParams, undefined)
        if (!quiz) {
          failedCount++
        } else {
          // Defense-in-depth: re-check safety on the final payload right
          // before we touch the DB. The generator already filters, but this
          // belt-and-suspenders gate stops a bad quiz from a stale fallback
          // cache landing in `educational_quizzes`.
          const safety = checkContentSafety(quiz)
          if (!safety.isSafe) {
            safetyBlockedCount++
            generationLog.push({
              type: "quiz",
              cohort: cohortLabel,
              status: "blocked_by_safety",
              reason: safety.reason,
            })
          } else {
            const structureError = quizStructureError(quiz)
            if (structureError) {
              failedCount++
              generationLog.push({
                type: "quiz",
                cohort: cohortLabel,
                status: "blocked_by_schema",
                reason: structureError,
              })
            } else {
              // TICKET-007: stamp cohort_key + cohort dimensions so the
              // recommender (recommend_for_teen v2) only surfaces this quiz
              // to teens whose (grade, school_type, curriculum, language)
              // matches. cohortLabel is already the cohortId() value.
              //
              // Audit 2026-07-11 Q1: is_active=false — the quiz enters the
              // human moderation queue (/admin/content/review) and only goes
              // live once an admin approves it.
              const { data: savedQuiz, error: quizError } = await supabase
                .from("educational_quizzes")
                .insert({
                  code: dailyCode(today, cohortLabel),
                  title: quiz.title,
                  description: quiz.description,
                  subject: quiz.subject,
                  difficulty: quiz.difficulty,
                  grade_level: quiz.grade_level,
                  school_type:
                    cohort.key.school_type !== "unknown" ? cohort.key.school_type : null,
                  curriculum:
                    cohort.key.curriculum !== "unknown" ? cohort.key.curriculum : null,
                  language: cohort.key.language,
                  cohort_key: cohortLabel,
                  questions: quiz.questions,
                  time_limit_minutes: quiz.time_limit_minutes,
                  passing_score: quiz.passing_score,
                  xp_reward: quiz.xp_reward,
                  is_active: false,
                })
                .select()
                .single()

              if (!quizError && savedQuiz) {
                generatedCount++
                generationLog.push({
                  type: "quiz",
                  id: savedQuiz.id,
                  cohort: cohortLabel,
                  cohort_size: cohort.teenCount,
                  status: "pending_review",
                })
              } else {
                failedCount++
              }
            }
          }
        }
      } catch (error) {
        console.error(`[cron/generate-daily-content] quiz error for ${cohortLabel}:`, error)
        failedCount++
      }

      // ---- Mission ----
      try {
        const missionParams: GenerationParams = {
          contentType: "mission",
          category,
          gradeLevel: cohort.key.grade_level !== "unknown" ? cohort.key.grade_level : undefined,
          difficulty: "normal",
          interests: cohort.topInterests,
          count: 1,
        }

        const mission = await generator.generateMission(missionParams)
        if (!mission) {
          failedCount++
        } else {
          const safety = checkContentSafety(mission)
          if (!safety.isSafe) {
            safetyBlockedCount++
            generationLog.push({
              type: "mission",
              cohort: cohortLabel,
              status: "blocked_by_safety",
              reason: safety.reason,
            })
          } else {
            // Audit 2026-07-11 Q1: is_active=false — AI content is never live
            // by default. NOTE: there is no mission review UI yet (the admin
            // queue at /admin/content/review only covers quizzes); pending AI
            // missions stay inactive until a reviewer activates them. Teens
            // keep being served the manually seeded active mission bank
            // (recommend_for_teen v2 and assign-missions filter is_active).
            const { data: savedMission, error: missionError } = await supabase
              .from("mission_templates")
              .insert({
                code: dailyCode(today, cohortLabel),
                name: mission.name,
                description: mission.description,
                mission_type: mission.mission_type,
                category: mission.category,
                objective_type: mission.objective_type,
                objective_target: mission.objective_target,
                xp_reward: mission.xp_reward,
                difficulty: mission.difficulty,
                is_active: false,
              })
              .select()
              .single()

            if (!missionError && savedMission) {
              generatedCount++
              generationLog.push({
                type: "mission",
                id: savedMission.id,
                cohort: cohortLabel,
                cohort_size: cohort.teenCount,
                status: "pending_review",
              })
            } else {
              failedCount++
            }
          }
        }
      } catch (error) {
        console.error(`[cron/generate-daily-content] mission error for ${cohortLabel}:`, error)
        failedCount++
      }
    }

    const finalStatus =
      generatedCount === 0 && failedCount > 0
        ? "failed"
        : generatedCount > 0 && failedCount === 0
          ? "completed"
          : "partial"

    await supabase
      .from("daily_content_schedule")
      .update({
        status: finalStatus,
        generated_count: generatedCount,
        failed_count: failedCount,
        generation_log: generationLog,
        completed_at: new Date().toISOString(),
      })
      .eq("target_date", today)

    return NextResponse.json({
      success: true,
      message: "Daily content generated and queued for human review",
      cohorts: targetCohorts.length,
      total_teens: teens.length,
      generated: generatedCount,
      failed: failedCount,
      safety_blocked: safetyBlockedCount,
      log: generationLog,
    })
  } catch (error) {
    console.error("Error in daily content generation:", error)
    return NextResponse.json(
      {
        error: "Failed to generate daily content",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

/**
 * GET /api/cron/generate-daily-content
 * Status check.
 */
export async function GET(_request: NextRequest) {
  try {
    // GET (status public, non gated) : on GARDE le client anon — passer au
    // service-role élargirait la surface pré-auth (canon V8), et cette lecture
    // de daily_content_schedule n'est pas concernée par la migration 180.
    const supabase = await createClient()
    const today = new Date().toISOString().split("T")[0]

    const { data: schedule, error } = await supabase
      .from("daily_content_schedule")
      .select("*")
      .eq("target_date", today)
      .single()

    if (error && error.code !== "PGRST116") {
      return NextResponse.json({ error: "Failed to fetch schedule" }, { status: 500 })
    }

    return NextResponse.json({
      today,
      schedule: schedule || null,
      status: schedule?.status || "not_started",
    })
  } catch {
    return NextResponse.json({ error: "Failed to check status" }, { status: 500 })
  }
}
