import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getQuizAnswerKey, getQuizQuestionCounts } from "@/lib/quiz/server"

/**
 * GET /api/teen/education/quizzes
 * Fetch available quizzes with optional filters
 *
 * J0 (spec G4 §3.0, migration 180) : cette route renvoyait le JSONB
 * `questions` brut (clé `correct` incluse) au client. Elle sert désormais
 * les métadonnées + `questions_count` — les énoncés se prennent via
 * /api/teen/quiz/[id] (payload strippé), la correction via le submit.
 *
 * Query params:
 * - teenId: UUID of the teen (required)
 * - subject: Filter by subject (optional)
 * - difficulty: Filter by difficulty (optional)
 * - gradeLevel: Filter by grade level (optional)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const teenId = searchParams.get("teenId")
    const subject = searchParams.get("subject")
    const difficulty = searchParams.get("difficulty")
    const gradeLevel = searchParams.get("gradeLevel")

    if (!teenId) {
      return NextResponse.json(
        { error: "teenId is required" },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Verify authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Build query — colonnes explicites, SANS `questions` (clé de réponses,
    // verrouillée par la migration 180).
    let query = supabase
      .from("educational_quizzes")
      .select(
        "id, code, title, description, subject, difficulty, grade_level, time_limit_minutes, passing_score, xp_reward, icon, is_active, created_at",
      )
      .eq("is_active", true)
      .order("created_at", { ascending: false })

    if (subject) {
      query = query.eq("subject", subject)
    }
    if (difficulty) {
      query = query.eq("difficulty", difficulty)
    }
    if (gradeLevel) {
      query = query.eq("grade_level", gradeLevel)
    }

    const { data: quizzes, error } = await query

    if (error) {
      console.error("Error fetching quizzes:", error)
      return NextResponse.json(
        { error: "Failed to fetch quizzes" },
        { status: 500 }
      )
    }

    const questionCounts = await getQuizQuestionCounts(supabase)

    // Get teen's quiz attempts to show completion status
    const { data: attempts } = await supabase
      .from("quiz_attempts")
      .select("quiz_id, score, passed, created_at")
      .eq("teen_id", teenId)
      .order("created_at", { ascending: false })

    // Map attempts to quizzes
    const quizzesWithProgress = quizzes?.map((quiz) => {
      const quizAttempts = attempts?.filter((a) => a.quiz_id === quiz.id) || []
      const bestAttempt = quizAttempts.reduce(
        (best, curr) => (curr.score > (best?.score || 0) ? curr : best),
        null as typeof quizAttempts[0] | null
      )

      return {
        ...quiz,
        // J0 : `questions` (clé de réponses) ne sort plus — le compteur suffit
        // aux listes (RPC 180, fallback pré-180 dans lib/quiz/server.ts).
        questions_count: questionCounts.get(quiz.id) ?? 0,
        attempts_count: quizAttempts.length,
        best_score: bestAttempt?.score || null,
        passed: bestAttempt?.passed || false,
        last_attempt: quizAttempts[0]?.created_at || null,
      }
    })

    return NextResponse.json({
      success: true,
      quizzes: quizzesWithProgress,
    })
  } catch (error) {
    console.error("Unexpected error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

/**
 * POST /api/teen/education/quizzes
 * Submit a quiz attempt
 *
 * Body:
 * - teenId: UUID of the teen
 * - quizId: UUID of the quiz
 * - answers: Array of answer indices
 * - timeSpent: Time spent in seconds
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { teenId, quizId, answers, timeSpent } = body

    if (!teenId || !quizId || !answers) {
      return NextResponse.json(
        { error: "teenId, quizId, and answers are required" },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Verify authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Get quiz details — colonnes explicites, SANS `questions` (J0 : la
    // colonne est verrouillée pour authenticated par la migration 180, et un
    // `select("*")` PostgREST échouerait en 42501 une fois la 180 appliquée).
    const { data: quiz, error: quizError } = await supabase
      .from("educational_quizzes")
      .select("id, title, passing_score, xp_reward")
      .eq("id", quizId)
      .single()

    if (quizError || !quiz) {
      return NextResponse.json(
        { error: "Quiz not found" },
        { status: 404 }
      )
    }

    // Answer key — server-side scoring only (J0) : lecture authenticated
    // pré-180, bascule service-role une fois la colonne verrouillée.
    const questions = await getQuizAnswerKey(supabase, quizId)
    if (!questions || questions.length === 0) {
      return NextResponse.json(
        { error: "Quiz not found" },
        { status: 404 }
      )
    }

    let correctCount = 0
    const results = questions.map((q, index) => {
      const userAnswer = answers[index]
      const isCorrect = userAnswer === q.correct
      if (isCorrect) correctCount++
      return {
        question: q.question,
        userAnswer,
        correctAnswer: q.correct,
        isCorrect,
      }
    })

    const score = Math.round((correctCount / questions.length) * 100)
    const passed = score >= (quiz.passing_score || 60)

    // Anti-farm (audit 2026-07-11 Q4) — même garde que /api/teen/quiz/submit :
    // l'XP n'est crédité qu'à la PREMIÈRE réussite ; les rejeux sont
    // enregistrés (entraînement) mais rapportent 0 XP.
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
        console.error(
          "[education/quizzes] prior-reward check error:",
          priorRewardError,
        )
      }
      alreadyRewarded = Boolean(priorReward)
    }

    // Calculate XP earned (first pass only)
    let xpEarned = 0
    if (passed && !alreadyRewarded) {
      xpEarned = quiz.xp_reward || 50
      // Bonus for high scores
      if (score >= 90) xpEarned = Math.round(xpEarned * 1.5)
      else if (score >= 80) xpEarned = Math.round(xpEarned * 1.25)
    }

    // Save attempt
    const { data: attempt, error: attemptError } = await supabase
      .from("quiz_attempts")
      .insert({
        teen_id: teenId,
        quiz_id: quizId,
        score,
        answers: results,
        correct_count: correctCount,
        total_questions: questions.length,
        completed_at: new Date().toISOString(),
        time_spent_seconds: timeSpent || null,
        xp_earned: xpEarned,
      })
      .select()
      .single()

    if (attemptError) {
      console.error("Error saving attempt:", attemptError)
      return NextResponse.json(
        { error: "Failed to save quiz attempt" },
        { status: 500 }
      )
    }

    // Award XP if passed
    if (xpEarned > 0) {
      await supabase.rpc("add_xp_to_user", {
        p_teen_id: teenId,
        p_xp_amount: xpEarned,
        p_source_type: "quiz",
        p_source_id: quizId,
        p_description: `Quiz reussi: ${quiz.title}`,
      })
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
        // Anti-farm : retour honnête — pas de faux gain sur un rejeu.
        xpAwarded: xpEarned > 0,
        alreadyRewarded,
        results,
      },
    })
  } catch (error) {
    console.error("Unexpected error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
