import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getUserRole } from "@/lib/auth/get-user-role"
import { submitQuizSchema, type QuizQuestion } from "@/lib/quiz/schema"

/**
 * POST /api/teen/quiz/submit
 *
 * Body: { quizId, answers, timeSpentSeconds? }
 *
 * Re-grades the quiz server-side from the canonical answer key, persists a
 * `quiz_attempts` row, and grants XP through the existing `add_xp_to_user`
 * RPC (the same path used by `app/api/teen/education/quizzes/route.ts`).
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

    // Load the quiz answer key
    const { data: quiz, error: quizError } = await supabase
      .from("educational_quizzes")
      .select("id, title, questions, passing_score, xp_reward, subject")
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

    const questions = Array.isArray(quiz.questions)
      ? (quiz.questions as QuizQuestion[])
      : []
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

    const score = Math.round((correctCount / questions.length) * 100)
    const passingScore = quiz.passing_score ?? 60
    const passed = score >= passingScore

    // XP (only when passed); bonus on high scores, mirrors education/quizzes/route.ts
    let xpEarned = 0
    if (passed) {
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
        passed,
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

    return NextResponse.json({
      success: true,
      attempt: {
        id: attempt.id,
        score,
        passed,
        correctCount,
        totalQuestions: questions.length,
        xpEarned,
        results,
      },
    })
  } catch (error) {
    console.error("[teen/quiz/submit] unexpected:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
