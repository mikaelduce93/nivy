/**
 * W-D.11 — Tag normalize cron (per personalization-engine.md §7).
 *
 * Schedule: 01:00 Africa/Casablanca (= 00:00 UTC).
 * For tag-array columns on user/agent-authored content (educational_quizzes,
 * mission_templates, partner_offers), drops any tag that isn't in the
 * canonical 50-entry `interest_taxonomy`. Defaults to dry-run; set
 * `TAG_NORMALIZE_DRY=false` in env to actually commit.
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

  // Default to dry-run to be safe. Only commit when explicit "false".
  const dryRun = (process.env.TAG_NORMALIZE_DRY ?? "true").toLowerCase() !== "false"

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
    return NextResponse.json({
      skipped: true,
      reason: "interest_taxonomy is empty — refusing to wipe all tags",
      duration_ms: Date.now() - startedAt,
    })
  }

  type Report = {
    table: string
    rows_examined: number
    rows_with_drift: number
    rows_updated: number
    table_missing?: boolean
  }
  const report: Report[] = []

  for (const { table, idCol } of TARGET_TABLES) {
    // Probe the table + tags column.
    const { error: probeErr } = await supabase
      .from(table)
      .select(`${idCol}, tags`)
      .limit(1)
    if (probeErr) {
      console.warn(
        `[cron/tag-normalize] table_missing ${table}:`,
        probeErr.message,
      )
      report.push({
        table,
        rows_examined: 0,
        rows_with_drift: 0,
        rows_updated: 0,
        table_missing: true,
      })
      continue
    }

    // Page through all rows with non-null tags.
    let examined = 0
    let drift = 0
    let updated = 0
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
        break
      }
      if (!data || data.length === 0) break
      examined += data.length

      for (const row of data as unknown as Array<Record<string, unknown>>) {
        const id = row[idCol]
        const tags = Array.isArray(row.tags)
          ? (row.tags as unknown[]).map((x) => String(x))
          : []
        const filtered = tags.filter((t) => canonical.has(t))
        if (filtered.length !== tags.length) {
          drift++
          if (!dryRun) {
            const { error: updErr } = await supabase
              .from(table)
              .update({ tags: filtered })
              .eq(idCol, id as string)
            if (updErr) {
              console.error(
                `[cron/tag-normalize] update failed ${table}.${id}:`,
                updErr,
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

    report.push({
      table,
      rows_examined: examined,
      rows_with_drift: drift,
      rows_updated: updated,
    })
  }

  return NextResponse.json({
    dry_run: dryRun,
    canonical_tag_count: canonical.size,
    report,
    duration_ms: Date.now() - startedAt,
  })
}
