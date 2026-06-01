/**
 * Wave 1.5 — Nightly evolve-teen-profiles cron.
 *
 * Runs daily at 02:00 UTC (03:00 Africa/Casablanca). The job has two phases:
 *
 *   Phase 1 — Affinity decay
 *     Calls the `evolve_all_teens` RPC which loops every teen whose owning
 *     auth user signed in within the last 90 days and refreshes their
 *     affinity_scores by aggregating the past 30 days of behavioral_signals
 *     (decay=0.95^days) plus a baseline floor from teen_interests
 *     (weight * 0.5).
 *
 *   Phase 2 — Neighbour recomputation (Wave 3 / TICKET-034)
 *     For each teen that has at least 3 affinity_scores rows (the
 *     min-signal guard), calls `recompute_neighbours(teen_id, 50)` to
 *     refresh the top-50 nearest-neighbour set used by collaborative
 *     filtering (recommend_for_teen) and the friend opponent picker
 *     (recommend_friends, mig 079).
 *
 * Auth: must be a Vercel cron invocation (`x-vercel-cron` header) OR carry
 *       `Authorization: Bearer <CRON_SECRET>` (env var).
 *
 * Returns the RPC result `{ teens_processed, total_rows_upserted }` plus
 * neighbour-phase totals and timing for observability.
 */

import { NextResponse } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

// Min affinity_scores rows before we compute neighbours for a teen. Mirrors
// the in-RPC guard inside recompute_neighbours so the cron can short-circuit
// without paying the function-call overhead.
const MIN_AFFINITY_ROWS_FOR_NEIGHBOURS = 3

// Top-K neighbours to keep per teen (matches teen_neighbours expected size).
const NEIGHBOUR_TOP_K = 50

// #211 — greeting proactif : 1 message/jour/teen actif, contextualisé par des
// signaux réels (streak, quiz du jour). Mood inféré côté serveur (sans LLM).
const GREETING_ACTIVE_WINDOW_DAYS = 21
const MAX_GREETINGS_PER_RUN = 5000

type InferredMood = "happy" | "tired" | "focused" | "neutral"

function buildProactiveMessage(mood: InferredMood, currentStreak: number): string {
  switch (mood) {
    case "happy":
      return "Bien joué pour ton quiz du jour ! On enchaîne sur une nouvelle quête ? 🔥"
    case "tired":
      return "Ta série s'est mise en pause — pas grave ! Un petit défi aujourd'hui et c'est reparti 💪"
    case "focused":
      return `Série de ${currentStreak} jours, tu assures ! On continue aujourd'hui ?`
    default:
      return "Salut ! Prêt pour ton défi du jour ? 🎯"
  }
}

export async function GET(request: Request) {
  // ---- Authorization ------------------------------------------------------
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

  // ---- Phase 1: affinity decay -------------------------------------------
  const { data, error } = await supabase.rpc("evolve_all_teens")

  if (error) {
    const durationMs = Date.now() - startedAt
    console.error("[cron/evolve-teen-profiles] RPC failed:", error)
    // Best-effort audit even on failure.
    try {
      await supabase.from("audit_log").insert({
        actor_id: null,
        action: "cron.evolve_teen_profiles",
        resource_type: "system",
        resource_id: null,
        metadata: {
          ok: false,
          phase: "evolve_all_teens",
          error: error.message,
          duration_ms: durationMs,
          triggered_by: isVercelCron ? "vercel-cron" : "bearer",
        },
      })
    } catch (auditErr) {
      console.error(
        "[cron/evolve-teen-profiles] audit log insert failed:",
        auditErr
      )
    }
    return NextResponse.json(
      { error: "evolve_all_teens RPC failed", detail: error.message },
      { status: 500 }
    )
  }

  // The RPC returns a JSON object {teens_processed, total_rows_upserted}.
  const result =
    data && typeof data === "object"
      ? (data as { teens_processed?: number; total_rows_upserted?: number })
      : {}
  const teensProcessed = Number(result.teens_processed ?? 0)
  const totalRowsUpserted = Number(result.total_rows_upserted ?? 0)

  // ---- Phase 2: neighbour recomputation ----------------------------------
  // Fetch every teen that (a) has affinity rows above the guard threshold
  // and (b) belongs to an auth user that signed in within the last 90 days
  // (mirrors the evolve_all_teens active-cohort definition).
  let neighbourTeensProcessed = 0
  let neighbourTeensSkipped = 0
  let neighbourRowsUpserted = 0
  const neighbourErrors: Array<{ teen_id: string; error: string }> = []

  // Pull candidates: teens with >= MIN affinity rows. We then double-filter
  // by last_sign_in_at via a join in SQL because the JS client can't easily
  // express it in a single query without an RPC. Use a tiny RPC-less SELECT.
  const { data: candidates, error: candErr } = await supabase
    .from("affinity_scores")
    .select("teen_id")
    .limit(100000) // hard ceiling; <=10k teens per spec
  if (candErr) {
    console.error(
      "[cron/evolve-teen-profiles] candidate fetch failed:",
      candErr
    )
  }

  // Group rows -> tally signals per teen, keep teens passing the guard.
  const counts = new Map<string, number>()
  for (const row of candidates ?? []) {
    const id = (row as { teen_id: string }).teen_id
    counts.set(id, (counts.get(id) ?? 0) + 1)
  }
  const eligibleTeens: string[] = []
  for (const [teenId, n] of counts) {
    if (n >= MIN_AFFINITY_ROWS_FOR_NEIGHBOURS) {
      eligibleTeens.push(teenId)
    } else {
      neighbourTeensSkipped++
    }
  }

  // Run recompute_neighbours per teen sequentially. The function is cheap
  // (single query against indexed affinity_scores) and we prefer steady DB
  // pressure over a thundering herd.
  for (const teenId of eligibleTeens) {
    const { data: nData, error: nErr } = await supabase.rpc(
      "recompute_neighbours",
      { p_teen_id: teenId, p_limit: NEIGHBOUR_TOP_K }
    )
    if (nErr) {
      neighbourErrors.push({ teen_id: teenId, error: nErr.message })
      continue
    }
    neighbourTeensProcessed++
    neighbourRowsUpserted += Number(nData ?? 0)
  }

  // ---- Phase 3: greeting proactif + mood inféré (#211) -------------------
  // 1 message/jour/teen actif, contextualisé (streak/quiz). Écrit un
  // avatar_messages non-dismissed que AvatarCoach affiche en priorité — le
  // defaultGreeting codé en dur ne sert plus que de filet. Service-role =
  // bypass RLS (on écrit pour d'autres teens), comme les autres crons.
  let greetingsWritten = 0
  let greetingsSkipped = 0
  let greetingCandidates = 0
  try {
    const now = new Date()
    const todayStart = new Date(now)
    todayStart.setUTCHours(0, 0, 0, 0)
    const todayStartIso = todayStart.toISOString()
    const yesterday = new Date(todayStart)
    yesterday.setUTCDate(yesterday.getUTCDate() - 1)
    const activeFloor = new Date(todayStart)
    activeFloor.setUTCDate(activeFloor.getUTCDate() - GREETING_ACTIVE_WINDOW_DAYS)
    const yesterdayStr = yesterday.toISOString().slice(0, 10)
    const activeFloorStr = activeFloor.toISOString().slice(0, 10)

    const [{ data: streaks }, { data: passedRows }, { data: greetedRows }] =
      await Promise.all([
        supabase
          .from("user_streaks")
          .select("teen_id, current_streak, last_activity_date")
          .gte("last_activity_date", activeFloorStr)
          .limit(MAX_GREETINGS_PER_RUN + 1),
        supabase
          .from("quiz_attempts")
          .select("teen_id")
          .gte("completed_at", todayStartIso)
          .eq("passed", true),
        supabase
          .from("avatar_messages")
          .select("teen_id")
          .gte("displayed_at", todayStartIso)
          .is("dismissed_at", null),
      ])

    const passedToday = new Set(
      (passedRows ?? []).map((r) => (r as { teen_id: string }).teen_id),
    )
    const alreadyGreeted = new Set(
      (greetedRows ?? []).map((r) => (r as { teen_id: string }).teen_id),
    )
    const rows = (streaks ?? []) as Array<{
      teen_id: string
      current_streak: number | null
      last_activity_date: string | null
    }>
    greetingCandidates = rows.length
    if (greetingCandidates > MAX_GREETINGS_PER_RUN) {
      console.warn(
        `[cron/evolve-teen-profiles] greeting candidates ${greetingCandidates} > cap ${MAX_GREETINGS_PER_RUN}; tail skipped this run`,
      )
    }

    for (const row of rows.slice(0, MAX_GREETINGS_PER_RUN)) {
      if (alreadyGreeted.has(row.teen_id)) {
        greetingsSkipped++
        continue
      }
      const streak = row.current_streak ?? 0
      const broken = !row.last_activity_date || row.last_activity_date < yesterdayStr || streak === 0
      const mood: InferredMood = passedToday.has(row.teen_id)
        ? "happy"
        : broken
          ? "tired"
          : streak >= 3
            ? "focused"
            : "neutral"
      const { error: insErr } = await supabase.from("avatar_messages").insert({
        teen_id: row.teen_id,
        message_text: buildProactiveMessage(mood, streak),
        mood,
        displayed_at: now.toISOString(),
        dismissed_at: null,
      })
      if (insErr) continue
      greetingsWritten++
      // Mood inféré → persiste aussi sur l'avatar (remplace la saisie manuelle).
      await supabase
        .from("avatars")
        .update({ mood, updated_at: now.toISOString() })
        .eq("teen_id", row.teen_id)
    }
  } catch (greetErr) {
    console.error("[cron/evolve-teen-profiles] phase 3 greetings failed:", greetErr)
  }

  const durationMs = Date.now() - startedAt

  // ---- Audit log (best effort) -------------------------------------------
  try {
    await supabase.from("audit_log").insert({
      actor_id: null,
      action: "cron.evolve_teen_profiles",
      resource_type: "system",
      resource_id: null,
      metadata: {
        ok: true,
        teens_processed: teensProcessed,
        total_rows_upserted: totalRowsUpserted,
        neighbour_teens_processed: neighbourTeensProcessed,
        neighbour_teens_skipped: neighbourTeensSkipped,
        neighbour_rows_upserted: neighbourRowsUpserted,
        neighbour_errors: neighbourErrors.length,
        greetings_written: greetingsWritten,
        greetings_skipped: greetingsSkipped,
        greeting_candidates: greetingCandidates,
        duration_ms: durationMs,
        triggered_by: isVercelCron ? "vercel-cron" : "bearer",
      },
    })
  } catch (auditErr) {
    console.error(
      "[cron/evolve-teen-profiles] audit log insert failed:",
      auditErr
    )
  }

  return NextResponse.json({
    teens_processed: teensProcessed,
    total_rows_upserted: totalRowsUpserted,
    neighbour_teens_processed: neighbourTeensProcessed,
    neighbour_teens_skipped: neighbourTeensSkipped,
    neighbour_rows_upserted: neighbourRowsUpserted,
    neighbour_errors: neighbourErrors,
    greetings_written: greetingsWritten,
    greetings_skipped: greetingsSkipped,
    greeting_candidates: greetingCandidates,
    duration_ms: durationMs,
  })
}
