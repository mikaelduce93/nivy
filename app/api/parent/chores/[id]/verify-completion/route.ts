/**
 * POST /api/parent/chores/:id/verify-completion
 *
 * Body: { completion_id, approved: bool, rejection_reason? }
 *
 * Thin wrapper around the SECURITY DEFINER RPC `verify_chore_completion`.
 *
 * TICKET-013 (multi-parent verification): the RPC validates that the calling
 * parent is in `parent_teen_links` for the teen who completed the chore —
 * NOT just the chore's creator. First-wins: once `parent_verified` (true OR
 * false with a verified_at) is set, it becomes immutable.
 *
 * On approve, the RPC delegates to `payout_chore_reward` (Wave 2 P1+) using
 * the chore's owner as `p_verified_by` so the payout invariant is preserved.
 */

import { NextResponse } from "next/server"
import { getUserRole } from "@/lib/auth/get-user-role"
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

    const parentId = userInfo.profileId
    const admin = createServiceRoleClient()

    const { data, error } = await admin.rpc("verify_chore_completion", {
      p_completion_id: completionId,
      p_parent_id: parentId,
      p_action: approved ? "approve" : "reject",
      p_rejection_reason: approved ? null : body.rejection_reason ?? null,
    })

    if (error) {
      console.error("[verify-completion] rpc error:", error)
      return NextResponse.json(
        { success: false, error: error.message || "Erreur RPC" },
        { status: 500 }
      )
    }

    const result = (data ?? {}) as Record<string, unknown>
    if (result.success === false) {
      const rpcError = String(result.error ?? "rpc_failed")
      const status =
        rpcError === "not_linked_parent"
          ? 403
          : rpcError === "already_verified"
          ? 409
          : rpcError === "completion_not_found" || rpcError === "chore_not_found"
          ? 404
          : 400
      return NextResponse.json(
        { success: false, error: rpcError, detail: result },
        { status }
      )
    }

    return NextResponse.json({ success: true, ...result })
  } catch (err) {
    console.error("[verify-completion] unexpected:", err)
    return NextResponse.json(
      { success: false, error: "Erreur serveur" },
      { status: 500 }
    )
  }
}
