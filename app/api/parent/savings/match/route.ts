/**
 * Parent configures a match on an existing teen savings goal.
 * Body: { goal_id, match_pct, match_cap_coins? }
 */

import { NextResponse } from "next/server"
import { getUserRole } from "@/lib/auth/get-user-role"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

interface Body {
  goal_id?: string
  match_pct?: number
  match_cap_coins?: number | null
}

export async function POST(request: Request) {
  const userInfo = await getUserRole()
  if (!userInfo || userInfo.role !== "parent") {
    return NextResponse.json({ success: false, error: "Non autorisé" }, { status: 401 })
  }

  const body = (await request.json()) as Body
  const goalId = body.goal_id
  const matchPct = Number(body.match_pct)
  const cap = body.match_cap_coins == null ? null : Number(body.match_cap_coins)

  if (!goalId || !Number.isFinite(matchPct) || matchPct < 0 || matchPct > 100) {
    return NextResponse.json(
      { success: false, error: "goal_id + match_pct (0..100) requis" },
      { status: 400 }
    )
  }
  if (cap !== null && (!Number.isFinite(cap) || cap < 0)) {
    return NextResponse.json(
      { success: false, error: "match_cap_coins invalide" },
      { status: 400 }
    )
  }

  const admin = createServiceRoleClient()

  // Verify the calling parent is linked to the goal's teen.
  const { data: goal } = await admin
    .from("savings_goals")
    .select("id, teen_id")
    .eq("id", goalId)
    .maybeSingle()
  if (!goal) {
    return NextResponse.json(
      { success: false, error: "Goal introuvable" },
      { status: 404 }
    )
  }

  const { data: link } = await admin
    .from("parent_teen_links")
    .select("id")
    .eq("parent_id", userInfo.profileId)
    .eq("teen_id", goal.teen_id)
    .limit(1)
    .maybeSingle()
  if (!link) {
    return NextResponse.json(
      { success: false, error: "Teen non lié à ce parent" },
      { status: 403 }
    )
  }

  const { data, error } = await admin
    .from("savings_goals")
    .update({
      parent_id: userInfo.profileId,
      parent_match_pct: matchPct,
      parent_match_cap_coins: cap,
    })
    .eq("id", goalId)
    .select("*")
    .single()

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
  return NextResponse.json({ success: true, data })
}
