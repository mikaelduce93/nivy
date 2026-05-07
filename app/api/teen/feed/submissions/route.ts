/**
 * Wave 2.3 — Creator economy: submissions endpoint.
 *
 * POST /api/teen/feed/submissions
 *   body: { type, category, title, body, media_urls, visibility, related_partner_id?, related_event_id?, related_quest_id? }
 *
 * Behavior per docs/vision/content-creator-economy.md:
 *   - visibility='public'  → status='pending_moderation' + moderation_queue row
 *   - otherwise            → status='published' immediately
 *   - awards 10 XP/day to the creator (capped via award_creator_xp 'post' signal)
 */
import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

const ALLOWED_TYPES = ["photo", "video", "story", "tutorial", "review", "live_event"] as const
const ALLOWED_VISIBILITY = ["private", "friends", "crew", "public"] as const

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

    const body = await request.json()
    const {
      type,
      category,
      title,
      body: postBody,
      media_urls = [],
      visibility = "friends",
      related_partner_id,
      related_event_id,
      related_quest_id,
    } = body ?? {}

    if (!type || !ALLOWED_TYPES.includes(type)) {
      return NextResponse.json(
        { error: `type requis (${ALLOWED_TYPES.join(", ")})` },
        { status: 400 }
      )
    }
    if (!ALLOWED_VISIBILITY.includes(visibility)) {
      return NextResponse.json(
        { error: `visibility invalide (${ALLOWED_VISIBILITY.join(", ")})` },
        { status: 400 }
      )
    }
    if (!postBody && (!Array.isArray(media_urls) || media_urls.length === 0)) {
      return NextResponse.json({ error: "Contenu ou média requis" }, { status: 400 })
    }

    const isPublic = visibility === "public"
    const initialStatus = isPublic ? "pending_moderation" : "published"

    // Use service-role for the moderation_queue insert so the moderation row
    // exists before the post becomes user-visible (RLS-safe).
    const sr = createServiceRoleClient()

    // Insert submission
    const { data: post, error: insertError } = await sr
      .from("feed_posts")
      .insert({
        user_id: user.id,
        post_type: type,
        type,
        category: category ?? null,
        content: postBody ?? null,
        media_urls,
        metadata: { title: title ?? null },
        visibility,
        status: initialStatus,
        related_partner_id: related_partner_id ?? null,
        related_event_id: related_event_id ?? null,
        related_quest_id: related_quest_id ?? null,
      })
      .select("id")
      .single()

    if (insertError || !post) {
      console.error("[submissions] insert error", insertError)
      return NextResponse.json({ error: "Création impossible" }, { status: 500 })
    }

    // For public posts, write moderation_queue row first; only then keep the
    // submission discoverable. If queue write fails, soft-delete the post.
    if (isPublic) {
      const { data: modRow, error: modErr } = await sr
        .from("moderation_queue")
        .insert({
          content_type: "feed_post",
          content_id: post.id,
          payload: { type, category, title, body: postBody, media_urls, user_id: user.id },
          status: "pending",
        })
        .select("id")
        .single()

      if (modErr || !modRow) {
        console.error("[submissions] moderation_queue insert failed", modErr)
        await sr.from("feed_posts").update({ status: "removed" }).eq("id", post.id)
        return NextResponse.json(
          { error: "Modération indisponible, soumission annulée" },
          { status: 503 }
        )
      }

      await sr.from("feed_posts").update({ moderation_id: modRow.id }).eq("id", post.id)
    }

    // Daily post grant (capped 10 XP/day, ledgered via award_creator_xp)
    await sr.rpc("award_creator_xp", {
      p_creator_user_id: user.id,
      p_signal_type: "post",
      p_submission_id: post.id,
      p_viewer_user_id: user.id,
    })

    return NextResponse.json({ success: true, submission_id: post.id, status: initialStatus })
  } catch (err) {
    console.error("[submissions] error", err)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
