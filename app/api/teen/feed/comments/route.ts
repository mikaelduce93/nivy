/**
 * API COMMENTAIRES DU FEED
 * ========================
 * Gestion des commentaires sur les posts
 */

import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

// GET: Récupérer les commentaires
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const postId = searchParams.get("post_id")
    const parentId = searchParams.get("parent_id")
    const limit = parseInt(searchParams.get("limit") || "20")
    const offset = parseInt(searchParams.get("offset") || "0")

    if (!postId) {
      return NextResponse.json({ error: "post_id requis" }, { status: 400 })
    }

    // Si on demande les réponses à un commentaire
    if (parentId) {
      const { data: replies, error } = await supabase
        .from("feed_comments")
        .select(`
          *,
          user:users!user_id (
            id, username, display_name, avatar_url, level
          )
        `)
        .eq("post_id", postId)
        .eq("parent_id", parentId)
        .eq("is_hidden", false)
        .order("created_at", { ascending: true })
        .range(offset, offset + limit - 1)

      if (error) throw error

      // Vérifier les likes de l'utilisateur
      const commentIds = replies?.map((c) => c.id) || []
      const { data: userLikes } = await supabase
        .from("comment_likes")
        .select("comment_id")
        .eq("user_id", user.id)
        .in("comment_id", commentIds)

      const likedIds = new Set(userLikes?.map((l) => l.comment_id) || [])

      return NextResponse.json({
        replies: replies?.map((r) => ({
          ...r,
          user_liked: likedIds.has(r.id),
        })) || [],
        has_more: (replies?.length || 0) === limit,
      })
    }

    // Commentaires principaux (sans parent)
    const { data: comments, error } = await supabase.rpc("get_post_comments", {
      p_user_id: user.id,
      p_post_id: postId,
      p_limit: limit,
      p_offset: offset,
    })

    if (error) throw error

    return NextResponse.json({
      comments: comments || [],
      has_more: (comments?.length || 0) === limit,
    })
  } catch (error) {
    console.error("Comments GET error:", error)
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    )
  }
}

// POST: Actions sur les commentaires
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }

    const body = await request.json()
    const { action } = body

    switch (action) {
      // Ajouter un commentaire
      case "create": {
        const { post_id, content, parent_id, media_url } = body

        if (!post_id || !content?.trim()) {
          return NextResponse.json(
            { error: "post_id et content requis" },
            { status: 400 }
          )
        }

        // Canon §2: max 500 chars on comments.
        if (content.length > 500) {
          return NextResponse.json(
            { error: "Commentaire trop long (max 500 caractères)" },
            { status: 400 }
          )
        }

        const { data: commentId, error } = await supabase.rpc("add_feed_comment", {
          p_user_id: user.id,
          p_post_id: post_id,
          p_content: content.trim(),
          p_parent_id: parent_id || null,
          p_media_url: media_url || null,
        })

        if (error) throw error

        // Récupérer le commentaire créé
        const { data: comment } = await supabase
          .from("feed_comments")
          .select(`
            *,
            user:users!user_id (
              id, username, display_name, avatar_url, level
            )
          `)
          .eq("id", commentId)
          .single()

        return NextResponse.json({
          success: true,
          comment: {
            ...comment,
            user_liked: false,
          },
        })
      }

      // Modifier un commentaire
      case "update": {
        const { comment_id, content } = body

        if (!comment_id || !content?.trim()) {
          return NextResponse.json(
            { error: "comment_id et content requis" },
            { status: 400 }
          )
        }

        const { error } = await supabase
          .from("feed_comments")
          .update({
            content: content.trim(),
            is_edited: true,
            updated_at: new Date().toISOString(),
          })
          .eq("id", comment_id)
          .eq("user_id", user.id)

        if (error) throw error

        return NextResponse.json({ success: true })
      }

      // Soft-delete un commentaire (canon §2 / §7 invariant 3)
      case "delete": {
        const { comment_id } = body

        if (!comment_id) {
          return NextResponse.json({ error: "comment_id requis" }, { status: 400 })
        }

        const { data: comment } = await supabase
          .from("feed_comments")
          .select("post_id, parent_id")
          .eq("id", comment_id)
          .eq("user_id", user.id)
          .single()

        if (!comment) {
          return NextResponse.json({ error: "Commentaire non trouvé" }, { status: 404 })
        }

        // Canon: never hard-delete; flip is_deleted/deleted_at, content stays
        // for thread structure but renders as "[supprimé]" client-side.
        const { error } = await supabase
          .from("feed_comments")
          .update({
            is_deleted: true,
            deleted_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", comment_id)
          .eq("user_id", user.id)

        if (error) throw error

        return NextResponse.json({ success: true })
      }

      // Liker un commentaire
      case "like": {
        const { comment_id } = body

        if (!comment_id) {
          return NextResponse.json({ error: "comment_id requis" }, { status: 400 })
        }

        const { error } = await supabase
          .from("comment_likes")
          .insert({
            comment_id,
            user_id: user.id,
          })

        // 23505 = already liked (idempotent), other errors surface.
        if (error && error.code !== "23505") throw error

        // Wave 6G — broken `update({ likes_count: supabase.rpc(...) })`
        // pattern removed (rpc returns a Promise, not a number — wrote
        // garbage). The `comment_likes` insert is the canonical signal;
        // counter aggregation lives in get_post_comments RPC + SQL
        // triggers we'll add in a future wave. Likewise the
        // `users.xp += 1` write was a phantom-XP path (canon §7
        // FORBIDDEN — XP must go through add_xp_to_user RPC, and
        // creator XP is already credited by the canonical engagement
        // pipeline at /api/teen/feed/[id]/engage).
        return NextResponse.json({ success: true })
      }

      // Unliker un commentaire
      case "unlike": {
        const { comment_id } = body

        if (!comment_id) {
          return NextResponse.json({ error: "comment_id requis" }, { status: 400 })
        }

        const { error } = await supabase
          .from("comment_likes")
          .delete()
          .eq("comment_id", comment_id)
          .eq("user_id", user.id)

        if (error) throw error

        // Wave 6G — broken `decrement` rpc pattern removed (same reason
        // as the `like` branch above).
        return NextResponse.json({ success: true })
      }

      // Signaler un commentaire — Wave 2A: canonical user_reports.
      case "report": {
        const { comment_id, reason } = body

        if (!comment_id) {
          return NextResponse.json({ error: "comment_id requis" }, { status: 400 })
        }

        const allowedReasons = [
          "spam","harassment","sexual_content","violence","self_harm",
          "underage","impersonation","illegal","inappropriate","hate_speech",
          "personal_info","other",
        ]
        const safeReason = allowedReasons.includes(reason) ? reason : "inappropriate"

        // Idempotent insert (UNIQUE on reporter+target+target_id).
        const { error } = await supabase
          .from("user_reports")
          .insert({
            reporter_user_id: user.id,
            target_type: "feed_comment",
            target_id: comment_id,
            reason: safeReason,
            status: "open",
          })

        if (error && error.code !== "23505") throw error

        await supabase
          .from("audit_log")
          .insert({
            actor_id: user.id,
            actor_role: "teen",
            action: "content_reported",
            resource_type: "feed_comment",
            resource_id: comment_id,
            metadata: { reason: safeReason },
          })
          .then(() => undefined, () => undefined)

        return NextResponse.json({ success: true })
      }

      default:
        return NextResponse.json({ error: "Action invalide" }, { status: 400 })
    }
  } catch (error) {
    console.error("Comments POST error:", error)
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    )
  }
}
