/**
 * Wave 4A — canonical moderation decision endpoint (canon §3).
 *
 * POST /api/admin/moderation/[id]/decision
 *   { decision: ModerationDecision, reason?: string }
 *
 * Atomic order (canon §10 FORBIDDEN #6/#7/#8/#9):
 *   1. Auth gate — admin / super_admin / moderator only via canonical
 *      requireAdminPermission('content.view').
 *   2. Reason validation — destructive decisions (delete/warn/suspend)
 *      require a non-empty reason.
 *   3. Resolve queue row — must be in 'pending'; idempotency: re-applied
 *      decisions return 409 already_reviewed (no fake success on replay).
 *   4. Resolve content adapter — if no adapter for this content_type OR no
 *      adapter mapping for this decision, respond 409 unsupported_action
 *      (NEVER fake success).
 *   5. Apply content-row UPDATE (real effect).
 *   6. Update moderation_queue.status accordingly.
 *   7. Sync user_reports for the same (content_type, content_id) — best-
 *      effort but errors are surfaced.
 *   8. logAdminAction → audit_log (singular, throws on failure per canon).
 *   9. Notify content owner via user_notifications (best-effort, non-fatal).
 *
 * If audit_log insert fails, the whole route returns 500 — the queue+content
 * updates have already happened, but the failure is loud (no silent catch).
 */
import { NextResponse } from "next/server"
import { z } from "zod"
import type { SupabaseClient } from "@supabase/supabase-js"
import {
  logAdminAction,
  requireAdminPermission,
} from "@/lib/auth/admin-permissions"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import {
  DECISIONS_REQUIRING_REASON,
  adapterFor,
  type ModerationDecision,
} from "@/lib/admin/moderation-adapters"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const bodySchema = z.object({
  decision: z.enum([
    "dismiss",
    "hide",
    "delete",
    "restore",
    "escalate",
    "warn",
    "suspend",
  ] as const satisfies readonly ModerationDecision[]),
  reason: z.string().max(1000).optional(),
})

const QUEUE_STATUS_BY_DECISION: Record<ModerationDecision, string> = {
  dismiss: "approved",
  hide: "rejected",
  delete: "rejected",
  restore: "approved",
  escalate: "escalated",
  warn: "rejected",
  suspend: "rejected",
}

export async function POST(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id: queueId } = await ctx.params
  if (!queueId) {
    return NextResponse.json(
      { success: false, error: "id_required" },
      { status: 400 },
    )
  }

  // Parse body up-front so we can return 400 even before the auth gate.
  let body: z.infer<typeof bodySchema>
  try {
    body = bodySchema.parse(await request.json())
  } catch {
    return NextResponse.json(
      { success: false, error: "invalid_body" },
      { status: 400 },
    )
  }
  const decision = body.decision
  const reason = body.reason?.trim() ?? ""

  if (DECISIONS_REQUIRING_REASON.has(decision) && !reason) {
    return NextResponse.json(
      { success: false, error: "reason_required", decision },
      { status: 400 },
    )
  }

  // Canonical permission gate.
  let admin
  try {
    admin = await requireAdminPermission("content.view")
  } catch {
    return NextResponse.json({ success: false, error: "forbidden" }, { status: 403 })
  }

  // Untyped on purpose: `moderation_queue` / `user_reports` and the
  // adapter-resolved content tables (e.g. `partner_offers`) predate the
  // last `types/supabase.ts` codegen and are absent from the generated
  // `Database` type even though they exist live (see migrations
  // 055/056/097). Casting to the base `SupabaseClient` here avoids a
  // false "table does not exist" tsc error for tables that are real in
  // the DB but missing from the (stale) generated schema, and avoids
  // resolving `.from(adapter.table)` against the full table-name union.
  const sr = createServiceRoleClient() as unknown as SupabaseClient

  const { data: queueRow, error: fetchErr } = await sr
    .from("moderation_queue")
    .select("id, content_type, content_id, status")
    .eq("id", queueId)
    .maybeSingle()
  if (fetchErr) {
    return NextResponse.json(
      { success: false, error: fetchErr.message },
      { status: 500 },
    )
  }
  if (!queueRow) {
    return NextResponse.json({ success: false, error: "not_found" }, { status: 404 })
  }
  if (queueRow.status !== "pending") {
    return NextResponse.json(
      { success: false, error: "already_reviewed", status: queueRow.status },
      { status: 409 },
    )
  }

  const adapter = adapterFor(queueRow.content_type)
  if (!adapter) {
    return NextResponse.json(
      {
        success: false,
        error: "unsupported_content_type",
        content_type: queueRow.content_type,
      },
      { status: 409 },
    )
  }
  const update = adapter.effectFor(decision)
  if (!update) {
    return NextResponse.json(
      {
        success: false,
        error: "unsupported_action",
        content_type: queueRow.content_type,
        decision,
      },
      { status: 409 },
    )
  }

  // Resolve the content owner BEFORE applying the update so we can notify
  // even if the update reshapes the row.
  let ownerId: string | null = null
  if (queueRow.content_id) {
    const { data: contentRow } = await sr
      .from(adapter.table)
      .select(`id, ${adapter.ownerCol}`)
      .eq("id", queueRow.content_id)
      .maybeSingle()
    if (contentRow) {
      const asRecord = contentRow as unknown as Record<string, unknown>
      const v = asRecord[adapter.ownerCol]
      ownerId = typeof v === "string" ? v : null
    }
  }

  // Apply real effect on the source row. Hard fail on error — never fake success.
  if (queueRow.content_id) {
    const { error: contentErr } = await sr
      .from(adapter.table)
      .update(update)
      .eq("id", queueRow.content_id)
    if (contentErr) {
      return NextResponse.json(
        {
          success: false,
          error: "content_update_failed",
          detail: contentErr.message,
        },
        { status: 500 },
      )
    }
  }

  // Flip queue status.
  const nowIso = new Date().toISOString()
  const { error: queueErr } = await sr
    .from("moderation_queue")
    .update({
      status: QUEUE_STATUS_BY_DECISION[decision],
      reason: reason || null,
      reviewed_by: admin.profileId,
      reviewed_at: nowIso,
    })
    .eq("id", queueId)
  if (queueErr) {
    return NextResponse.json(
      { success: false, error: queueErr.message },
      { status: 500 },
    )
  }

  // Sync user_reports for the same content.
  //
  // Wave 6H — fix: filter on `status='open'`, NOT `'pending'`. The
  // canonical user_reports.status enum (mig 097) is
  // {open, actioned, dismissed}; new reports are stored as `'open'` by
  // /api/teen/report. The previous `'pending'` filter never matched
  // any rows, so reports stayed open forever even after a decision —
  // the inbox showed "actioned" while the report rows didn't sync.
  //
  // Also fail-loud: a silent user_reports sync error would let the
  // moderation inbox claim a decision that didn't propagate.
  const { error: reportsErr } = await sr
    .from("user_reports")
    .update({
      status: decision === "dismiss" || decision === "restore" ? "dismissed" : "actioned",
      resolved_by: admin.profileId,
      resolved_at: nowIso,
    })
    .eq("target_type", queueRow.content_type)
    .eq("target_id", queueRow.content_id)
    .eq("status", "open")
  if (reportsErr) {
    return NextResponse.json(
      {
        success: false,
        error: "user_reports_sync_failed",
        detail: reportsErr.message,
      },
      { status: 500 },
    )
  }

  // Audit log — throws on failure (canon §10 FORBIDDEN #9).
  await logAdminAction({
    actor_id: admin.profileId,
    actor_role: admin.subRole,
    action: `moderation.${decision}`,
    resource_type: queueRow.content_type,
    resource_id: queueRow.content_id,
    target_user_id: ownerId,
    metadata: {
      queue_id: queueId,
      decision,
      reason: reason || null,
      previous_status: queueRow.status,
    },
  })

  // Notify owner. Failure here is non-fatal — the moderation has already
  // been recorded + audited.
  if (ownerId && (decision === "hide" || decision === "delete" || decision === "warn")) {
    await sr.from("user_notifications").insert({
      user_id: ownerId,
      title: decision === "warn" ? "Avertissement" : "Contenu modéré",
      body: reason || "Votre contenu a été modéré par l'équipe Nivy.",
      priority: "normal",
      data: {
        kind: `moderation.${decision}`,
        content_type: queueRow.content_type,
        content_id: queueRow.content_id,
        reason: reason || null,
      },
    })
  }

  return NextResponse.json({
    success: true,
    queue_id: queueId,
    content_type: queueRow.content_type,
    content_id: queueRow.content_id,
    decision,
    queue_status: QUEUE_STATUS_BY_DECISION[decision],
  })
}
