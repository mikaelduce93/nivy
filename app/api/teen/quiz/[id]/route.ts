import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getUserRole } from "@/lib/auth/get-user-role"
import { z } from "zod"
import type { Quiz } from "@/lib/quiz/schema"

const paramsSchema = z.object({
  id: z.string().uuid("ID de quiz invalide"),
})

/**
 * GET /api/teen/quiz/[id]
 *
 * Fetch a single quiz with its questions (for the taking-quiz page).
 * IMPORTANT: returns the `correct` index too — the answer key is necessary
 * for the existing `educational_quizzes`-style scoring done client-side
 * during the run; the server re-validates on submit.
 */
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const userInfo = await getUserRole()
    if (!userInfo || userInfo.role !== "teen" || !userInfo.teenData?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const params = await context.params
    const validation = paramsSchema.safeParse(params)
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 },
      )
    }

    const supabase = await createClient()

    const { data: quiz, error } = await supabase
      .from("educational_quizzes")
      .select(
        "id, code, title, description, subject, difficulty, grade_level, questions, time_limit_minutes, passing_score, xp_reward, icon, is_active",
      )
      .eq("id", validation.data.id)
      .eq("is_active", true)
      .maybeSingle()

    if (error) {
      console.error("[teen/quiz/[id]] fetch error:", error)
      return NextResponse.json({ error: "Failed to fetch quiz" }, { status: 500 })
    }

    if (!quiz) {
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 })
    }

    const result: Quiz = {
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

    return NextResponse.json({ quiz: result })
  } catch (error) {
    console.error("[teen/quiz/[id]] unexpected:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
