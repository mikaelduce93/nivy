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

        // Vérifier la longueur
        if (content.length > 1000) {
          return NextResponse.json(
            { error: "Commentaire trop long (max 1000 caractères)" },
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

      // Supprimer un commentaire
      case "delete": {
        const { comment_id } = body

        if (!comment_id) {
          return NextResponse.json({ error: "comment_id requis" }, { status: 400 })
        }

        // Récupérer les infos du commentaire
        const { data: comment } = await supabase
          .from("feed_comments")
          .select("post_id, parent_id")
          .eq("id", comment_id)
          .eq("user_id", user.id)
          .single()

        if (!comment) {
          return NextResponse.json({ error: "Commentaire non trouvé" }, { status: 404 })
        }

        const { error } = await supabase
          .from("feed_comments")
          .delete()
          .eq("id", comment_id)
          .eq("user_id", user.id)

        if (error) throw error

        // Mettre à jour les compteurs
        await supabase
          .from("feed_posts")
          .update({ comments_count: supabase.rpc("decrement", { x: 1 }) })
          .eq("id", comment.post_id)

        if (comment.parent_id) {
          await supabase
            .from("feed_comments")
            .update({ replies_count: supabase.rpc("decrement", { x: 1 }) })
            .eq("id", comment.parent_id)
        }

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

        if (error && error.code !== "23505") throw error

        // Mettre à jour le compteur
        await supabase
          .from("feed_comments")
          .update({ likes_count: supabase.rpc("increment", { x: 1 }) })
          .eq("id", comment_id)

        // XP et notification pour l'auteur
        const { data: comment } = await supabase
          .from("feed_comments")
          .select("user_id, post_id")
          .eq("id", comment_id)
          .single()

        if (comment && comment.user_id !== user.id) {
          await supabase
            .from("users")
            .update({ xp: supabase.rpc("increment", { x: 1 }) })
            .eq("id", comment.user_id)
        }

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

        // Mettre à jour le compteur
        await supabase
          .from("feed_comments")
          .update({ likes_count: supabase.rpc("decrement", { x: 1 }) })
          .eq("id", comment_id)

        return NextResponse.json({ success: true })
      }

      // Signaler un commentaire
      case "report": {
        const { comment_id, reason } = body

        if (!comment_id) {
          return NextResponse.json({ error: "comment_id requis" }, { status: 400 })
        }

        // Insérer le signalement dans une table de modération
        const { error } = await supabase
          .from("reports")
          .insert({
            reporter_id: user.id,
            content_type: "comment",
            content_id: comment_id,
            reason: reason || "inappropriate",
          })

        if (error && error.code !== "23505") throw error

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
