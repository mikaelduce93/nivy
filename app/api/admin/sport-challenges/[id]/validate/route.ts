/**
 * Wave 2B — admin validation flip for a teen physical-challenge submission.
 *
 * POST /api/admin/sport-challenges/:id/validate   { action: 'approve' | 'reject', reason?: string }
 *
 * Canonical pipeline (canon §9 FORBIDDEN — no auto-validate):
 *   - teen marks complete with proof_url → row sits at completed=true, validated=false, xp_earned=0
 *   - admin moderator hits this endpoint → flips validated=true (or rejects) + awards XP via add_xp_to_user
 *
 * `id` = teen_physical_challenge_progress.id (NOT challenge_id).
 */
import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const ADMIN_ROLES = new Set(["admin", "super_admin", "moderator"])

export async function POST(
  request: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params
  if (!id) {
    return NextResponse.json({ success: false, error: "id_required" }, { status: 400 })
  }

  let body: { action?: string; reason?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ success: false, error: "invalid_json" }, { status: 400 })
  }
  const action = body.action
  if (action !== "approve" && action !== "reject") {
    return NextResponse.json(
      { success: false, error: "action must be 'approve' or 'reject'" },
      { status: 400 }
    )
  }

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

  const { data: progress, error: fetchErr } = await sr
    .from("teen_physical_challenge_progress")
    .select(
      "id, teen_id, challenge_id, completed, validated, proof_url, xp_earned"
    )
    .eq("id", id)
    .maybeSingle()
  if (fetchErr) {
    return NextResponse.json({ success: false, error: fetchErr.message }, { status: 500 })
  }
  if (!progress) {
    return NextResponse.json({ success: false, error: "not_found" }, { status: 404 })
  }
  if (!progress.completed) {
    return NextResponse.json(
      { success: false, error: "not_yet_submitted" },
      { status: 400 }
    )
  }
  if (progress.validated) {
    return NextResponse.json(
      { success: false, error: "already_validated" },
      { status: 400 }
    )
  }

  const nowIso = new Date().toISOString()

  if (action === "reject") {
    // Audit 2026-07-11 D3 drift fix — `rejection_reason` is NOT a column of
    // teen_physical_challenge_progress in the live schema (types/supabase.ts);
    // writing it made the whole reject UPDATE fail (PGRST204). The reason is
    // kept in audit_log.metadata + the teen notification below.
    const { error: rejErr } = await sr
      .from("teen_physical_challenge_progress")
      .update({
        validated: false,
        completed: false,
        completed_at: null,
        proof_url: null,
        updated_at: nowIso,
      })
      .eq("id", id)
    if (rejErr) {
      return NextResponse.json({ success: false, error: rejErr.message }, { status: 500 })
    }

    await sr.from("audit_log").insert({
      actor_id: user.id,
      action: "physical_challenge.reject",
      resource_type: "teen_physical_challenge_progress",
      resource_id: id,
      metadata: { reason: body.reason ?? null },
    })

    // Best-effort in-app notification (D3) — never fails the rejection.
    // NB: no xp_reward on the row — claim_notification_rewards would credit it.
    const { error: notifErr } = await sr.from("user_notifications").insert({
      user_id: progress.teen_id,
      title: "Preuve de défi refusée",
      body: body.reason
        ? `Ta preuve n'a pas été acceptée (${body.reason}). Tu peux en soumettre une nouvelle.`
        : "Ta preuve n'a pas été acceptée. Tu peux en soumettre une nouvelle.",
      emoji: "📸",
      action_url: "/teen/defis-physiques",
    })
    if (notifErr) {
      console.error("[admin/sport-challenges/validate] reject notification failed", notifErr)
    }

    return NextResponse.json({ success: true, action: "rejected" })
  }

  // approve — fetch challenge for xp_reward
  const { data: challenge } = await sr
    .from("physical_challenges")
    .select("id, name, xp_reward")
    .eq("id", progress.challenge_id)
    .maybeSingle()
  const xpReward = challenge?.xp_reward ?? 50

  // Audit 2026-07-11 D3 drift fix — `validated_by` is NOT a column of
  // teen_physical_challenge_progress in the live schema (types/supabase.ts);
  // writing it made the whole approve UPDATE fail (PGRST204). The validator's
  // identity is kept in audit_log.actor_id.
  const { error: updErr } = await sr
    .from("teen_physical_challenge_progress")
    .update({
      validated: true,
      validated_at: nowIso,
      xp_earned: xpReward,
      updated_at: nowIso,
    })
    .eq("id", id)
  if (updErr) {
    return NextResponse.json({ success: false, error: updErr.message }, { status: 500 })
  }

  // Canonical XP grant — never call the phantom add_user_xp directly. // canon-allow: phantom name in do-not-do comment
  const { error: xpErr } = await sr.rpc("add_xp_to_user", {
    p_teen_id: progress.teen_id,
    p_xp_amount: xpReward,
    p_source_type: "physical_challenge",
    p_source_id: progress.challenge_id,
    p_description: `Defi physique validé: ${challenge?.name ?? progress.challenge_id}`,
  })
  if (xpErr) {
    console.error("[admin/sport-challenges/validate] xp grant failed", xpErr)
    // Roll back validation so a retry can re-attempt the XP grant.
    await sr
      .from("teen_physical_challenge_progress")
      .update({
        validated: false,
        validated_at: null,
        xp_earned: 0,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
    return NextResponse.json(
      { success: false, error: "xp_grant_failed", detail: xpErr.message },
      { status: 500 }
    )
  }

  await sr.from("audit_log").insert({
    actor_id: user.id,
    action: "physical_challenge.approve",
    resource_type: "teen_physical_challenge_progress",
    resource_id: id,
    metadata: { xp_awarded: xpReward, challenge_id: progress.challenge_id },
  })

  // Best-effort in-app notification (D3) — never fails the approval. The XP
  // is already credited by add_xp_to_user above, so we deliberately do NOT
  // set xp_reward on the notification (claim_notification_rewards would
  // credit it a second time).
  const { error: notifErr } = await sr.from("user_notifications").insert({
    user_id: progress.teen_id,
    title: "Défi validé !",
    body: `Ton défi « ${challenge?.name ?? "défi physique"} » a été validé : +${xpReward} XP crédités.`,
    emoji: "🏆",
    priority: "high",
    action_url: "/teen/defis-physiques",
  })
  if (notifErr) {
    console.error("[admin/sport-challenges/validate] approve notification failed", notifErr)
  }

  return NextResponse.json({
    success: true,
    action: "approved",
    xp_awarded: xpReward,
  })
}
