/**
 * Wave 2.3 — Admin: approve/reject a creator submission.
 *
 * POST /api/admin/creator/moderate
 *   body: { queueId, submissionId, action: 'approve'|'reject' }
 *
 * Updates moderation_queue + feed_posts.status + admin_audit_logs.
 */
import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }

    const sr = createServiceRoleClient()
    const { data: role } = await sr
      .from("admin_roles")
      .select("role")
      .eq("profile_id", user.id)
      .maybeSingle()
    if (!role) return NextResponse.json({ error: "Accès refusé" }, { status: 403 })

    const body = await request.json()
    const { queueId, submissionId, action } = body ?? {}
    if (!queueId || !submissionId || !["approve", "reject"].includes(action)) {
      return NextResponse.json({ error: "Paramètres invalides" }, { status: 400 })
    }

    const newPostStatus = action === "approve" ? "published" : "rejected"
    const newQueueStatus = action === "approve" ? "approved" : "rejected"

    const { error: e1 } = await sr
      .from("feed_posts")
      .update({ status: newPostStatus })
      .eq("id", submissionId)
    if (e1) return NextResponse.json({ error: e1.message }, { status: 500 })

    const { error: e2 } = await sr
      .from("moderation_queue")
      .update({ status: newQueueStatus, reviewed_by: user.id, reviewed_at: new Date().toISOString() })
      .eq("id", queueId)
    if (e2) return NextResponse.json({ error: e2.message }, { status: 500 })

    await sr.from("admin_audit_logs").insert({
      user_id: user.id,
      action: `moderation_${action}`,
      target_type: "feed_post",
      target_id: submissionId,
      payload: { queue_id: queueId },
    })

    return NextResponse.json({ success: true, status: newPostStatus })
  } catch (err) {
    console.error("[admin/moderate] error", err)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
