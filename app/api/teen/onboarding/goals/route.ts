import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getUserRole } from "@/lib/auth/get-user-role"

/**
 * POST /api/teen/onboarding/goals
 * Body: { goals: string[] } — up to 3 free-text goals.
 *
 * Writes one row per goal to teen_goals with priority=1..3, is_active=true.
 * Skip allowed: empty array writes nothing.
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const userInfo = await getUserRole()

    if (!userInfo || userInfo.role !== "teen") {
      return NextResponse.json(
        { success: false, error: "Non autorisé" },
        { status: 401 }
      )
    }

    const teenId = userInfo.profileId
    const body = await request.json().catch(() => ({}))
    const raw: unknown[] = Array.isArray(body?.goals) ? body.goals : []
    const goals: string[] = raw
      .filter((g): g is string => typeof g === "string")
      .map((g) => g.trim())
      .filter((g) => g.length > 0 && g.length <= 280)
      .slice(0, 3)

    if (goals.length === 0) {
      return NextResponse.json({ success: true, count: 0, skipped: true })
    }

    // Replace any existing onboarding goals (priority 1..3, active)
    const { error: delErr } = await supabase
      .from("teen_goals")
      .delete()
      .eq("teen_id", teenId)
      .eq("is_active", true)
      .in("priority", [1, 2, 3])

    if (delErr) {
      console.error("teen_goals delete error:", delErr)
    }

    const rows = goals.map((goal_text, idx) => ({
      teen_id: teenId,
      goal_text,
      priority: idx + 1,
      is_active: true,
    }))

    const { error: insErr } = await supabase.from("teen_goals").insert(rows)

    if (insErr) {
      console.error("teen_goals insert error:", insErr)
      return NextResponse.json(
        { success: false, error: "Erreur d'enregistrement" },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, count: rows.length })
  } catch (error) {
    console.error("/api/teen/onboarding/goals error:", error)
    return NextResponse.json(
      { success: false, error: "Erreur serveur" },
      { status: 500 }
    )
  }
}
