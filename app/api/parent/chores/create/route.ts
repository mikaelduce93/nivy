/**
 * POST /api/parent/chores/create — Wave 2.1 parent custom chores.
 *
 * Per docs/vision/parent-custom-chores.md + whitepaper §19.4.1:
 *   Parents define family-scoped chores ("vaisselle 5 fois = 100 DH"). On
 *   verification of all required_completions, payout_chore_reward fires and
 *   pipes through the canonical top_up_teen rails (§29.4).
 *
 * Body: {
 *   teen_id, title, description?, reward_dh, reward_xp,
 *   recurrence ('one_shot'|'daily'|'weekly'|'monthly'|'custom_days'),
 *   recurrence_config?, required_completions, evidence_required,
 *   starts_at?, ends_at?
 * }
 */

import { NextResponse } from "next/server"
import { getUserRole } from "@/lib/auth/get-user-role"
import { createClient } from "@/lib/supabase/server"

interface CreateChoreBody {
  teen_id?: string
  title?: string
  description?: string | null
  reward_dh?: number
  reward_xp?: number
  recurrence?: string
  recurrence_config?: Record<string, unknown>
  required_completions?: number
  evidence_required?: boolean
  starts_at?: string
  ends_at?: string | null
}

const ALLOWED_RECURRENCE = new Set([
  "one_shot",
  "daily",
  "weekly",
  "monthly",
  "custom_days",
])

export async function POST(request: Request) {
  try {
    const userInfo = await getUserRole()
    if (!userInfo || userInfo.role !== "parent") {
      return NextResponse.json(
        { success: false, error: "Non autorisé" },
        { status: 401 }
      )
    }

    const body = (await request.json()) as CreateChoreBody
    const teenId = body.teen_id
    const title = (body.title ?? "").trim()
    const recurrence = body.recurrence ?? "one_shot"
    const requiredCompletions = Number(body.required_completions ?? 1)
    const rewardDh = Number(body.reward_dh ?? 0)
    const rewardXp = Number(body.reward_xp ?? 0)

    if (!teenId || !title) {
      return NextResponse.json(
        { success: false, error: "Données manquantes (teen_id, title)" },
        { status: 400 }
      )
    }
    if (!ALLOWED_RECURRENCE.has(recurrence)) {
      return NextResponse.json(
        { success: false, error: "Récurrence invalide" },
        { status: 400 }
      )
    }
    if (!Number.isFinite(requiredCompletions) || requiredCompletions < 1) {
      return NextResponse.json(
        { success: false, error: "required_completions doit être >= 1" },
        { status: 400 }
      )
    }
    if (!Number.isFinite(rewardDh) || rewardDh < 0) {
      return NextResponse.json(
        { success: false, error: "reward_dh invalide" },
        { status: 400 }
      )
    }
    if (!Number.isFinite(rewardXp) || rewardXp < 0) {
      return NextResponse.json(
        { success: false, error: "reward_xp invalide" },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    const parentId = userInfo.profileId

    // Validate parent-teen link.
    const { data: link } = await supabase
      .from("parent_teen_links")
      .select("id")
      .eq("parent_id", parentId)
      .eq("teen_id", teenId)
      .limit(1)
      .maybeSingle()

    if (!link) {
      return NextResponse.json(
        { success: false, error: "Teen non lié à ce compte parent" },
        { status: 400 }
      )
    }

    const { data: chore, error } = await supabase
      .from("parent_chores")
      .insert({
        parent_id: parentId,
        teen_id: teenId,
        title,
        description: body.description ?? null,
        reward_dh: rewardDh,
        reward_xp: rewardXp,
        recurrence,
        recurrence_config: body.recurrence_config ?? {},
        required_completions: requiredCompletions,
        evidence_required: !!body.evidence_required,
        starts_at: body.starts_at ?? new Date().toISOString(),
        ends_at: body.ends_at ?? null,
      })
      .select("*")
      .single()

    if (error) {
      console.error("[chores/create] insert error:", error)
      return NextResponse.json(
        { success: false, error: error.message || "Erreur serveur" },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, chore })
  } catch (err) {
    console.error("[chores/create] unexpected error:", err)
    return NextResponse.json(
      { success: false, error: "Erreur serveur" },
      { status: 500 }
    )
  }
}
