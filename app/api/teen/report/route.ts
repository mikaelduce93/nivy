/**
 * POST /api/teen/report — Wave 2A canonical universal report sink.
 *
 * Replaces every per-surface fake-report (window.alert, toast-only, dead row).
 * Writes to `user_reports` (canon §7 invariant 1) and `audit_log`. The auto-
 * moderation trigger handles >=3 reports → moderation_queue.
 *
 * Body: { resource_type, resource_id, reason, reporter_notes? }
 * Returns: 201 first time, 200 idempotent replay, 4xx validation, 5xx failure.
 *
 * Canon: docs/canon/social-feed.locked.md §7 + §8 (universal report endpoint).
 */
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import type { SupabaseClient } from "@supabase/supabase-js"
import { createClient } from "@/lib/supabase/server"

const REPORT_SCHEMA = z.object({
  resource_type: z.enum([
    "feed_post",
    "feed_comment",
    "direct_message",
    "circle_message",
    "marketplace_listing",
    "user_profile",
    "partner_offer",
  ]),
  resource_id: z.string().uuid(),
  reason: z.enum([
    "spam",
    "harassment",
    "sexual_content",
    "violence",
    "self_harm",
    "underage",
    "impersonation",
    "illegal",
    "inappropriate",
    "hate_speech",
    "personal_info",
    "other",
  ]),
  reporter_notes: z.string().max(500).optional(),
})

export async function POST(request: NextRequest) {
  // `user_reports` predates the last `types/supabase.ts` codegen and is
  // absent from the generated `Database` type even though it exists live
  // (see migration 097). Cast to the base `SupabaseClient` to avoid a
  // false "table does not exist" tsc error.
  const supabase = (await createClient()) as unknown as SupabaseClient
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser()
  if (authErr || !user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 })
  }

  const parsed = REPORT_SCHEMA.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Validation",
        details: parsed.error.flatten(),
      },
      { status: 400 }
    )
  }

  const { resource_type, resource_id, reason, reporter_notes } = parsed.data

  // Idempotent insert: respect UNIQUE (reporter, target_type, target_id).
  const { data: existing } = await supabase
    .from("user_reports")
    .select("id, status, created_at")
    .eq("reporter_user_id", user.id)
    .eq("target_type", resource_type)
    .eq("target_id", resource_id)
    .maybeSingle()

  if (existing) {
    return NextResponse.json(
      { success: true, idempotent: true, report: existing },
      { status: 200 }
    )
  }

  const { data: inserted, error: insertErr } = await supabase
    .from("user_reports")
    .insert({
      reporter_user_id: user.id,
      target_type: resource_type,
      target_id: resource_id,
      reason,
      details: reporter_notes ?? null,
      status: "open",
    })
    .select("id, status, created_at")
    .single()

  if (insertErr) {
    console.error("[teen/report] insert failed:", insertErr)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }

  // Audit (canon §7 invariant 4).
  await supabase
    .from("audit_log")
    .insert({
      actor_id: user.id,
      actor_role: "teen",
      action: "content_reported",
      resource_type,
      resource_id,
      description: `User reported ${resource_type}: ${reason}`,
      metadata: { reason, reporter_notes: reporter_notes ?? null },
    })
    .then(
      () => undefined,
      () => undefined
    )

  return NextResponse.json({ success: true, report: inserted }, { status: 201 })
}
