/**
 * POST /api/parent/chores/create — Wave 2.1 parent custom chores.
 *
 * Per docs/vision/parent-custom-chores.md + whitepaper §19.4.1:
 *   Parents define family-scoped chores ("vaisselle 5 fois = 100 DH"). On
 *   verification of all required_completions, payout_chore_reward fires and
 *   pipes through the canonical top_up_teen rails (§29.4).
 *
 * Wave 3 / TICKET-016 — Sibling fan-out:
 *   The body now accepts `teen_ids: string[]` (≥1) so a single chore can be
 *   targeted at multiple linked teens. We still write the legacy
 *   `parent_chores.teen_id` column (set to the first targeted teen) for
 *   backward compatibility, and fan out to the new `chore_targets` junction
 *   table for every selected sibling. `teen_id` (singular) remains accepted
 *   as a fallback for older clients.
 *
 * Body: {
 *   teen_ids: string[]                     // Wave 3 — multi-select
 *   teen_id?: string                       // legacy single-teen fallback
 *   title, description?, reward_dh, reward_xp,
 *   recurrence ('one_shot'|'daily'|'weekly'|'monthly'|'custom_days'),
 *   recurrence_config?, required_completions, evidence_required,
 *   starts_at?, ends_at?
 * }
 */

import { NextResponse } from "next/server"
import { getUserRole } from "@/lib/auth/get-user-role"
import { createClient } from "@/lib/supabase/server"

interface CreateChoreBody {
  teen_ids?: string[]
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

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

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

    // Resolve target teens: prefer the new `teen_ids` array, fall back to
    // the legacy `teen_id` scalar so older clients keep working.
    const rawTeenIds = Array.isArray(body.teen_ids)
      ? body.teen_ids
      : body.teen_id
      ? [body.teen_id]
      : []
    const teenIds = Array.from(
      new Set(
        rawTeenIds
          .map((v) => (typeof v === "string" ? v.trim() : ""))
          .filter((v) => v.length > 0 && UUID_RE.test(v))
      )
    )

    const title = (body.title ?? "").trim()
    const recurrence = body.recurrence ?? "one_shot"
    const requiredCompletions = Number(body.required_completions ?? 1)
    const rewardDh = Number(body.reward_dh ?? 0)
    const rewardXp = Number(body.reward_xp ?? 0)

    if (teenIds.length === 0 || !title) {
      return NextResponse.json(
        { success: false, error: "Données manquantes (teen_ids, title)" },
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

    // Validate every targeted teen is linked to this parent. We pull the full
    // link set in one round-trip then assert each requested teen is in it.
    const { data: links } = await supabase
      .from("parent_teen_links")
      .select("teen_id")
      .eq("parent_id", parentId)

    const linkedSet = new Set(
      (links ?? []).map((r) => (r as { teen_id: string }).teen_id)
    )
    const unlinked = teenIds.filter((t) => !linkedSet.has(t))
    if (unlinked.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Un ou plusieurs teens ne sont pas liés à ce compte parent",
        },
        { status: 400 }
      )
    }

    // Insert one parent_chores row. We keep the legacy NOT NULL `teen_id`
    // column populated with the first targeted teen so existing reads
    // (parent dashboard, teen_id-based queries) keep working until callers
    // are migrated to the chore_targets junction.
    const primaryTeenId = teenIds[0]
    const { data: chore, error } = await supabase
      .from("parent_chores")
      .insert({
        parent_id: parentId,
        teen_id: primaryTeenId,
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

    if (error || !chore) {
      console.error("[chores/create] insert error:", error)
      return NextResponse.json(
        { success: false, error: error?.message || "Erreur serveur" },
        { status: 500 }
      )
    }

    // Fan-out: one junction row per targeted teen. ON CONFLICT is harmless
    // because (chore_id, teen_id) is the PK.
    const targetRows = teenIds.map((tid) => ({
      chore_id: (chore as { id: string }).id,
      teen_id: tid,
    }))
    const { error: targetsError } = await supabase
      .from("chore_targets")
      .insert(targetRows)

    if (targetsError) {
      // Best-effort rollback: remove the parent_chores row we just wrote so
      // we don't leave a chore with an incomplete target set.
      console.error("[chores/create] targets insert error:", targetsError)
      await supabase
        .from("parent_chores")
        .delete()
        .eq("id", (chore as { id: string }).id)
      return NextResponse.json(
        {
          success: false,
          error: targetsError.message || "Erreur création des cibles",
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      chore,
      target_teen_ids: teenIds,
    })
  } catch (err) {
    console.error("[chores/create] unexpected error:", err)
    return NextResponse.json(
      { success: false, error: "Erreur serveur" },
      { status: 500 }
    )
  }
}
