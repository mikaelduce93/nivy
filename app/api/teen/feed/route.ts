/**
 * API FEED D'ACTIVITÉ
 * ===================
 * Gestion du fil d'actualités personnalisé
 */

import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

// GET: Récupérer le feed
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get("type") || "feed"
    const filter = searchParams.get("filter") || "all"
    const limit = parseInt(searchParams.get("limit") || "20")
    const offset = parseInt(searchParams.get("offset") || "0")
    const postId = searchParams.get("post_id")
    const userId = searchParams.get("user_id")
    const hashtag = searchParams.get("hashtag")

    switch (type) {
      // Feed personnalisé
      case "feed": {
        const { data: posts, error } = await supabase.rpc("get_personalized_feed", {
          p_user_id: user.id,
          p_limit: limit,
          p_offset: offset,
          p_filter: filter,
        })

        if (error) throw error

        return NextResponse.json({
          posts: posts || [],
          has_more: (posts?.length || 0) === limit,
        })
      }

      // Post unique avec détails
      case "post": {
        if (!postId) {
          return NextResponse.json({ error: "post_id requis" }, { status: 400 })
        }

        const { data: post, error } = await supabase
          .from("feed_posts")
          .select(`
            *,
            user:users!user_id (
              id, username, display_name, avatar_url, level
            ),
            circle:circles (id, name, emoji),
            user_like:feed_likes!inner (reaction_type)
          `)
          .eq("id", postId)
          .eq("feed_likes.user_id", user.id)
          .single()

        if (error && error.code !== "PGRST116") throw error

        // Vérifier si bookmarké
        const { data: bookmark } = await supabase
          .from("feed_bookmarks")
          .select("id")
          .eq("post_id", postId)
          .eq("user_id", user.id)
          .single()

        return NextResponse.json({
          post: post ? {
            ...post,
            is_bookmarked: !!bookmark,
            user_reaction: post.user_like?.[0]?.reaction_type || null,
          } : null,
        })
      }

      // Posts d'un utilisateur
      case "user": {
        const targetUserId = userId || user.id

        const { data: posts, error } = await supabase
          .from("feed_posts")
          .select(`
            *,
            user:users!user_id (
              id, username, display_name, avatar_url, level
            )
          `)
          .eq("user_id", targetUserId)
          .eq("is_hidden", false)
          .order("created_at", { ascending: false })
          .range(offset, offset + limit - 1)

        if (error) throw error

        return NextResponse.json({
          posts: posts || [],
          has_more: (posts?.length || 0) === limit,
        })
      }

      // Posts par hashtag
      case "hashtag": {
        if (!hashtag) {
          return NextResponse.json({ error: "hashtag requis" }, { status: 400 })
        }

        const { data: hashtagData } = await supabase
          .from("hashtags")
          .select("id, posts_count")
          .eq("tag", hashtag.toLowerCase())
          .single()

        if (!hashtagData) {
          return NextResponse.json({ posts: [], hashtag_info: null })
        }

        const { data: posts, error } = await supabase
          .from("post_hashtags")
          .select(`
            post:feed_posts (
              *,
              user:users!user_id (
                id, username, display_name, avatar_url, level
              )
            )
          `)
          .eq("hashtag_id", hashtagData.id)
          .order("post(created_at)", { ascending: false })
          .range(offset, offset + limit - 1)

        if (error) throw error

        return NextResponse.json({
          posts: posts?.map((p) => p.post).filter(Boolean) || [],
          hashtag_info: hashtagData,
          has_more: (posts?.length || 0) === limit,
        })
      }

      // Hashtags tendance
      case "trending": {
        const { data: hashtags, error } = await supabase.rpc("get_trending_hashtags", {
          p_limit: limit,
        })

        if (error) throw error

        return NextResponse.json({ hashtags: hashtags || [] })
      }

      // Posts bookmarkés
      case "bookmarks": {
        const collection = searchParams.get("collection") || "default"

        const { data: bookmarks, error } = await supabase
          .from("feed_bookmarks")
          .select(`
            id,
            collection,
            created_at,
            post:feed_posts (
              *,
              user:users!user_id (
                id, username, display_name, avatar_url, level
              )
            )
          `)
          .eq("user_id", user.id)
          .eq("collection", collection)
          .order("created_at", { ascending: false })
          .range(offset, offset + limit - 1)

        if (error) throw error

        return NextResponse.json({
          bookmarks: bookmarks || [],
          has_more: (bookmarks?.length || 0) === limit,
        })
      }

      // Mentions
      case "mentions": {
        const { data: mentions, error } = await supabase
          .from("feed_mentions")
          .select(`
            *,
            post:feed_posts (
              id, content, post_type, created_at,
              user:users!user_id (id, username, display_name, avatar_url)
            ),
            comment:feed_comments (
              id, content, created_at,
              post:feed_posts (id)
            ),
            mentioner:users!mentioned_by (
              id, username, display_name, avatar_url
            )
          `)
          .eq("mentioned_user_id", user.id)
          .order("created_at", { ascending: false })
          .range(offset, offset + limit - 1)

        if (error) throw error

        return NextResponse.json({
          mentions: mentions || [],
          has_more: (mentions?.length || 0) === limit,
        })
      }

      default:
        return NextResponse.json({ error: "Type invalide" }, { status: 400 })
    }
  } catch (error) {
    console.error("Feed GET error:", error)
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    )
  }
}

// POST: Actions sur le feed
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
      // Créer un post
      case "create": {
        const {
          post_type = "status",
          content,
          media_urls = [],
          metadata = {},
          visibility = "friends",
          circle_id,
          reference_type,
          reference_id,
        } = body

        // Validation
        if (!content && media_urls.length === 0) {
          return NextResponse.json(
            { error: "Contenu ou média requis" },
            { status: 400 }
          )
        }

        const { data: postId, error } = await supabase.rpc("create_feed_post", {
          p_user_id: user.id,
          p_post_type: post_type,
          p_content: content,
          p_media_urls: media_urls,
          p_metadata: metadata,
          p_visibility: visibility,
          p_circle_id: circle_id,
          p_reference_type: reference_type,
          p_reference_id: reference_id,
        })

        if (error) throw error

        // Récupérer le post créé
        const { data: post } = await supabase
          .from("feed_posts")
          .select(`
            *,
            user:users!user_id (
              id, username, display_name, avatar_url, level
            )
          `)
          .eq("id", postId)
          .single()

        return NextResponse.json({
          success: true,
          post,
        })
      }

      // Modifier un post
      case "update": {
        const { post_id, content, visibility } = body

        if (!post_id) {
          return NextResponse.json({ error: "post_id requis" }, { status: 400 })
        }

        const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
        if (content !== undefined) updates.content = content
        if (visibility) updates.visibility = visibility

        const { error } = await supabase
          .from("feed_posts")
          .update(updates)
          .eq("id", post_id)
          .eq("user_id", user.id)

        if (error) throw error

        return NextResponse.json({ success: true })
      }

      // Supprimer un post
      case "delete": {
        const { post_id } = body

        if (!post_id) {
          return NextResponse.json({ error: "post_id requis" }, { status: 400 })
        }

        const { error } = await supabase
          .from("feed_posts")
          .delete()
          .eq("id", post_id)
          .eq("user_id", user.id)

        if (error) throw error

        return NextResponse.json({ success: true })
      }

      // Liker/unliker un post
      case "like":
      case "unlike": {
        const { post_id, reaction_type = "like" } = body

        if (!post_id) {
          return NextResponse.json({ error: "post_id requis" }, { status: 400 })
        }

        const { data: result, error } = await supabase.rpc("toggle_post_like", {
          p_user_id: user.id,
          p_post_id: post_id,
          p_reaction_type: reaction_type,
        })

        if (error) throw error

        return NextResponse.json({
          success: true,
          ...result,
        })
      }

      // Bookmarker un post
      case "bookmark": {
        const { post_id, collection = "default" } = body

        if (!post_id) {
          return NextResponse.json({ error: "post_id requis" }, { status: 400 })
        }

        const { error } = await supabase
          .from("feed_bookmarks")
          .insert({
            post_id,
            user_id: user.id,
            collection,
          })

        if (error && error.code !== "23505") throw error

        return NextResponse.json({ success: true })
      }

      // Retirer bookmark
      case "unbookmark": {
        const { post_id } = body

        if (!post_id) {
          return NextResponse.json({ error: "post_id requis" }, { status: 400 })
        }

        const { error } = await supabase
          .from("feed_bookmarks")
          .delete()
          .eq("post_id", post_id)
          .eq("user_id", user.id)

        if (error) throw error

        return NextResponse.json({ success: true })
      }

      // Masquer un post
      case "hide": {
        const { post_id, reason } = body

        if (!post_id) {
          return NextResponse.json({ error: "post_id requis" }, { status: 400 })
        }

        const { error } = await supabase
          .from("hidden_posts")
          .insert({
            user_id: user.id,
            post_id,
            reason,
          })

        if (error && error.code !== "23505") throw error

        return NextResponse.json({ success: true })
      }

      // Partager un post
      case "share": {
        const { post_id, share_type = "repost", comment } = body

        if (!post_id) {
          return NextResponse.json({ error: "post_id requis" }, { status: 400 })
        }

        // Créer le post de partage si quote
        let sharedPostId = null
        if (share_type === "quote" && comment) {
          const { data: newPostId } = await supabase.rpc("create_feed_post", {
            p_user_id: user.id,
            p_post_type: "status",
            p_content: comment,
            p_metadata: { shared_post_id: post_id },
            p_visibility: "friends",
          })
          sharedPostId = newPostId
        }

        // Enregistrer le partage
        const { error } = await supabase
          .from("feed_shares")
          .insert({
            original_post_id: post_id,
            shared_by: user.id,
            shared_post_id: sharedPostId,
            share_type,
            comment,
          })

        if (error) throw error

        // Mettre à jour le compteur
        await supabase
          .from("feed_posts")
          .update({ shares_count: supabase.rpc("increment", { x: 1 }) })
          .eq("id", post_id)

        // XP pour l'auteur original
        const { data: originalPost } = await supabase
          .from("feed_posts")
          .select("user_id")
          .eq("id", post_id)
          .single()

        if (originalPost && originalPost.user_id !== user.id) {
          await supabase
            .from("users")
            .update({ xp: supabase.rpc("increment", { x: 5 }) })
            .eq("id", originalPost.user_id)
        }

        return NextResponse.json({ success: true })
      }

      // Muter un utilisateur dans le feed
      case "mute_user": {
        const { target_user_id, duration_hours } = body

        if (!target_user_id) {
          return NextResponse.json({ error: "target_user_id requis" }, { status: 400 })
        }

        const muteUntil = duration_hours
          ? new Date(Date.now() + duration_hours * 60 * 60 * 1000).toISOString()
          : null

        const { error } = await supabase
          .from("feed_muted_users")
          .upsert({
            user_id: user.id,
            muted_user_id: target_user_id,
            mute_until: muteUntil,
          })

        if (error) throw error

        return NextResponse.json({ success: true })
      }

      // Unmuter un utilisateur
      case "unmute_user": {
        const { target_user_id } = body

        if (!target_user_id) {
          return NextResponse.json({ error: "target_user_id requis" }, { status: 400 })
        }

        const { error } = await supabase
          .from("feed_muted_users")
          .delete()
          .eq("user_id", user.id)
          .eq("muted_user_id", target_user_id)

        if (error) throw error

        return NextResponse.json({ success: true })
      }

      // Marquer les mentions comme lues
      case "mark_mentions_read": {
        const { error } = await supabase
          .from("feed_mentions")
          .update({ is_read: true })
          .eq("mentioned_user_id", user.id)
          .eq("is_read", false)

        if (error) throw error

        return NextResponse.json({ success: true })
      }

      // Enregistrer une vue
      case "view": {
        const { post_id, duration = 0 } = body

        if (!post_id) {
          return NextResponse.json({ error: "post_id requis" }, { status: 400 })
        }

        const { error } = await supabase
          .from("feed_views")
          .upsert({
            post_id,
            user_id: user.id,
            view_duration: duration,
          })

        if (error && error.code !== "23505") throw error

        // Mettre à jour le compteur de vues
        await supabase
          .from("feed_posts")
          .update({ views_count: supabase.rpc("increment", { x: 1 }) })
          .eq("id", post_id)

        return NextResponse.json({ success: true })
      }

      default:
        return NextResponse.json({ error: "Action invalide" }, { status: 400 })
    }
  } catch (error) {
    console.error("Feed POST error:", error)
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    )
  }
}
