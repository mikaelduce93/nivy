/**
 * POST /api/parent/chores/:id/verify-completion
 *
 * Body: { completion_id, approved: bool, rejection_reason? }
 *
 * On approve: marks completion verified and calls payout_chore_reward.
 * On reject: stores the rejection reason; does NOT count toward required_completions.
 *
 * Server-side guard: only the chore's parent_id can verify (validated against
 * the JWT). RLS also enforces this on the UPDATE.
 */

import { NextResponse } from "next/server"
import { getUserRole } from "@/lib/auth/get-user-role"
import { createClient } from "@/lib/supabase/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

interface VerifyBody {
  completion_id?: string
  approved?: boolean
  rejection_reason?: string | null
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userInfo = await getUserRole()
    if (!userInfo || userInfo.role !== "parent") {
      return NextResponse.json(
        { success: false, error: "Non autorisé" },
        { status: 401 }
      )
    }

    const { id: choreId } = await params
    const body = (await request.json()) as VerifyBody
    const completionId = body.completion_id
    const approved = !!body.approved

    if (!choreId || !completionId) {
      return NextResponse.json(
        { success: false, error: "Données manquantes (completion_id)" },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    const parentId = userInfo.profileId

    // Verify the chore belongs to this parent (server-side guard, see also RLS).
    const { data: chore } = await supabase
      .from("parent_chores")
      .select("id, parent_id, teen_id, title")
      .eq("id", choreId)
      .eq("parent_id", parentId)
      .maybeSingle()

    if (!chore) {
      return NextResponse.json(
        { success: false, error: "Corvée introuvable ou non autorisée" },
        { status: 403 }
      )
    }

    // Update the completion row (anon client → RLS enforces parent ownership).
    const updatePatch = approved
      ? {
          parent_verified: true,
          verified_at: new Date().toISOString(),
          verified_by: parentId,
          rejection_reason: null,
        }
      : {
          parent_verified: false,
          verified_at: new Date().toISOString(),
          verified_by: parentId,
          rejection_reason: body.rejection_reason || "Refusé par le parent",
        }

    const { data: completion, error: updErr } = await supabase
      .from("parent_chore_completions")
      .update(updatePatch)
      .eq("id", completionId)
      .eq("chore_id", choreId)
      .select("*")
      .single()

    if (updErr || !completion) {
      console.error("[verify-completion] update error:", updErr)
      return NextResponse.json(
        { success: false, error: updErr?.message || "Erreur de mise à jour" },
        { status: 500 }
      )
    }

    // If approved, fire payout RPC via service-role (§29.15: money writes server-side).
    let payoutResult: unknown = null
    if (approved) {
      const admin = createServiceRoleClient()
      const { data, error } = await admin.rpc("payout_chore_reward", {
        p_completion_id: completionId,
        p_verified_by: parentId,
      })
      if (error) {
        console.error("[verify-completion] payout RPC error:", error)
        return NextResponse.json(
          { success: false, error: error.message || "Payout échoué" },
          { status: 500 }
        )
      }
      payoutResult = data
    }

    return NextResponse.json({
      success: true,
      completion,
      payout: payoutResult,
    })
  } catch (err) {
    console.error("[verify-completion] unexpected:", err)
    return NextResponse.json(
      { success: false, error: "Erreur serveur" },
      { status: 500 }
    )
  }
}
