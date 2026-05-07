/**
 * Wave 2.3 — Creator leaderboard.
 *
 * GET /api/creator/leaderboard?period=month&category=sport
 *
 * Reads creator_monthly_stats. Triggers a refresh first so dev/staging stays
 * fresh without a cron. Returns top 50 by xp_earned.
 */
import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const period = searchParams.get("period") || "month"
    const category = searchParams.get("category")

    const sr = createServiceRoleClient()

    // Refresh current-month rollup (cheap; 1 INSERT … ON CONFLICT)
    await sr.rpc("refresh_creator_monthly_stats")

    // Compute the month boundary for the requested period
    const now = new Date()
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
      .toISOString()
      .slice(0, 10)

    let q = sr
      .from("creator_monthly_stats")
      .select("user_id, month, category, submissions_count, total_likes, total_views, xp_earned, rank_overall, rank_category")
      .eq("month", monthStart)
      .order("xp_earned", { ascending: false })
      .limit(50)

    if (category) q = q.eq("category", category)

    const { data, error } = await q
    if (error) {
      console.error("[leaderboard] query error", error)
      return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
    }

    return NextResponse.json({ period, category, month: monthStart, entries: data ?? [] })
  } catch (err) {
    console.error("[leaderboard] error", err)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
