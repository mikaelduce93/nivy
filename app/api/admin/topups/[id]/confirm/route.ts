/**
 * Wave Ops-D — Admin confirms or rejects a manual top-up request.
 *
 * POST /api/admin/topups/[id]/confirm
 *   Body: { action: 'confirm' | 'reject', reason?: string }
 *
 *   confirm → calls top_up_teen(parent, teen, amount_dh, 'manual_<provider>', provider_ref)
 *             via service-role; on success flips manual_topup_requests row to
 *             status='confirmed' with payment_transaction_id linked.
 *   reject  → flips status='rejected' with the supplied reason.
 *
 * MONEY ROUTE — admin-only, audit-logged. Idempotent: if the underlying
 * (provider, provider_ref) already has a succeeded payment, the RPC returns
 * idempotent_replay=true and we still mark the request 'confirmed'.
 */
import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

interface ConfirmBody {
  action?: "confirm" | "reject"
  reason?: string
}

async function requireAdmin(): Promise<
  { ok: true; userId: string } | { ok: false; res: NextResponse }
> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return {
      ok: false,
      res: NextResponse.json({ success: false, error: "unauthenticated" }, { status: 401 }),
    }
  }
  const sr = createServiceRoleClient()
  const { data: role } = await sr
    .from("admin_roles")
    .select("role")
    .eq("profile_id", user.id)
    .maybeSingle()
  if (!role || !["admin", "super_admin", "moderator"].includes(role.role)) {
    return {
      ok: false,
      res: NextResponse.json({ success: false, error: "forbidden" }, { status: 403 }),
    }
  }
  return { ok: true, userId: user.id }
}

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin()
  if (!auth.ok) return auth.res

  const { id } = await context.params
  if (!id) {
    return NextResponse.json({ success: false, error: "missing_id" }, { status: 400 })
  }

  let body: ConfirmBody
  try {
    body = (await req.json()) as ConfirmBody
  } catch {
    return NextResponse.json({ success: false, error: "invalid_json" }, { status: 400 })
  }

  const action = body.action
  if (action !== "confirm" && action !== "reject") {
    return NextResponse.json({ success: false, error: "invalid_action" }, { status: 400 })
  }

  const sr = createServiceRoleClient()

  // Fetch the request row (and lock semantically by checking status).
  const { data: reqRow, error: fetchErr } = await sr
    .from("manual_topup_requests")
    .select("id, parent_id, teen_id, amount_dh, provider, provider_ref, status")
    .eq("id", id)
    .maybeSingle()

  if (fetchErr) {
    return NextResponse.json({ success: false, error: fetchErr.message }, { status: 500 })
  }
  if (!reqRow) {
    return NextResponse.json({ success: false, error: "not_found" }, { status: 404 })
  }
  if (reqRow.status !== "pending") {
    return NextResponse.json(
      { success: false, error: "already_decided", status: reqRow.status },
      { status: 422 }
    )
  }

  if (action === "reject") {
    const reason = (body.reason ?? "").trim()
    const { error: updErr } = await sr
      .from("manual_topup_requests")
      .update({
        status: "rejected",
        rejection_reason: reason || null,
        decided_by: auth.userId,
        decided_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("status", "pending")
    if (updErr) {
      return NextResponse.json({ success: false, error: updErr.message }, { status: 500 })
    }

    try {
      await sr.from("admin_audit_logs").insert({
        user_id: auth.userId,
        action: "manual_topup.reject",
        target_type: "manual_topup_request",
        target_id: id,
        payload: {
          reason,
          amount_dh: reqRow.amount_dh,
          provider: reqRow.provider,
          provider_ref: reqRow.provider_ref,
          parent_id: reqRow.parent_id,
          teen_id: reqRow.teen_id,
        },
      })
    } catch (e) {
      console.warn("[admin/topups/confirm] audit log failed", e)
    }

    return NextResponse.json({ success: true, status: "rejected" })
  }

  // action === 'confirm' → call top_up_teen via service-role.
  // Use a manual_<provider> psp_provider value so the audit trail clearly
  // distinguishes admin-confirmed manual top-ups from automatic webhook
  // top-ups (when those flip on later).
  const pspProvider = `manual_${reqRow.provider}`
  const { data: rpcData, error: rpcErr } = await sr.rpc("top_up_teen", {
    p_parent_id: reqRow.parent_id,
    p_teen_id: reqRow.teen_id,
    p_amount_dh: reqRow.amount_dh,
    p_provider: pspProvider,
    p_provider_ref: reqRow.provider_ref,
  })

  if (rpcErr) {
    console.error("[admin/topups/confirm] RPC error:", rpcErr)
    return NextResponse.json(
      { success: false, error: rpcErr.message ?? "rpc_failed" },
      { status: 500 }
    )
  }

  if (!rpcData?.success) {
    return NextResponse.json(
      { success: false, error: rpcData?.error ?? "rpc_returned_failure" },
      { status: 422 }
    )
  }

  const paymentId = rpcData.payment_id as string

  const { error: updErr } = await sr
    .from("manual_topup_requests")
    .update({
      status: "confirmed",
      payment_transaction_id: paymentId,
      decided_by: auth.userId,
      decided_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("status", "pending")

  if (updErr) {
    // RPC already credited; ops will need to reconcile. Log loudly.
    console.error(
      `[admin/topups/confirm] CRITICAL — RPC succeeded (payment=${paymentId}) but request row update failed:`,
      updErr
    )
    return NextResponse.json(
      {
        success: true,
        warning: "credited_but_request_row_not_updated",
        payment_id: paymentId,
      },
      { status: 200 }
    )
  }

  try {
    await sr.from("admin_audit_logs").insert({
      user_id: auth.userId,
      action: "manual_topup.confirm",
      target_type: "manual_topup_request",
      target_id: id,
      payload: {
        amount_dh: reqRow.amount_dh,
        provider: reqRow.provider,
        provider_ref: reqRow.provider_ref,
        parent_id: reqRow.parent_id,
        teen_id: reqRow.teen_id,
        payment_id: paymentId,
        idempotent_replay: rpcData.idempotent_replay === true,
      },
    })
  } catch (e) {
    console.warn("[admin/topups/confirm] audit log failed", e)
  }

  return NextResponse.json({
    success: true,
    status: "confirmed",
    payment_id: paymentId,
    new_balance: rpcData.new_balance,
    idempotent_replay: rpcData.idempotent_replay === true,
  })
}
