/**
 * Wave 2.2 — Allowance disbursement cron.
 *
 * Runs daily at 09:00 Africa/Casablanca (registered in `vercel.json`).
 * For every active `parent_allowances` row whose `next_disbursement_at` has
 * elapsed and whose pause window has lifted, call `disburse_allowance(p_id)`
 * which atomically tops up via `top_up_teen` and advances the schedule.
 *
 * Auth: must be a Vercel cron invocation (`x-vercel-cron` header) OR carry
 *       `Authorization: Bearer <CRON_SECRET>` (env var).
 */

import { NextResponse } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

interface DisburseResult {
  success: boolean
  status?: string
  disbursement_id?: string
  payment_id?: string
  amount_coins?: number
  skip_reason?: string
  next_at?: string
  error?: string
}

export async function GET(request: Request) {
  const isVercelCron = request.headers.get("x-vercel-cron") !== null
  const authHeader = request.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET
  const hasValidBearer =
    typeof cronSecret === "string" &&
    cronSecret.length > 0 &&
    authHeader === `Bearer ${cronSecret}`

  if (!isVercelCron && !hasValidBearer) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const supabase = createServiceRoleClient()
  const startedAt = Date.now()

  // Pull due allowances.
  const nowIso = new Date().toISOString()
  const { data: due, error: dueErr } = await supabase
    .from("parent_allowances")
    .select("id, parent_id, teen_id, amount_dh, next_disbursement_at, paused_until")
    .eq("is_active", true)
    .lte("next_disbursement_at", nowIso)
    .or(`paused_until.is.null,paused_until.lt.${nowIso}`)

  if (dueErr) {
    console.error("[cron/disburse-allowances] query failed:", dueErr)
    return NextResponse.json(
      { error: "Failed to enumerate allowances", detail: dueErr.message },
      { status: 500 }
    )
  }

  let succeeded = 0
  let skipped = 0
  let failed = 0
  const perAllowance: Array<{
    allowance_id: string
    teen_id: string
    status: string
    error?: string
  }> = []

  for (const row of due ?? []) {
    const { data, error } = await supabase.rpc("disburse_allowance", {
      p_allowance_id: row.id,
    })
    const result = data as DisburseResult | null

    if (error) {
      failed += 1
      perAllowance.push({
        allowance_id: row.id,
        teen_id: row.teen_id,
        status: "rpc_error",
        error: error.message,
      })
      continue
    }

    if (!result?.success) {
      failed += 1
      perAllowance.push({
        allowance_id: row.id,
        teen_id: row.teen_id,
        status: result?.status ?? "failed",
        error: result?.error,
      })
      continue
    }

    if (result.status === "succeeded") {
      succeeded += 1
    } else if (result.status === "skipped") {
      skipped += 1
    }
    perAllowance.push({
      allowance_id: row.id,
      teen_id: row.teen_id,
      status: result.status ?? "unknown",
    })
  }

  const durationMs = Date.now() - startedAt

  try {
    await supabase.from("admin_audit_logs").insert({
      user_id: null,
      action: "cron.disburse_allowances",
      target_type: "system",
      target_id: null,
      payload: {
        candidates: due?.length ?? 0,
        succeeded,
        skipped,
        failed,
        duration_ms: durationMs,
        per_allowance: perAllowance,
        triggered_by: isVercelCron ? "vercel-cron" : "bearer",
      },
    })
  } catch (auditErr) {
    console.error("[cron/disburse-allowances] audit log insert failed:", auditErr)
  }

  return NextResponse.json({
    candidates: due?.length ?? 0,
    succeeded,
    skipped,
    failed,
    duration_ms: durationMs,
    per_allowance: perAllowance,
  })
}
