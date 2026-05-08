/**
 * Wave 2 PC3 — Parent custom-chore recurrence rollover cron.
 * (TICKET-017 — V1.2-Sprint Wave 2)
 *
 * Runs daily at 00:30 UTC (registered in `vercel.json`). For every
 * `parent_chores` row with `is_active=true` and a recurring `recurrence`
 * (`daily` | `weekly` | `monthly`), instantiate the next
 * `parent_chore_completions` slot for the current period if no completion
 * row already exists in that window. This is the "fresh window per
 * period" guarantee from migration 053 / parent-custom-chores.md.
 *
 * Also archives any chore whose `ends_at` has elapsed (`is_active=false`).
 *
 * Auth: must be a Vercel cron invocation (`x-vercel-cron` header) OR
 *       carry `Authorization: Bearer <CRON_SECRET>`. Fail-closed: if
 *       `CRON_SECRET` is unset, only Vercel cron itself can authenticate
 *       (per F5 ops note canonical pattern).
 */

import { NextResponse } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

type Recurrence = "daily" | "weekly" | "monthly"

interface ChoreRow {
  id: string
  parent_id: string
  teen_id: string
  recurrence: string
  is_active: boolean
  starts_at: string | null
  ends_at: string | null
}

/**
 * Returns the inclusive start instant of the current period for a chore
 * whose `recurrence` is daily / weekly / monthly. All bounds are computed
 * in UTC: the cron itself runs at 00:30 UTC so a UTC day boundary is
 * the natural rollover anchor (matches whitepaper §27 cron-UTC convention).
 */
function periodStart(recurrence: Recurrence, now: Date): Date {
  if (recurrence === "daily") {
    return new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
    )
  }
  if (recurrence === "weekly") {
    // ISO week: Monday as week start. JS getUTCDay() returns 0..6 with Sunday=0.
    const dow = now.getUTCDay()
    const daysSinceMonday = (dow + 6) % 7 // 0 if Mon, 6 if Sun
    const monday = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
    )
    monday.setUTCDate(monday.getUTCDate() - daysSinceMonday)
    return monday
  }
  // monthly: first of month UTC.
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
}

function periodEnd(recurrence: Recurrence, start: Date): Date {
  if (recurrence === "daily") {
    return new Date(start.getTime() + 24 * 60 * 60 * 1000)
  }
  if (recurrence === "weekly") {
    return new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000)
  }
  // monthly
  return new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1))
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
  const now = new Date()
  const nowIso = now.toISOString()

  // === Step 1: archive any chore whose ends_at is now in the past ===
  let archived = 0
  {
    const { data: expired, error: expErr } = await supabase
      .from("parent_chores")
      .select("id")
      .eq("is_active", true)
      .not("ends_at", "is", null)
      .lt("ends_at", nowIso)

    if (expErr) {
      console.error("[cron/parent-chore-rollover] expired query failed:", expErr)
    } else {
      for (const row of expired ?? []) {
        const { error: updErr } = await supabase
          .from("parent_chores")
          .update({ is_active: false })
          .eq("id", row.id)
        if (!updErr) archived += 1
      }
    }
  }

  // === Step 2: load all active recurring chores (daily/weekly/monthly) ===
  const { data: chores, error: choresErr } = await supabase
    .from("parent_chores")
    .select("id, parent_id, teen_id, recurrence, is_active, starts_at, ends_at")
    .eq("is_active", true)
    .in("recurrence", ["daily", "weekly", "monthly"])

  if (choresErr) {
    console.error(
      "[cron/parent-chore-rollover] chores query failed:",
      choresErr
    )
    return NextResponse.json(
      { error: "Failed to enumerate chores", detail: choresErr.message },
      { status: 500 }
    )
  }

  let candidates = 0
  let instantiated = 0
  let skipped = 0
  let failed = 0
  const perChore: Array<{
    chore_id: string
    teen_id: string
    status: string
    error?: string
  }> = []

  for (const raw of (chores ?? []) as ChoreRow[]) {
    candidates += 1
    const recurrence = raw.recurrence as Recurrence
    const startsAt = raw.starts_at ? new Date(raw.starts_at) : null
    const endsAt = raw.ends_at ? new Date(raw.ends_at) : null

    // Respect not-yet-started chores.
    if (startsAt && startsAt.getTime() > now.getTime()) {
      skipped += 1
      perChore.push({
        chore_id: raw.id,
        teen_id: raw.teen_id,
        status: "not_started",
      })
      continue
    }

    // Defensive: if ends_at lapsed but archive missed (race), skip.
    if (endsAt && endsAt.getTime() <= now.getTime()) {
      skipped += 1
      perChore.push({
        chore_id: raw.id,
        teen_id: raw.teen_id,
        status: "ended",
      })
      continue
    }

    const pStart = periodStart(recurrence, now)
    const pEnd = periodEnd(recurrence, pStart)

    // Existing slot for this period?
    const { count, error: cntErr } = await supabase
      .from("parent_chore_completions")
      .select("id", { count: "exact", head: true })
      .eq("chore_id", raw.id)
      .gte("created_at", pStart.toISOString())
      .lt("created_at", pEnd.toISOString())

    if (cntErr) {
      failed += 1
      perChore.push({
        chore_id: raw.id,
        teen_id: raw.teen_id,
        status: "count_error",
        error: cntErr.message,
      })
      continue
    }

    if ((count ?? 0) > 0) {
      skipped += 1
      perChore.push({
        chore_id: raw.id,
        teen_id: raw.teen_id,
        status: "slot_exists",
      })
      continue
    }

    // Instantiate fresh pending completion slot for this period.
    const { error: insErr } = await supabase
      .from("parent_chore_completions")
      .insert({
        chore_id: raw.id,
        teen_id: raw.teen_id,
        evidence_url: null,
        parent_verified: false,
      })

    if (insErr) {
      failed += 1
      perChore.push({
        chore_id: raw.id,
        teen_id: raw.teen_id,
        status: "insert_error",
        error: insErr.message,
      })
      continue
    }

    instantiated += 1
    perChore.push({
      chore_id: raw.id,
      teen_id: raw.teen_id,
      status: "instantiated",
    })
  }

  const durationMs = Date.now() - startedAt

  try {
    await supabase.from("admin_audit_logs").insert({
      user_id: null,
      action: "cron.parent_chore_rollover",
      target_type: "system",
      target_id: null,
      payload: {
        candidates,
        instantiated,
        skipped,
        failed,
        archived,
        duration_ms: durationMs,
        triggered_by: isVercelCron ? "vercel-cron" : "bearer",
      },
    })
  } catch (auditErr) {
    console.error(
      "[cron/parent-chore-rollover] audit log insert failed:",
      auditErr
    )
  }

  return NextResponse.json({
    candidates,
    instantiated,
    skipped,
    failed,
    archived,
    duration_ms: durationMs,
    per_chore: perChore,
  })
}
