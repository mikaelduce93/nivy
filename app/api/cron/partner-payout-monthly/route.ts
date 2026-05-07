/**
 * W-D.11 — Monthly partner payout rollup cron.
 *
 * Schedule: 1st of each month, 04:00 UTC.
 * For the previous calendar month, aggregates partner_transactions where
 * status='succeeded', and inserts one partner_payouts row per partner with
 * total_dh = sum(amount_dh) - sum(commission_dh) (net to partner).
 * Reference field holds the gross/commission breakdown as a JSON string for
 * downstream invoice rendering.
 *
 * Idempotency: skips a partner if a payout for the same period already exists.
 *
 * Auth: Vercel cron header OR Bearer CRON_SECRET, fail-CLOSED.
 */

import { NextRequest, NextResponse } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

function previousMonthRange(now: Date): { start: string; end: string; label: string } {
  // start = first day of previous month, end = last day of previous month
  const y = now.getUTCFullYear()
  const m = now.getUTCMonth() // 0..11 — current month
  const startD = new Date(Date.UTC(y, m - 1, 1))
  const endD = new Date(Date.UTC(y, m, 0)) // day 0 of current = last day prev
  const fmt = (d: Date) => d.toISOString().slice(0, 10)
  return {
    start: fmt(startD),
    end: fmt(endD),
    label: `${startD.getUTCFullYear()}-${String(startD.getUTCMonth() + 1).padStart(2, "0")}`,
  }
}

export async function GET(request: NextRequest) {
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

  const startedAt = Date.now()
  const supabase = createServiceRoleClient()

  // Probe partner_payouts table.
  const { error: probeErr } = await supabase
    .from("partner_payouts")
    .select("id", { count: "exact", head: true })
    .limit(1)
  if (probeErr) {
    console.warn(
      "[cron/partner-payout-monthly] partner_payouts table missing:",
      probeErr.message,
    )
    return NextResponse.json({
      skipped: true,
      reason: "partner_payouts table does not exist",
      duration_ms: Date.now() - startedAt,
    })
  }

  const { start, end, label } = previousMonthRange(new Date())
  const periodStartIso = `${start}T00:00:00Z`
  // end-of-day exclusive boundary: next day 00:00
  const endNext = new Date(`${end}T00:00:00Z`)
  endNext.setUTCDate(endNext.getUTCDate() + 1)
  const periodEndIso = endNext.toISOString()

  // Pull all succeeded transactions in the window.
  const { data: txs, error: txErr } = await supabase
    .from("partner_transactions")
    .select("partner_id, amount_dh, commission_dh, status, scanned_at, created_at")
    .eq("status", "succeeded")
    .gte("created_at", periodStartIso)
    .lt("created_at", periodEndIso)

  if (txErr) {
    console.error("[cron/partner-payout-monthly] tx query failed:", txErr)
    return NextResponse.json(
      { error: "Failed to query transactions", detail: txErr.message },
      { status: 500 },
    )
  }

  type Agg = { gross: number; commission: number; count: number }
  const agg = new Map<string, Agg>()
  for (const t of txs ?? []) {
    if (!t.partner_id) continue
    const a = agg.get(t.partner_id) ?? { gross: 0, commission: 0, count: 0 }
    a.gross += Number(t.amount_dh ?? 0)
    a.commission += Number(t.commission_dh ?? 0)
    a.count += 1
    agg.set(t.partner_id, a)
  }

  let created = 0
  let skippedExisting = 0
  const errors: Array<{ partner_id: string; error: string }> = []

  for (const [partnerId, a] of agg.entries()) {
    try {
      // Idempotency: any existing payout for this partner+period?
      const { data: existing } = await supabase
        .from("partner_payouts")
        .select("id")
        .eq("partner_id", partnerId)
        .eq("period_start", start)
        .eq("period_end", end)
        .limit(1)

      if (existing && existing.length > 0) {
        skippedExisting++
        continue
      }

      const net = +(a.gross - a.commission).toFixed(2)
      const reference = JSON.stringify({
        gross_dh: +a.gross.toFixed(2),
        commission_dh: +a.commission.toFixed(2),
        net_dh: net,
        tx_count: a.count,
        period_label: label,
      })

      const { error: insErr } = await supabase.from("partner_payouts").insert({
        partner_id: partnerId,
        period_start: start,
        period_end: end,
        total_dh: net,
        status: "pending",
        reference,
      })
      if (insErr) throw insErr

      // Best-effort partner notification (assumes partner_id == auth user id).
      try {
        await supabase.from("user_notifications").insert({
          user_id: partnerId,
          title: "Versement mensuel pret",
          body: `Periode ${label}: ${a.count} transactions, net ${net.toFixed(2)} DH.`,
          priority: "normal",
          emoji: "💰",
          action_url: "/partner/payouts",
        })
      } catch (notifErr) {
        console.warn(
          `[cron/partner-payout-monthly] notify failed for ${partnerId}:`,
          notifErr,
        )
      }

      created++
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      errors.push({ partner_id: partnerId, error: msg })
      console.error(
        `[cron/partner-payout-monthly] partner ${partnerId} failed:`,
        msg,
      )
    }
  }

  return NextResponse.json({
    period: { start, end, label },
    partners_with_activity: agg.size,
    payouts_created: created,
    skipped_existing: skippedExisting,
    errors,
    duration_ms: Date.now() - startedAt,
  })
}
