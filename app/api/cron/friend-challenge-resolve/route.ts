/**
 * Wave 2 / TICKET-022 — Friend-challenge resolution cron (FD4).
 *
 * Runs every hour at :30 UTC (registered in `vercel.json`).
 *
 * Two sweeps:
 *   1. **Resolve completed challenges** — `friend_challenges` rows where
 *      `status='active' AND ends_at < NOW()`. Each is handed to the
 *      `resolve_friend_challenge_v2` SECURITY DEFINER RPC (FD1 owns) which
 *      picks a winner from `progress_creator` vs `progress_opponent`,
 *      settles the `xp_pot` via `xp_transactions`, marks
 *      `status='completed'` + `completed_at=NOW()`, and queues
 *      `user_notifications` rows for both participants.
 *
 *   2. **Expire stale invites** — rows where
 *      `acceptance_status='pending' AND expires_at < NOW()`. The cron
 *      flips `acceptance_status='expired'`, `status='expired'` directly
 *      (idempotent, no escrow refund needed: nothing was credited until
 *      acceptance).
 *
 * Schedule: `30 * * * *` UTC (every hour at :30 — :30 every Casablanca
 * hour). The hourly cadence is sufficient — challenges have minute-grain
 * `ends_at` but in-flight progress is denormalised onto the row, so
 * resolution can lag up to 60 min without losing fidelity.
 *
 * Auth: fail-closed `CRON_SECRET` pattern (Wave A.7). Vercel cron is
 * detected via `x-vercel-cron` header; manual invocations need
 * `Authorization: Bearer ${CRON_SECRET}`.
 *
 * Resilience: if `resolve_friend_challenge_v2` is not yet deployed (FD1
 * hand-off not complete), the RPC error is logged per-challenge and the
 * sweep continues — the cron will pick the same row up next hour.
 */

import { NextResponse } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

type ResolveOutcome = {
  challenge_id: string
  ok: boolean
  error?: string
  winner_id?: string | null
}

type ExpireOutcome = {
  challenge_id: string
  ok: boolean
  error?: string
}

export async function GET(request: Request) {
  // ---- Authorization (fail-closed) ---------------------------------------
  const authHeader = request.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET
  const isVercelCron = request.headers.get("x-vercel-cron") !== null

  if (!isVercelCron) {
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
  }

  const supabase = createServiceRoleClient()
  const startedAt = Date.now()
  const nowIso = new Date().toISOString()

  // =======================================================================
  // Sweep 1 — resolve active challenges past their ends_at
  // =======================================================================
  const { data: dueRows, error: dueErr } = await supabase
    .from("friend_challenges")
    .select("id")
    .eq("status", "active")
    .lt("ends_at", nowIso)
    .order("ends_at", { ascending: true })
    .limit(500)

  if (dueErr) {
    console.error(
      "[cron/friend-challenge-resolve] active sweep query failed:",
      dueErr
    )
    return NextResponse.json(
      { error: "Failed to enumerate due challenges", detail: dueErr.message },
      { status: 500 }
    )
  }

  const resolveResults: ResolveOutcome[] = []
  for (const row of dueRows ?? []) {
    const challengeId = (row as { id: string }).id
    const { data, error } = await supabase.rpc("resolve_friend_challenge_v2", {
      p_challenge_id: challengeId,
    })
    if (error) {
      console.error(
        `[cron/friend-challenge-resolve] resolve RPC failed for ${challengeId}:`,
        error
      )
      resolveResults.push({
        challenge_id: challengeId,
        ok: false,
        error: error.message,
      })
      continue
    }
    // RPC may return the winner_id (uuid|null) or void; normalise.
    const winnerId =
      data && typeof data === "object" && "winner_id" in data
        ? ((data as { winner_id: string | null }).winner_id ?? null)
        : typeof data === "string"
          ? data
          : null
    resolveResults.push({
      challenge_id: challengeId,
      ok: true,
      winner_id: winnerId,
    })
  }

  // =======================================================================
  // Sweep 2 — expire stale pending invitations
  // =======================================================================
  const { data: staleRows, error: staleErr } = await supabase
    .from("friend_challenges")
    .select("id")
    .eq("acceptance_status", "pending")
    .lt("expires_at", nowIso)
    .not("expires_at", "is", null)
    .order("expires_at", { ascending: true })
    .limit(500)

  if (staleErr) {
    console.error(
      "[cron/friend-challenge-resolve] pending sweep query failed:",
      staleErr
    )
    // Continue — sweep 1 results are still worth returning.
  }

  const expireResults: ExpireOutcome[] = []
  for (const row of staleRows ?? []) {
    const challengeId = (row as { id: string }).id
    const { error } = await supabase
      .from("friend_challenges")
      .update({
        acceptance_status: "expired",
        status: "expired",
      })
      .eq("id", challengeId)
      .eq("acceptance_status", "pending") // race-safe: only flip if still pending
    if (error) {
      console.error(
        `[cron/friend-challenge-resolve] expire update failed for ${challengeId}:`,
        error
      )
      expireResults.push({
        challenge_id: challengeId,
        ok: false,
        error: error.message,
      })
      continue
    }
    expireResults.push({ challenge_id: challengeId, ok: true })
  }

  // ---- Audit log (best effort) -------------------------------------------
  const resolved = resolveResults.filter((r) => r.ok).length
  const resolveErrors = resolveResults.length - resolved
  const expired = expireResults.filter((r) => r.ok).length
  const expireErrors = expireResults.length - expired
  const durationMs = Date.now() - startedAt

  try {
    await supabase.from("admin_audit_logs").insert({
      user_id: null,
      action: "cron.friend_challenge_resolve",
      target_type: "system",
      target_id: null,
      payload: {
        resolved,
        resolve_errors: resolveErrors,
        expired,
        expire_errors: expireErrors,
        duration_ms: durationMs,
        triggered_by: isVercelCron ? "vercel-cron" : "bearer",
        resolve_results: resolveResults,
        expire_results: expireResults,
      },
    })
  } catch (auditErr) {
    console.error(
      "[cron/friend-challenge-resolve] audit log insert failed:",
      auditErr
    )
  }

  return NextResponse.json({
    resolved,
    resolve_errors: resolveErrors,
    expired,
    expire_errors: expireErrors,
    duration_ms: durationMs,
    resolve_results: resolveResults,
    expire_results: expireResults,
  })
}
