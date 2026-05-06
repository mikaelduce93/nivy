import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getUserRole } from "@/lib/auth/get-user-role"
import type { QuizCategorySummary, QuizSummary } from "@/lib/quiz/schema"

/**
 * GET /api/teen/quiz/categories
 *
 * Returns the list of subjects (categories) backed by `educational_quizzes`,
 * each with the total quiz count and how many distinct quizzes the current
 * teen has passed at least once. Optionally returns the quizzes for one
 * subject when `?subject=...` is provided.
 *
 * Response: { categories: QuizCategorySummary[]; quizzes?: QuizSummary[] }
 */
export async function GET(request: NextRequest) {
  try {
    const userInfo = await getUserRole()
    if (!userInfo || userInfo.role !== "teen" || !userInfo.teenData?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const teenId = userInfo.teenData.id
    const supabase = await createClient()
    const subject = request.nextUrl.searchParams.get("subject")

    // Fetch all active quizzes (lightweight - no questions payload)
    const { data: quizzes, error } = await supabase
      .from("educational_quizzes")
      .select(
        "id, code, title, description, subject, difficulty, grade_level, questions, time_limit_minutes, passing_score, xp_reward, icon",
      )
      .eq("is_active", true)
      .order("subject", { ascending: true })

    if (error) {
      console.error("[teen/quiz/categories] fetch error:", error)
      return NextResponse.json({ error: "Failed to fetch categories" }, { status: 500 })
    }

    // Fetch teen's passed attempts to count progress per subject
    const { data: attempts } = await supabase
      .from("quiz_attempts")
      .select("quiz_id, passed")
      .eq("teen_id", teenId)
      .eq("passed", true)

    const passedQuizIds = new Set((attempts ?? []).map((a) => a.quiz_id))

    // Aggregate categories
    const map = new Map<string, QuizCategorySummary>()
    for (const q of quizzes ?? []) {
      const sum = map.get(q.subject) ?? { id: q.subject, total: 0, completed: 0 }
      sum.total += 1
      if (passedQuizIds.has(q.id)) sum.completed += 1
      map.set(q.subject, sum)
    }

    const categories = Array.from(map.values())

    // Build the lightweight per-subject quiz list when requested
    let filteredQuizzes: QuizSummary[] | undefined
    if (subject) {
      filteredQuizzes = (quizzes ?? [])
        .filter((q) => q.subject === subject)
        .map<QuizSummary>((q) => ({
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
        }))
    }

    return NextResponse.json({
      categories,
      quizzes: filteredQuizzes,
    })
  } catch (error) {
    console.error("[teen/quiz/categories] unexpected:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
