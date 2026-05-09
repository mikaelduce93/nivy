import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getUserRole } from "@/lib/auth/get-user-role"

/**
 * POST /api/parent/notifications/mark-all-read — Wave 6D.
 *
 * Marks every unread user_notifications row as read for the calling
 * parent. Idempotent. Scoped via user_id = caller.
 */
export async function POST() {
  const userInfo = await getUserRole()
  if (!userInfo || userInfo.role !== "parent") {
    return NextResponse.json({ success: false, error: "Non autorisé" }, { status: 401 })
  }

  const supabase = await createClient()
  const { error, count } = await supabase
    .from("user_notifications")
    .update({ is_read: true, read_at: new Date().toISOString() }, { count: "exact" })
    .eq("user_id", userInfo.profileId)
    .eq("is_read", false)

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
  return NextResponse.json({ success: true, marked: count ?? 0 })
}
