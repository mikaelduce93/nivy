/**
 * G4 §8 J8 — Détection différée anti-triche battles (red-team #2/#4).
 *
 * Schedule: quotidien 03:00 UTC (entrée vercel.json).
 * Appelle la RPC `detect_battle_anomalies()` (mig 184, service_role) qui
 * écrit dans `audit_log` :
 *   (a) `battle.suspect_pattern`   — teen ≥ 10 battles, justesse ≥ 95 % ET
 *       variance `response_ms` anormalement faible (bot calibré) ;
 *   (b) `battle.suspect_collusion` — paire ≥ 5 battles, victoires
 *       unilatérales ≥ 90 % ET réponses du perdant systématiquement fausses.
 * Revue humaine ensuite (surface admin) — AUCUNE sanction automatique v1.
 *
 * Tolérant au déploiement : la mig 184 arrive dans un train parallèle. Si la
 * RPC n'existe pas encore (42883 / PGRST202), le cron log + renvoie
 * `{ skipped: true }` sans erreur 500 — il commence à travailler dès que la
 * migration est appliquée, sans changement de code.
 *
 * Auth: Vercel cron header OR Bearer CRON_SECRET, fail-CLOSED.
 */

import { NextRequest, NextResponse } from "next/server"
import type { SupabaseClient } from "@supabase/supabase-js"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { logDbError } from "@/lib/observability/log-db-error"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

/** Fonction absente en base (mig 184 pas encore appliquée) : 42883 / PGRST202. */
function isMissingFunction(error: {
  code?: string
  message?: string
}): boolean {
  if (error.code === "42883" || error.code === "PGRST202") return true
  const msg = error.message ?? ""
  return /function/i.test(msg) && /does not exist|could not find/i.test(msg)
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
  // `detect_battle_anomalies` (mig 184) postdates the last `types/supabase.ts`
  // codegen and is absent from the generated `Database` type. Cast to the
  // base `SupabaseClient` to avoid a false "function does not exist" tsc
  // error (same pattern as app/api/admin/moderation/*).
  const supabase = createServiceRoleClient() as unknown as SupabaseClient

  const { data, error } = await supabase.rpc("detect_battle_anomalies")
  if (error) {
    if (isMissingFunction(error)) {
      console.warn(
        `[cron/battle-anticheat] detect_battle_anomalies missing (mig 184 not applied yet): ${error.message}`,
      )
      return NextResponse.json({
        skipped: true,
        reason:
          "detect_battle_anomalies RPC does not exist yet; cron is a no-op awaiting migration 184",
        duration_ms: Date.now() - startedAt,
      })
    }
    logDbError("cron.battle-anticheat.detect_battle_anomalies", error)
    return NextResponse.json(
      { error: "detect_battle_anomalies failed", detail: error.message },
      { status: 500 },
    )
  }

  // Contrat mig 184 : jsonb de compteurs (suspect_pattern / suspect_collusion
  // détectés, lignes audit_log écrites…). On relaye tel quel + logs.
  const counters =
    data && typeof data === "object" ? (data as Record<string, unknown>) : {}
  const durationMs = Date.now() - startedAt

  console.log(
    `[cron/battle-anticheat] done ${JSON.stringify(counters)} duration_ms=${durationMs}`,
  )

  return NextResponse.json({
    ...counters,
    duration_ms: durationMs,
  })
}
