import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getUserRole } from "@/lib/auth/get-user-role"

/**
 * GET /api/teen/quiz/daily
 *
 * Returns the deterministic "quiz of the day". The same quiz is picked for
 * every teen on the same calendar day (UTC), and rotates daily through the
 * pool of active quizzes. Also reports whether the current teen has already
 * attempted today's quiz (so the UI can show a "completed" state).
 */
export async function GET(_request: NextRequest) {
  try {
    const userInfo = await getUserRole()
    if (!userInfo || userInfo.role !== "teen" || !userInfo.teenData?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const teenId = userInfo.teenData.id
    const supabase = await createClient()

    const { data: pool, error } = await supabase
      .from("educational_quizzes")
      .select(
        "id, code, title, description, subject, difficulty, grade_level, questions, time_limit_minutes, passing_score, xp_reward, icon",
      )
      .eq("is_active", true)
      .order("id", { ascending: true })

    if (error) {
      console.error("[teen/quiz/daily] fetch error:", error)
      return NextResponse.json({ error: "Failed to fetch daily quiz" }, { status: 500 })
    }

    if (!pool || pool.length === 0) {
      return NextResponse.json({ quiz: null, completedToday: false })
    }

    // Days since unix epoch (UTC), rotates the pool deterministically
    const dayIndex = Math.floor(Date.now() / (1000 * 60 * 60 * 24))
    const todays = pool[dayIndex % pool.length]

    // Has the teen attempted today's quiz today?
    const startOfDay = new Date()
    startOfDay.setUTCHours(0, 0, 0, 0)
    const { data: todayAttempt } = await supabase
      .from("quiz_attempts")
      .select("id, score, passed")
      .eq("teen_id", teenId)
      .eq("quiz_id", todays.id)
      .gte("created_at", startOfDay.toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    return NextResponse.json({
      quiz: {
        id: todays.id,
        code: todays.code,
        title: todays.title,
        description: todays.description,
        subject: todays.subject,
        difficulty: todays.difficulty,
        grade_level: todays.grade_level,
        questions_count: Array.isArray(todays.questions) ? todays.questions.length : 0,
        time_limit_minutes: todays.time_limit_minutes,
        passing_score: todays.passing_score,
        xp_reward: todays.xp_reward,
        icon: todays.icon,
      },
      completedToday: Boolean(todayAttempt),
      todayAttempt: todayAttempt ?? null,
    })
  } catch (error) {
    console.error("[teen/quiz/daily] unexpected:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
