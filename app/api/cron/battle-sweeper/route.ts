/**
 * G4 §3.3 / §8 J3 — Battle sweeper cron (filet de sécurité).
 *
 * Schedule: toutes les 10 minutes (entrée vercel.json).
 * Appelle la RPC `sweep_battles()` (mig 182, service_role UNIQUEMENT) qui
 * expire en un seul aller-retour :
 *   - `invited` dont le TTL 24 h (`expires_at`) est dépassé ;
 *   - `lobby` inactif > 10 min (aucun heartbeat participant récent) ;
 *   - `active` bloquée > 15 min ⇒ `expired`, 0 XP (le ledger reste vierge).
 *
 * Pas de ticker serveur dans la stack : ce cron + `advance_battle_round`
 * idempotent côté participants sont le filet contre les battles zombies
 * (spec §10, red-team « round resté ouvert »).
 *
 * Auth: Vercel cron header OR Bearer CRON_SECRET, fail-CLOSED.
 */

import { NextRequest, NextResponse } from "next/server"
import type { SupabaseClient } from "@supabase/supabase-js"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { logDbError } from "@/lib/observability/log-db-error"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

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
  // `sweep_battles` (mig 182) postdates the last `types/supabase.ts` codegen
  // and is absent from the generated `Database` type even though it exists
  // live. Cast to the base `SupabaseClient` to avoid a false "function does
  // not exist" tsc error (same pattern as app/api/admin/moderation/*).
  const supabase = createServiceRoleClient() as unknown as SupabaseClient

  const { data, error } = await supabase.rpc("sweep_battles")
  if (error) {
    logDbError("cron.battle-sweeper.sweep_battles", error)
    return NextResponse.json(
      { error: "sweep_battles failed", detail: error.message },
      { status: 500 },
    )
  }

  // Contrat mig 182 : jsonb { success, expired_invited, expired_lobby,
  // expired_active }. On relaye tel quel + compteurs dans les logs.
  const counters =
    data && typeof data === "object" ? (data as Record<string, unknown>) : {}
  const durationMs = Date.now() - startedAt

  console.log(
    `[cron/battle-sweeper] done expired_invited=${counters.expired_invited ?? 0} expired_lobby=${counters.expired_lobby ?? 0} expired_active=${counters.expired_active ?? 0} duration_ms=${durationMs}`,
  )

  return NextResponse.json({
    ...counters,
    duration_ms: durationMs,
  })
}
