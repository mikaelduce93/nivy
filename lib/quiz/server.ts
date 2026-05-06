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

  const { data: pool } = await supabase
    .from("educational_quizzes")
    .select(
      "id, code, title, description, subject, difficulty, grade_level, questions, time_limit_minutes, passing_score, xp_reward, icon",
    )
    .eq("is_active", true)
    .order("id", { ascending: true })

  if (!pool || pool.length === 0) return { quiz: null, completedToday: false }

  const dayIndex = Math.floor(Date.now() / (1000 * 60 * 60 * 24))
  const today = pool[dayIndex % pool.length]

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
