/**
 * Parent decision endpoint for parental_approvals rows — Wave 1C cascade.
 *
 * Canon: docs/canon/parent-control.locked.md §5 (Approvals queue) +
 *        §10 FORBIDDEN #1 (no flip-only) +
 *        §11 MISSING #11 (cascade RPCs) +
 *        docs/canon/admin-moderation.locked.md §4 (audit_log).
 *
 * Behaviour:
 *   1. Authenticate; parent role required.
 *   2. Resolve the parental_approvals row + verify ownership + active link.
 *   3. Dispatch to the canonical cascade RPC by action_type:
 *        coach_meeting → parent_approve_session_v2 / parent_deny_session_v2
 *        ride          → parent_approve_ride / parent_deny_ride
 *        food_order    → parent_approve_food / parent_deny_food
 *        purchase_above_ceiling → parent_approve_purchase / parent_deny_purchase
 *        content       → parent_approve_content / parent_deny_content
 *   4. The RPC atomically performs the side effect, flips status, writes
 *      user_notifications, writes audit_log. NO post-flip notification work
 *      in this route — the RPC owns the cascade.
 *   5. RPC failure → 5xx. Approval status stays `pending`. NO fake success.
 *
 * Idempotency:
 *   The RPC is idempotent on the approval_id. Re-firing the same approval
 *   returns `{ success: true, idempotent: true }` without re-running the
 *   side effect.
 */
import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { getUserRole } from "@/lib/auth/get-user-role"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type Decision = "approve" | "deny"

interface ApprovalRow {
  id: string
  parent_id: string
  teen_id: string
  action_type: string
  resource_type: string | null
  resource_id: string | null
  status: string
}

function resolveDispatchRpc(actionType: string, decision: Decision): {
  name: string
  withReason: boolean
} | null {
  const map: Record<string, { approve: string; deny: string; denyReason: boolean }> = {
    coach_meeting: {
      approve: "parent_approve_session_v2",
      deny: "parent_deny_session_v2",
      denyReason: true,
    },
    ride: {
      approve: "parent_approve_ride",
      deny: "parent_deny_ride",
      denyReason: true,
    },
    food_order: {
      approve: "parent_approve_food",
      deny: "parent_deny_food",
      denyReason: true,
    },
    purchase_above_ceiling: {
      approve: "parent_approve_purchase",
      deny: "parent_deny_purchase",
      denyReason: true,
    },
    content: {
      approve: "parent_approve_content",
      deny: "parent_deny_content",
      denyReason: true,
    },
  }
  const entry = map[actionType]
  if (!entry) return null
  if (decision === "approve") {
    return { name: entry.approve, withReason: false }
  }
  return { name: entry.deny, withReason: entry.denyReason }
}

export async function POST(request: Request) {
  try {
    const userInfo = await getUserRole()
    if (!userInfo) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }
    if (userInfo.role !== "parent") {
      return NextResponse.json({ error: "Réservé aux parents" }, { status: 403 })
    }

    const body = (await request.json()) as {
      approvalId?: string
      approval_id?: string
      action?: string
      decision?: string
      reason?: string
      client_idempotency_key?: string
    }
    const approvalId = body.approvalId ?? body.approval_id
    const rawDecision = (body.decision ?? body.action ?? "").toLowerCase()
    const decision: Decision | null =
      rawDecision === "approve" || rawDecision === "approved"
        ? "approve"
        : rawDecision === "deny" || rawDecision === "denied" || rawDecision === "reject"
        ? "deny"
        : null

    if (!approvalId || !decision) {
      return NextResponse.json({ error: "Paramètres manquants" }, { status: 400 })
    }

    const supabase = await createClient()

    // Verify the approval belongs to this parent and is still pending.
    const { data: approval, error: fetchError } = await supabase
      .from("parental_approvals")
      .select("id, parent_id, teen_id, action_type, resource_type, resource_id, status")
      .eq("id", approvalId)
      .maybeSingle<ApprovalRow>()

    if (fetchError) {
      console.error("[parent/approvals] fetch error:", fetchError)
      return NextResponse.json({ error: "Erreur de lecture" }, { status: 500 })
    }
    if (!approval) {
      return NextResponse.json({ error: "Approbation non trouvée" }, { status: 404 })
    }
    if (approval.parent_id !== userInfo.profileId) {
      return NextResponse.json({ error: "Approbation non autorisée" }, { status: 403 })
    }
    if (approval.status !== "pending") {
      // Idempotent replay: surface previous decision without re-dispatch.
      return NextResponse.json({
        success: true,
        idempotent: true,
        data: {
          approvalId: approval.id,
          status: approval.status,
          actionType: approval.action_type,
          resourceType: approval.resource_type,
          resourceId: approval.resource_id,
        },
      })
    }

    // Verify active link.
    const { data: link } = await supabase
      .from("parent_teen_links")
      .select("id")
      .eq("parent_id", userInfo.profileId)
      .eq("teen_id", approval.teen_id)
      .eq("status", "active")
      .maybeSingle()
    if (!link) {
      return NextResponse.json({ error: "Lien parent-teen inactif" }, { status: 403 })
    }

    const dispatch = resolveDispatchRpc(approval.action_type, decision)
    if (!dispatch) {
      return NextResponse.json(
        { error: `Type d'action non supporté: ${approval.action_type}` },
        { status: 400 }
      )
    }

    // Service-role client invokes the SECURITY DEFINER RPC. The RPC re-checks
    // auth.uid() vs p_parent_id; we pass userInfo.profileId from the session.
    const sr = createServiceRoleClient()
    const args: Record<string, unknown> = {
      p_approval_id: approval.id,
      p_parent_id: userInfo.profileId,
    }
    if (dispatch.withReason) {
      args.p_reason = body.reason ?? null
    }

    const { data: rpcResult, error: rpcError } = await sr.rpc(dispatch.name, args)

    if (rpcError) {
      console.error(`[parent/approvals] RPC ${dispatch.name} error:`, rpcError)
      return NextResponse.json(
        { error: "Échec de l'exécution: " + rpcError.message },
        { status: 500 }
      )
    }

    // The RPC returns jsonb; if `success: false`, surface it as a real error.
    const result = (rpcResult as { success?: boolean; error?: string } | null) ?? null
    if (!result?.success) {
      const errCode = result?.error ?? "rpc_failed"
      const status =
        errCode === "approval_not_found" ? 404 :
        errCode === "not_owner" || errCode === "unauthorized_caller" || errCode === "not_linked_parent" ? 403 :
        errCode === "approval_not_pending" || errCode === "wrong_action_type" ? 400 :
        500
      return NextResponse.json({ error: errCode, rpc: dispatch.name, raw: result }, { status })
    }

    return NextResponse.json({
      success: true,
      data: {
        approvalId: approval.id,
        status: decision === "approve" ? "approved" : "denied",
        teenId: approval.teen_id,
        actionType: approval.action_type,
        resourceType: approval.resource_type,
        resourceId: approval.resource_id,
        rpc: dispatch.name,
        result,
      },
    })
  } catch (error) {
    console.error("[parent/approvals] unhandled error:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
