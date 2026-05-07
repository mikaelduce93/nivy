/**
 * Parent allowances — list + create.
 *
 * POST creates a `parent_allowances` row owned by the calling parent.
 *      Requires the parent ↔ teen link to exist; computes the first
 *      `next_disbursement_at` from the chosen cadence and config.
 * GET  lists all allowances funded by the calling parent.
 */

import { NextResponse } from "next/server"
import { getUserRole } from "@/lib/auth/get-user-role"
import { createClient } from "@/lib/supabase/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import {
  computeFirstDisbursement,
  type Cadence,
  type CadenceConfig,
} from "@/lib/allowance/next-disbursement"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

interface CreateBody {
  teenId?: string
  amount_dh?: number
  cadence?: Cadence
  cadence_config?: CadenceConfig
  conditional?: boolean
  condition_type?: "streak_min" | "quest_completion_rate" | "chore_checklist" | "custom"
  condition_threshold?: number
  next_disbursement_at?: string
}

export async function GET() {
  const userInfo = await getUserRole()
  if (!userInfo || userInfo.role !== "parent") {
    return NextResponse.json({ success: false, error: "Non autorisé" }, { status: 401 })
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("parent_allowances")
    .select("*")
    .eq("parent_id", userInfo.profileId)
    .order("created_at", { ascending: false })

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, data: data ?? [] })
}

export async function POST(request: Request) {
  try {
    const userInfo = await getUserRole()
    if (!userInfo || userInfo.role !== "parent") {
      return NextResponse.json({ success: false, error: "Non autorisé" }, { status: 401 })
    }

    const body = (await request.json()) as CreateBody
    const teenId = body.teenId
    const amountDh = Number(body.amount_dh)
    const cadence: Cadence = body.cadence ?? "weekly"
    const cadenceConfig: CadenceConfig = body.cadence_config ?? {}

    if (!teenId || !Number.isFinite(amountDh) || amountDh <= 0) {
      return NextResponse.json(
        { success: false, error: "Données manquantes (teenId, amount_dh)" },
        { status: 400 }
      )
    }
    if (!["weekly", "biweekly", "monthly", "custom_dates"].includes(cadence)) {
      return NextResponse.json(
        { success: false, error: "Cadence invalide" },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    const parentId = userInfo.profileId

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

    const nextDisbursementAt = body.next_disbursement_at
      ? new Date(body.next_disbursement_at)
      : computeFirstDisbursement(cadence, cadenceConfig)

    // Service role: insert respects RLS but we want to bypass for cron-stable schema writes.
    const admin = createServiceRoleClient()
    const { data, error } = await admin
      .from("parent_allowances")
      .insert({
        parent_id: parentId,
        teen_id: teenId,
        amount_dh: amountDh,
        cadence,
        cadence_config: cadenceConfig,
        conditional: Boolean(body.conditional),
        condition_type: body.conditional ? body.condition_type ?? null : null,
        condition_threshold: body.conditional ? body.condition_threshold ?? null : null,
        is_active: true,
        next_disbursement_at: nextDisbursementAt.toISOString(),
      })
      .select("*")
      .single()

    if (error) {
      console.error("[allowances POST] insert error:", error)
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, data })
  } catch (err) {
    console.error("[allowances POST] unexpected:", err)
    return NextResponse.json(
      { success: false, error: "Erreur serveur" },
      { status: 500 }
    )
  }
}
