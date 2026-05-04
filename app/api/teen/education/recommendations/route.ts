import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

interface Recommendation {
  id: string
  type: "quiz" | "tutorial" | "challenge" | "resource"
  title: string
  description: string
  reason: string
  priority: "high" | "medium" | "low"
  subject?: string
  xpReward?: number
  link?: string
  metadata?: Record<string, unknown>
}

/**
 * GET /api/teen/education/recommendations
 * Get personalized recommendations for a teen based on their performance
 *
 * Query params:
 * - teenId: UUID of the teen (required)
 * - limit: Max number of recommendations (default 10)
 * - type: Filter by type (optional)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const teenId = searchParams.get("teenId")
    const limit = parseInt(searchParams.get("limit") || "10")
    const type = searchParams.get("type")

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

    const recommendations: Recommendation[] = []

    // 1. Analyze grades to find weak subjects
    const { data: grades } = await supabase
      .from("teen_grades")
      .select("subject, subject_label, grade, max_grade")
      .eq("teen_id", teenId)
      .eq("status", "approved")
      .gte("grade_date", new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split("T")[0])

    const subjectAverages: Record<string, { total: number; count: number; label: string }> = {}
    grades?.forEach((g) => {
      if (!subjectAverages[g.subject]) {
        subjectAverages[g.subject] = { total: 0, count: 0, label: g.subject_label }
      }
      subjectAverages[g.subject].total += (g.grade / g.max_grade) * 100
      subjectAverages[g.subject].count++
    })

    const weakSubjects = Object.entries(subjectAverages)
      .map(([subject, data]) => ({
        subject,
        label: data.label,
        average: data.total / data.count,
      }))
      .filter((s) => s.average < 60)
      .sort((a, b) => a.average - b.average)

    // 2. Get quizzes for weak subjects (not yet passed)
    if (!type || type === "quiz") {
      const { data: quizAttempts } = await supabase
        .from("quiz_attempts")
        .select("quiz_id, passed")
        .eq("teen_id", teenId)
        .eq("passed", true)

      const passedQuizIds = quizAttempts?.map((a) => a.quiz_id) || []

      for (const weakSubject of weakSubjects.slice(0, 3)) {
        const { data: quizzes } = await supabase
          .from("educational_quizzes")
          .select("*")
          .eq("subject", weakSubject.subject)
          .eq("is_active", true)
          .not("id", "in", passedQuizIds.length > 0 ? `(${passedQuizIds.join(",")})` : "(00000000-0000-0000-0000-000000000000)")
          .limit(2)

        quizzes?.forEach((quiz) => {
          recommendations.push({
            id: `quiz-${quiz.id}`,
            type: "quiz",
            title: quiz.title,
            description: quiz.description || `Quiz de ${weakSubject.label}`,
            reason: `Ameliore tes connaissances en ${weakSubject.label} (moyenne: ${Math.round(weakSubject.average)}%)`,
            priority: weakSubject.average < 40 ? "high" : "medium",
            subject: weakSubject.subject,
            xpReward: quiz.xp_reward,
            metadata: { quizId: quiz.id },
          })
        })
      }
    }

    // 3. Get tutorials for weak subjects (not completed)
    if (!type || type === "tutorial") {
      const { data: completedTutorials } = await supabase
        .from("educational_tutorial_progress")
        .select("tutorial_id")
        .eq("teen_id", teenId)
        .eq("completed", true)

      const completedIds = completedTutorials?.map((t) => t.tutorial_id) || []

      for (const weakSubject of weakSubjects.slice(0, 3)) {
        const { data: tutorials } = await supabase
          .from("educational_tutorials")
          .select("*")
          .eq("subject", weakSubject.subject)
          .eq("is_active", true)
          .not("id", "in", completedIds.length > 0 ? `(${completedIds.join(",")})` : "(00000000-0000-0000-0000-000000000000)")
          .limit(2)

        tutorials?.forEach((tutorial) => {
          recommendations.push({
            id: `tutorial-${tutorial.id}`,
            type: "tutorial",
            title: tutorial.title,
            description: tutorial.description || `Tutoriel de ${weakSubject.label}`,
            reason: `Renforce tes bases en ${weakSubject.label}`,
            priority: weakSubject.average < 40 ? "high" : "medium",
            subject: weakSubject.subject,
            xpReward: tutorial.xp_reward,
            metadata: {
              tutorialId: tutorial.id,
              videoUrl: tutorial.video_url,
              duration: tutorial.video_duration_minutes,
            },
          })
        })
      }
    }

    // 4. Get passion path recommendations based on interests
    if (!type || type === "challenge") {
      const { data: passionProgress } = await supabase
        .from("teen_passion_path_progress")
        .select("*, passion_paths(*)")
        .eq("teen_id", teenId)
        .eq("completed", false)
        .order("last_activity_at", { ascending: false })
        .limit(3)

      passionProgress?.forEach((progress) => {
        const path = progress.passion_paths
        if (path) {
          recommendations.push({
            id: `passion-${path.id}`,
            type: "challenge",
            title: `Continue ton parcours ${path.name}`,
            description: path.description || `Niveau ${progress.current_level}/${path.total_levels}`,
            reason: "Continue ton parcours passion pour equilibrer ton profil",
            priority: "medium",
            xpReward: path.xp_per_level,
            metadata: {
              pathId: path.id,
              currentLevel: progress.current_level,
              progressPercent: progress.level_progress_percent,
            },
          })
        }
      })
    }

    // 5. Daily login recommendation if not logged in today
    const { data: streak } = await supabase
      .from("user_streaks")
      .select("last_activity_date")
      .eq("teen_id", teenId)
      .single()

    const today = new Date().toISOString().split("T")[0]
    if (!streak || streak.last_activity_date !== today) {
      recommendations.push({
        id: "daily-checkin",
        type: "challenge",
        title: "Check-in quotidien",
        description: "Connecte-toi chaque jour pour maintenir ton streak",
        reason: "Garde ton streak actif pour des bonus XP",
        priority: "high",
        xpReward: 10,
      })
    }

    // 6. Suggest physical challenges if sport score is low
    const { data: pillarScores } = await supabase
      .rpc("get_pillar_scores", { p_teen_id: teenId })

    if (pillarScores && pillarScores.sport_score < 50) {
      const { data: physicalChallenges } = await supabase
        .from("physical_challenges")
        .select("*")
        .eq("is_active", true)
        .eq("challenge_type", "daily")
        .limit(2)

      physicalChallenges?.forEach((challenge) => {
        recommendations.push({
          id: `physical-${challenge.id}`,
          type: "challenge",
          title: challenge.name,
          description: challenge.description || `Objectif: ${challenge.objective_value} ${challenge.objective_unit}`,
          reason: "Ameliore ton score Sport pour un meilleur equilibre",
          priority: "medium",
          xpReward: challenge.xp_reward,
          metadata: { challengeId: challenge.id },
        })
      })
    }

    // Sort by priority and limit
    const priorityOrder = { high: 0, medium: 1, low: 2 }
    const sortedRecommendations = recommendations
      .sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])
      .slice(0, limit)

    return NextResponse.json({
      success: true,
      recommendations: sortedRecommendations,
      insights: {
        weakSubjects: weakSubjects.slice(0, 5),
        pillarScores: pillarScores || null,
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
