import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getUserRole } from "@/lib/auth/get-user-role"

/**
 * POST /api/parent/notifications/mark-read — Wave 6D.
 *
 * Marks one user_notifications row as read for the calling parent.
 * Body: { id: string }   (the notification id)
 *
 * Replaces the dead /api/notifications/mark-read which wrote to the
 * deprecated `notifications` table and had no callers since Wave 5A
 * stubbed the bare /notifications page. The /parent/notifications page
 * was advertising "Marquage automatique au clic" without any actual
 * mark-read wiring; this endpoint is the truthful behind-the-claim.
 *
 * Idempotent: marking an already-read row is a NOOP.
 * Scoped: the WHERE clause pins user_id = caller, so a parent can never
 * mark another user's notifications as read.
 */
export async function POST(request: Request) {
  const userInfo = await getUserRole()
  if (!userInfo || userInfo.role !== "parent") {
    return NextResponse.json({ success: false, error: "Non autorisé" }, { status: 401 })
  }

  let body: { id?: string }
  try {
    body = (await request.json()) as { id?: string }
  } catch {
    return NextResponse.json({ success: false, error: "invalid_body" }, { status: 400 })
  }
  const id = (body.id ?? "").trim()
  if (!id) {
    return NextResponse.json({ success: false, error: "id_required" }, { status: 400 })
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from("user_notifications")
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", userInfo.profileId)

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
  return NextResponse.json({ success: true })
}
