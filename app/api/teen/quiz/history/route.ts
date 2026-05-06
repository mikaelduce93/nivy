import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getUserRole } from "@/lib/auth/get-user-role"
import { historyQuerySchema } from "@/lib/quiz/schema"

/**
 * GET /api/teen/quiz/history?limit=20
 *
 * Returns the current teen's recent quiz attempts joined with quiz title /
 * subject so the UI can render history rows without a second round-trip.
 */
export async function GET(request: NextRequest) {
  try {
    const userInfo = await getUserRole()
    if (!userInfo || userInfo.role !== "teen" || !userInfo.teenData?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const teenId = userInfo.teenData.id
    const validation = historyQuerySchema.safeParse({
      limit: request.nextUrl.searchParams.get("limit") ?? undefined,
    })
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 },
      )
    }

    const supabase = await createClient()

    const { data, error } = await supabase
      .from("quiz_attempts")
      .select(
        "id, quiz_id, score, correct_count, total_questions, passed, xp_earned, time_spent_seconds, completed_at, created_at, quiz:quiz_id(id, title, subject, icon)",
      )
      .eq("teen_id", teenId)
      .order("created_at", { ascending: false })
      .limit(validation.data.limit)

    if (error) {
      console.error("[teen/quiz/history] fetch error:", error)
      return NextResponse.json({ error: "Failed to fetch history" }, { status: 500 })
    }

    return NextResponse.json({ attempts: data ?? [] })
  } catch (error) {
    console.error("[teen/quiz/history] unexpected:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
