/**
 * G3-C — Batch moderation for AI-generated content (quiz + missions).
 *
 * POST /api/admin/content/review/batch
 *   body: {
 *     target?: 'quiz' | 'mission'      // default 'quiz'
 *     action:  'approve' | 'reject' | 'deactivate'
 *     ids:     string[]                // 1..200 UUIDs
 *     reason?: string                  // required when action === 'reject'
 *   }
 *   → 200 {
 *       success: true, target, action,
 *       requested: number, succeededCount: number, failedCount: number,
 *       succeeded: string[],                  // ids actually mutated
 *       failed: Array<{ id, error }>          // per-id failure/skip reason
 *     }
 *   → 400 invalid_json | invalid_action | invalid_target | invalid_ids |
 *         too_many_ids | reason_required · 401 unauthenticated · 403 forbidden
 *
 * Semantics — identical to the unit route (./[id]/route.ts), applied per id:
 *   - approve    → is_active=true (row goes live). Requires is_active=false.
 *   - reject     → archive: code re-prefixed 'REJECTED_' (leaves the DAILY_%
 *                  queue for good), is_active stays false. Requires reason.
 *   - deactivate → G3-C legacy tool: flips an ACTIVE DAILY_ row back to
 *                  is_active=false so it re-enters the pending review queue
 *                  (used for rows the cron auto-published before the
 *                  2026-07-11 fail-closed fix). Requires is_active=true.
 *
 * Guards per id (same as unit route): row exists, code LIKE 'DAILY_%'
 * (prefix written by app/api/cron/generate-daily-content), is_active state
 * check. Updates re-assert the state in their WHERE clause and return the
 * mutated ids, so a row that changed between fetch and update is reported as
 * 'state_changed' instead of being silently double-processed.
 *
 * Auth: admin/super_admin/moderator in admin_roles (same gate as unit route).
 * Audit: one audit_log row per mutated id — same pattern as the unit route
 * (action='content.review.approve|reject|deactivate', resource_type =
 * 'educational_quizzes' | 'mission_templates', metadata { code, title, … })
 * plus `batch: true`. The approve entries are ALSO the marker the review page
 * uses to tell human-approved live rows from legacy auto-published ones.
 */
import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const ADMIN_ROLES = new Set(["admin", "super_admin", "moderator"])
const MAX_BATCH = 200
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

type Target = "quiz" | "mission"

interface CandidateRow {
  id: string
  code: string
  is_active: boolean | null
  label: string
}

export async function POST(req: Request) {
  // 1. Auth gate (same as unit route)
  const supabase = await createClient()
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser()
  if (authErr || !user) {
    return NextResponse.json({ success: false, error: "unauthenticated" }, { status: 401 })
  }

  const sr = createServiceRoleClient()
  const { data: role } = await sr
    .from("admin_roles")
    .select("role")
    .eq("profile_id", user.id)
    .maybeSingle()
  if (!role || !ADMIN_ROLES.has(role.role)) {
    return NextResponse.json({ success: false, error: "forbidden" }, { status: 403 })
  }

  // 2. Parse + validate body
  let body: { target?: unknown; action?: unknown; ids?: unknown; reason?: unknown }
  try {
    body = (await req.json()) as typeof body
  } catch {
    return NextResponse.json({ success: false, error: "invalid_json" }, { status: 400 })
  }

  const target: Target | null =
    body.target === "mission" ? "mission" : body.target === "quiz" || body.target === undefined ? "quiz" : null
  if (!target) {
    return NextResponse.json({ success: false, error: "invalid_target" }, { status: 400 })
  }

  const action = typeof body.action === "string" ? body.action : null
  if (action !== "approve" && action !== "reject" && action !== "deactivate") {
    return NextResponse.json({ success: false, error: "invalid_action" }, { status: 400 })
  }

  if (!Array.isArray(body.ids) || body.ids.length === 0 || body.ids.some((v) => typeof v !== "string")) {
    return NextResponse.json({ success: false, error: "invalid_ids" }, { status: 400 })
  }
  if (body.ids.length > MAX_BATCH) {
    return NextResponse.json(
      { success: false, error: "too_many_ids", max: MAX_BATCH },
      { status: 400 },
    )
  }

  const reason = typeof body.reason === "string" ? body.reason.trim() : ""
  if (action === "reject" && !reason) {
    return NextResponse.json({ success: false, error: "reason_required" }, { status: 400 })
  }

  // Dedupe; reject malformed ids per-id (a single garbage id must not 22P02
  // the whole `.in('id', …)` uuid query for everyone else).
  const failed: Array<{ id: string; error: string }> = []
  const ids: string[] = []
  for (const id of Array.from(new Set(body.ids as string[]))) {
    if (UUID_RE.test(id)) ids.push(id)
    else failed.push({ id, error: "invalid_id" })
  }

  // 3. Fetch rows, apply per-id guards (same as unit route)
  let rows: CandidateRow[] = []
  if (ids.length > 0) {
    if (target === "quiz") {
      const { data, error } = await sr
        .from("educational_quizzes")
        .select("id, code, is_active, title")
        .in("id", ids)
      if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
      }
      rows = (data ?? []).map((r) => ({ id: r.id, code: r.code, is_active: r.is_active, label: r.title }))
    } else {
      const { data, error } = await sr
        .from("mission_templates")
        .select("id, code, is_active, name")
        .in("id", ids)
      if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
      }
      rows = (data ?? []).map((r) => ({ id: r.id, code: r.code, is_active: r.is_active, label: r.name }))
    }
  }

  const byId = new Map(rows.map((r) => [r.id, r]))
  const candidates: CandidateRow[] = []
  for (const id of ids) {
    const row = byId.get(id)
    if (!row) {
      failed.push({ id, error: "not_found" })
      continue
    }
    if (!row.code || !row.code.startsWith("DAILY_")) {
      failed.push({ id, error: "not_ai_generated" })
      continue
    }
    if (action === "deactivate") {
      if (row.is_active !== true) {
        failed.push({ id, error: "not_active" })
        continue
      }
    } else if (row.is_active === true) {
      failed.push({ id, error: "already_active" })
      continue
    }
    candidates.push(row)
  }

  // 4. Apply the decision
  const now = new Date().toISOString()
  const succeeded: string[] = []
  // audit rows accumulated then inserted in ONE call (same shape as unit route)
  const auditRows: Array<{
    actor_id: string
    action: string
    resource_type: string
    resource_id: string
    metadata: Record<string, unknown>
  }> = []
  const resourceType = target === "quiz" ? "educational_quizzes" : "mission_templates"

  if (action === "approve" || action === "deactivate") {
    // Single grouped UPDATE; the WHERE re-asserts prefix + expected state and
    // `.select('id')` returns the ids actually mutated.
    const nextActive = action === "approve"
    const candidateIds = candidates.map((c) => c.id)
    if (candidateIds.length > 0) {
      const patch = { is_active: nextActive, updated_at: now }
      const query =
        target === "quiz"
          ? sr
              .from("educational_quizzes")
              .update(patch)
              .in("id", candidateIds)
              .eq("is_active", !nextActive)
              .like("code", "DAILY_%")
              .select("id")
          : sr
              .from("mission_templates")
              .update(patch)
              .in("id", candidateIds)
              .eq("is_active", !nextActive)
              .like("code", "DAILY_%")
              .select("id")
      const { data: updated, error: upErr } = await query
      if (upErr) {
        for (const c of candidates) failed.push({ id: c.id, error: upErr.message })
      } else {
        const updatedIds = new Set((updated ?? []).map((u) => u.id))
        for (const c of candidates) {
          if (!updatedIds.has(c.id)) {
            failed.push({ id: c.id, error: "state_changed" })
            continue
          }
          succeeded.push(c.id)
          auditRows.push({
            actor_id: user.id,
            action: nextActive ? "content.review.approve" : "content.review.deactivate",
            resource_type: resourceType,
            resource_id: c.id,
            metadata: { code: c.code, title: c.label, batch: true },
          })
        }
      }
    }
  } else {
    // reject — per-row update: each archived code is unique (REJECTED_ prefix,
    // sliced to the shared VARCHAR(50) of educational_quizzes.code and
    // mission_templates.code; cron codes are ~35 chars so no real truncation).
    for (const c of candidates) {
      const archivedCode = `REJECTED_${c.code}`.slice(0, 50)
      const patch = { code: archivedCode, is_active: false, updated_at: now }
      const query =
        target === "quiz"
          ? sr
              .from("educational_quizzes")
              .update(patch)
              .eq("id", c.id)
              .eq("is_active", false)
              .like("code", "DAILY_%")
              .select("id")
          : sr
              .from("mission_templates")
              .update(patch)
              .eq("id", c.id)
              .eq("is_active", false)
              .like("code", "DAILY_%")
              .select("id")
      const { data: updated, error: rejErr } = await query
      if (rejErr) {
        failed.push({ id: c.id, error: rejErr.message })
        continue
      }
      if (!updated || updated.length === 0) {
        failed.push({ id: c.id, error: "state_changed" })
        continue
      }
      succeeded.push(c.id)
      auditRows.push({
        actor_id: user.id,
        action: "content.review.reject",
        resource_type: resourceType,
        resource_id: c.id,
        metadata: { code: c.code, archived_code: archivedCode, title: c.label, reason, batch: true },
      })
    }
  }

  if (auditRows.length > 0) {
    await sr.from("audit_log").insert(auditRows)
  }

  return NextResponse.json({
    success: true,
    target,
    action,
    requested: ids.length + failed.filter((f) => f.error === "invalid_id").length,
    succeededCount: succeeded.length,
    failedCount: failed.length,
    succeeded,
    failed,
  })
}
