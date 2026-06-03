import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { getUserRole } from "@/lib/auth/get-user-role"
import { logDbError } from "@/lib/observability/log-db-error"
import {
  dedupeGoals,
  deriveGoalDeadline,
  deriveGoalTag,
  type TaxonomyRow,
} from "@/lib/teens/goal-structuring"

/**
 * POST /api/teen/onboarding/goals
 * Body: { goals: string[] } — up to 3 free-text goals.
 *
 * #304 — goals are now STRUCTURED (goal_tag from interest_taxonomy + target_date
 * heuristic) and DEDUPED, then drive the mission engine: each tagged goal bumps
 * affinity_scores and we call assign_missions_for_teen so the teen immediately
 * gets goal-aligned missions (no longer dead data).
 *
 * Skip allowed: empty array writes nothing.
 */
const GOAL_AFFINITY_WEIGHT = 5

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const userInfo = await getUserRole()

    if (!userInfo || userInfo.role !== "teen") {
      return NextResponse.json({ success: false, error: "Non autorisé" }, { status: 401 })
    }

    const teenId = userInfo.profileId
    const body = await request.json().catch(() => ({}))
    const raw: unknown[] = Array.isArray(body?.goals) ? body.goals : []
    const cleaned: string[] = raw
      .filter((g): g is string => typeof g === "string")
      .map((g) => g.trim())
      .filter((g) => g.length > 0 && g.length <= 280)
    const goals = dedupeGoals(cleaned).slice(0, 3)

    if (goals.length === 0) {
      return NextResponse.json({ success: true, count: 0, skipped: true })
    }

    // Structuring source: the real interest taxonomy + the tags missions
    // actually carry (tie-break so a goal biases an existing mission).
    const sr = createServiceRoleClient()
    const [{ data: taxonomy }, { data: templates }] = await Promise.all([
      sr.from("interest_taxonomy").select("tag, category, display_fr").eq("is_active", true),
      sr.from("mission_templates").select("tags").eq("is_active", true),
    ])
    const preferredTags = new Set<string>()
    for (const t of (templates ?? []) as { tags: string[] | null }[]) {
      for (const tag of t.tags ?? []) preferredTags.add(tag)
    }
    const taxonomyRows = (taxonomy ?? []) as TaxonomyRow[]

    const structured = goals.map((goal_text, idx) => ({
      teen_id: teenId,
      goal_text,
      goal_tag: deriveGoalTag(goal_text, taxonomyRows, preferredTags),
      target_date: deriveGoalDeadline(goal_text),
      priority: idx + 1,
      is_active: true,
    }))

    // Replace any existing onboarding goals (priority 1..3, active).
    const { error: delErr } = await supabase
      .from("teen_goals")
      .delete()
      .eq("teen_id", teenId)
      .eq("is_active", true)
      .in("priority", [1, 2, 3])
    if (delErr) logDbError("teen_goals.delete", delErr)

    const { error: insErr } = await supabase.from("teen_goals").insert(structured)
    if (insErr) {
      logDbError("teen_goals.insert", insErr)
      return NextResponse.json(
        { success: false, error: "Erreur d'enregistrement" },
        { status: 500 }
      )
    }

    // Feed the recommender: bump affinity for each tagged goal (service-role,
    // PK is (teen_id, tag) → read-then-upsert increment).
    const tags = Array.from(new Set(structured.map((g) => g.goal_tag).filter((t): t is string => !!t)))
    if (tags.length > 0) {
      const { data: existing } = await sr
        .from("affinity_scores")
        .select("tag, score, signal_count")
        .eq("teen_id", teenId)
        .in("tag", tags)
      const prev = new Map<string, { score: number; signal_count: number }>()
      for (const r of (existing ?? []) as { tag: string; score: number; signal_count: number }[]) {
        prev.set(r.tag, { score: Number(r.score) || 0, signal_count: r.signal_count ?? 0 })
      }
      const nowIso = new Date().toISOString()
      const rows = tags.map((tag) => {
        const p = prev.get(tag) ?? { score: 0, signal_count: 0 }
        return {
          teen_id: teenId,
          tag,
          score: p.score + GOAL_AFFINITY_WEIGHT,
          signal_count: p.signal_count + 1,
          updated_at: nowIso,
        }
      })
      const { error: affErr } = await sr
        .from("affinity_scores")
        .upsert(rows, { onConflict: "teen_id,tag" })
      if (affErr) logDbError("affinity_scores.upsert", affErr)
    }

    // Reuse the existing mission engine — assign goal-aligned missions now.
    let missionsAssigned = 0
    const { data: assigned, error: rpcErr } = await sr.rpc("assign_missions_for_teen", {
      p_teen_id: teenId,
    })
    if (rpcErr) logDbError("assign_missions_for_teen", rpcErr)
    else missionsAssigned = typeof assigned === "number" ? assigned : Number(assigned ?? 0)

    return NextResponse.json({
      success: true,
      count: structured.length,
      tagged: tags.length,
      missionsAssigned,
    })
  } catch (error) {
    console.error("/api/teen/onboarding/goals error:", error)
    return NextResponse.json({ success: false, error: "Erreur serveur" }, { status: 500 })
  }
}
