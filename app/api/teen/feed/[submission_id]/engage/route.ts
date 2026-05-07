/**
 * Wave 2.3 — Creator engagement endpoint.
 *
 * POST /api/teen/feed/:submission_id/engage
 *   body: { action: 'view'|'like'|'comment'|'share'|'save' }
 *
 * Captures a behavioral signal AND credits XP to the creator (capped per
 * whitepaper §19.4.6). Self-engagement does NOT credit XP.
 */
import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { recordSignal, type SignalType } from "@/lib/analytics/signals"

const ALLOWED_ACTIONS = ["view", "like", "comment", "share", "save"] as const
const SIGNAL_MAP: Record<string, SignalType> = {
  view: "view",
  like: "favorite",
  comment: "click",
  share: "share",
  save: "favorite",
}

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

    const body = await request.json()
    const action = body?.action
    if (!ALLOWED_ACTIONS.includes(action)) {
      return NextResponse.json(
        { error: `action invalide (${ALLOWED_ACTIONS.join(", ")})` },
        { status: 400 }
      )
    }

    const sr = createServiceRoleClient()
    const { data: post, error: postErr } = await sr
      .from("feed_posts")
      .select("id, user_id, status")
      .eq("id", submission_id)
      .maybeSingle()

    if (postErr || !post) {
      return NextResponse.json({ error: "Post introuvable" }, { status: 404 })
    }
    if (post.status === "rejected" || post.status === "removed") {
      return NextResponse.json({ error: "Post non disponible" }, { status: 410 })
    }

    // Best-effort signal capture for the personalization engine.
    await recordSignal({
      teenId: user.id,
      signalType: SIGNAL_MAP[action] ?? "view",
      targetType: "feed_post",
      targetId: submission_id,
      metadata: { creator_user_id: post.user_id, action },
    })

    // Credit creator XP (skip self-engagement).
    let xpResult: unknown = null
    if (post.user_id !== user.id && ["like", "comment", "share"].includes(action)) {
      const { data, error } = await sr.rpc("award_creator_xp", {
        p_creator_user_id: post.user_id,
        p_signal_type: action,
        p_submission_id: submission_id,
        p_viewer_user_id: user.id,
      })
      if (error) {
        console.warn("[engage] award_creator_xp failed", error.message)
      } else {
        xpResult = data
      }
    } else if (action === "view" || action === "save") {
      // log engagement row even when no XP
      await sr.from("creator_engagement").insert({
        creator_user_id: post.user_id,
        viewer_user_id: user.id,
        submission_id,
        action,
        xp_credited_to_creator: 0,
      })
    }

    // Bump denormalised counters for cards
    if (action === "like") {
      await sr.rpc("toggle_post_like", { p_user_id: user.id, p_post_id: submission_id })
    } else if (action === "view") {
      const { data: row } = await sr
        .from("feed_posts")
        .select("views_count")
        .eq("id", submission_id)
        .single()
      const next = (row?.views_count ?? 0) + 1
      await sr.from("feed_posts").update({ views_count: next }).eq("id", submission_id)
    }

    return NextResponse.json({ success: true, xp: xpResult })
  } catch (err) {
    console.error("[engage] error", err)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
