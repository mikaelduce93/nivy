/**
 * Wave 2.3 — Admin: feature a creator submission.
 *
 * POST /api/admin/creator/feature/:submission_id
 *
 * Wraps the feature_submission RPC: admin check, +500 XP +200 coins,
 * audit log entry. Atomic in the DB.
 */
import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ submission_id: string }> }
) {
  try {
    const { submission_id } = await context.params
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }

    const sr = createServiceRoleClient()
    const { data, error } = await sr.rpc("feature_submission", {
      p_submission_id: submission_id,
      p_admin_user_id: user.id,
    })

    if (error) {
      console.error("[admin/feature] rpc error", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const result = (data ?? {}) as { ok?: boolean; reason?: string }
    if (!result.ok) {
      const status = result.reason === "not_admin" ? 403 : 409
      return NextResponse.json({ error: result.reason ?? "Échec" }, { status })
    }

    return NextResponse.json({ success: true, ...result })
  } catch (err) {
    console.error("[admin/feature] error", err)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
