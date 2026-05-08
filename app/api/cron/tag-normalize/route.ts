/**
 * W-D.11 / TICKET-040 — Tag normalize cron (per personalization-engine.md §7).
 *
 * Schedule: 01:00 Africa/Casablanca (= 00:00 UTC).
 * For tag-array columns on user/agent-authored content (educational_quizzes,
 * mission_templates, partner_offers), drops any tag that isn't in the
 * canonical 50-entry `interest_taxonomy`. Defaults to dry-run; set
 * `TAG_NORMALIZE_DRY=false` in env to actually commit.
 *
 * Wave 3 / V1.2 polish (TICKET-040):
 *   - Per-table tag-level drift counts + sample of unmapped tags so admins
 *     can decide whether to extend the taxonomy or fix sources.
 *   - Free-text tags outside the taxonomy are rejected (filtered out) — this
 *     is the existing behavior, made explicit in the response shape.
 *   - Both dry-run and commit modes write a single `admin_audit_logs` row
 *     (action='cron.tag_normalize') with the full report payload, so
 *     unmapped tags are queueable for admin review (acceptance criterion).
 *
 * Auth: Vercel cron header OR Bearer CRON_SECRET, fail-CLOSED.
 */

import { NextRequest, NextResponse } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const TARGET_TABLES: Array<{ table: string; idCol: string }> = [
  { table: "educational_quizzes", idCol: "id" },
  { table: "mission_templates", idCol: "id" },
  { table: "partner_offers", idCol: "id" },
]

// Cap how many distinct unmapped tag samples we keep per table — keeps
// the audit_log payload bounded even on a noisy first run.
const UNMAPPED_SAMPLE_CAP = 50

type TableReport = {
  table: string
  rows_examined: number
  rows_with_drift: number
  rows_updated: number
  tags_dropped: number
  unmapped_sample: Array<{ tag: string; count: number }>
  table_missing?: boolean
  error?: string
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

  // Default to dry-run. Only commit when env is explicitly "false".
  const dryRun =
    (process.env.TAG_NORMALIZE_DRY ?? "true").toLowerCase() !== "false"

  // Load canonical tag set (active only).
  const { data: taxonomy, error: taxErr } = await supabase
    .from("interest_taxonomy")
    .select("tag, is_active")
  if (taxErr) {
    console.error("[cron/tag-normalize] taxonomy query failed:", taxErr)
    return NextResponse.json(
      { error: "Failed to load taxonomy", detail: taxErr.message },
      { status: 500 },
    )
  }
  const canonical = new Set(
    (taxonomy ?? [])
      .filter((t) => t.is_active !== false)
      .map((t) => String(t.tag)),
  )

  if (canonical.size === 0) {
    console.warn(
      "[cron/tag-normalize] interest_taxonomy is empty — refusing to wipe all tags",
    )
    return NextResponse.json({
      skipped: true,
      reason: "interest_taxonomy is empty — refusing to wipe all tags",
      duration_ms: Date.now() - startedAt,
    })
  }

  console.log(
    `[cron/tag-normalize] start dry_run=${dryRun} canonical_tags=${canonical.size} tables=${TARGET_TABLES.length}`,
  )

  const report: TableReport[] = []

  for (const { table, idCol } of TARGET_TABLES) {
    // Probe the table + tags column.
    const { error: probeErr } = await supabase
      .from(table)
      .select(`${idCol}, tags`)
      .limit(1)
    if (probeErr) {
      console.warn(
        `[cron/tag-normalize] table_missing ${table}: ${probeErr.message}`,
      )
      report.push({
        table,
        rows_examined: 0,
        rows_with_drift: 0,
        rows_updated: 0,
        tags_dropped: 0,
        unmapped_sample: [],
        table_missing: true,
      })
      continue
    }

    let examined = 0
    let drift = 0
    let updated = 0
    let tagsDropped = 0
    const unmappedCounts = new Map<string, number>()
    let pageError: string | undefined

    const PAGE = 500
    let from = 0
    while (true) {
      const { data, error } = await supabase
        .from(table)
        .select(`${idCol}, tags`)
        .not("tags", "is", null)
        .range(from, from + PAGE - 1)
      if (error) {
        console.error(`[cron/tag-normalize] page failed ${table}:`, error)
        pageError = error.message
        break
      }
      if (!data || data.length === 0) break
      examined += data.length

      for (const row of data as unknown as Array<Record<string, unknown>>) {
        const id = row[idCol]
        const rawTags = Array.isArray(row.tags)
          ? (row.tags as unknown[]).map((x) => String(x))
          : []
        // Reject free-text tags: only keep those present in the canonical
        // taxonomy. De-duplicate while preserving order.
        const seen = new Set<string>()
        const filtered: string[] = []
        const dropped: string[] = []
        for (const t of rawTags) {
          if (canonical.has(t)) {
            if (!seen.has(t)) {
              seen.add(t)
              filtered.push(t)
            }
          } else {
            dropped.push(t)
          }
        }
        if (dropped.length > 0 || filtered.length !== rawTags.length) {
          drift++
          tagsDropped += dropped.length
          for (const d of dropped) {
            unmappedCounts.set(d, (unmappedCounts.get(d) ?? 0) + 1)
          }
          if (!dryRun) {
            const { error: updErr } = await supabase
              .from(table)
              .update({ tags: filtered })
              .eq(idCol, id as string)
            if (updErr) {
              console.error(
                `[cron/tag-normalize] update failed ${table}.${String(id)}:`,
                updErr.message,
              )
            } else {
              updated++
            }
          }
        }
      }

      if (data.length < PAGE) break
      from += PAGE
    }

    const unmappedSample = Array.from(unmappedCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, UNMAPPED_SAMPLE_CAP)
      .map(([tag, count]) => ({ tag, count }))

    console.log(
      `[cron/tag-normalize] ${table}: examined=${examined} drift=${drift} updated=${updated} tags_dropped=${tagsDropped} distinct_unmapped=${unmappedCounts.size}${dryRun ? " (DRY)" : ""}`,
    )

    report.push({
      table,
      rows_examined: examined,
      rows_with_drift: drift,
      rows_updated: updated,
      tags_dropped: tagsDropped,
      unmapped_sample: unmappedSample,
      ...(pageError ? { error: pageError } : {}),
    })
  }

  const totals = report.reduce(
    (acc, r) => ({
      rows_examined: acc.rows_examined + r.rows_examined,
      rows_with_drift: acc.rows_with_drift + r.rows_with_drift,
      rows_updated: acc.rows_updated + r.rows_updated,
      tags_dropped: acc.tags_dropped + r.tags_dropped,
    }),
    { rows_examined: 0, rows_with_drift: 0, rows_updated: 0, tags_dropped: 0 },
  )

  const durationMs = Date.now() - startedAt

  // Single audit-log row per run so unmapped tags are queryable by admins
  // (acceptance criterion: "unmapped queued for admin review"). Best-effort:
  // if the insert fails we still return the report.
  const auditPayload = {
    dry_run: dryRun,
    canonical_tag_count: canonical.size,
    totals,
    report,
    duration_ms: durationMs,
  }
  const { error: auditErr } = await supabase.from("admin_audit_logs").insert({
    user_id: null,
    action: "cron.tag_normalize",
    target_type: "cron",
    target_id: null,
    payload: auditPayload,
  })
  if (auditErr) {
    console.error(
      "[cron/tag-normalize] audit log insert failed:",
      auditErr.message,
    )
  }

  console.log(
    `[cron/tag-normalize] done dry_run=${dryRun} examined=${totals.rows_examined} drift=${totals.rows_with_drift} updated=${totals.rows_updated} tags_dropped=${totals.tags_dropped} duration_ms=${durationMs}`,
  )

  return NextResponse.json({
    dry_run: dryRun,
    canonical_tag_count: canonical.size,
    totals,
    report,
    duration_ms: durationMs,
  })
}
