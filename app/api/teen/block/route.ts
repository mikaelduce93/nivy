/**
 * POST   /api/teen/block      — block a user (idempotent).
 * DELETE /api/teen/block      — unblock a user.
 *
 * Wave 2A canonical block endpoint. Delegates to RPC `block_user_v2`, which:
 *   - validates blocker != blocked,
 *   - cancels pending friend_requests in both directions,
 *   - drops any existing friendships row,
 *   - upserts blocked_users(blocker_id, blocked_id, reason).
 *
 * Body: { blocked_id: uuid, reason?: string }.
 * Returns: 201 created / 200 idempotent / 4xx validation / 5xx failure.
 *
 * Canon: docs/canon/social-feed.locked.md §3 (block invariant) + §4 (DM block enforcement).
 */
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"

const BLOCK_SCHEMA = z.object({
  blocked_id: z.string().uuid(),
  reason: z.string().max(500).optional(),
})

const UNBLOCK_SCHEMA = z.object({
  blocked_id: z.string().uuid(),
})

export async function POST(request: NextRequest) {
  const supabase = await createClient()
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

  const parsed = BLOCK_SCHEMA.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation", details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  if (parsed.data.blocked_id === user.id) {
    return NextResponse.json(
      { error: "Tu ne peux pas te bloquer toi-même" },
      { status: 400 }
    )
  }

  const { data, error } = await supabase.rpc("block_user_v2", {
    p_blocker: user.id,
    p_blocked: parsed.data.blocked_id,
    p_reason: parsed.data.reason ?? undefined,
  })

  if (error) {
    console.error("[teen/block] rpc failed:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }

  await supabase
    .from("audit_log")
    .insert({
      actor_id: user.id,
      actor_role: "teen",
      action: "user_blocked",
      resource_type: "user_profile",
      resource_id: parsed.data.blocked_id,
      target_user_id: parsed.data.blocked_id,
      description: "User blocked another user",
      metadata: { reason: parsed.data.reason ?? null },
    })
    .then(
      () => undefined,
      () => undefined
    )

  return NextResponse.json(
    { success: true, block_id: data ?? null },
    { status: 201 }
  )
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient()
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

  const parsed = UNBLOCK_SCHEMA.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation", details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const { error } = await supabase
    .from("blocked_users")
    .delete()
    .eq("blocker_id", user.id)
    .eq("blocked_id", parsed.data.blocked_id)

  if (error) {
    console.error("[teen/block] DELETE failed:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }

  await supabase
    .from("audit_log")
    .insert({
      actor_id: user.id,
      actor_role: "teen",
      action: "user_unblocked",
      resource_type: "user_profile",
      resource_id: parsed.data.blocked_id,
      target_user_id: parsed.data.blocked_id,
    })
    .then(
      () => undefined,
      () => undefined
    )

  return NextResponse.json({ success: true })
}
