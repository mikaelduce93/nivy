/**
 * API FEED — Wave 2A canonical cursor pagination.
 *
 * GET /api/teen/feed?cursor=<base64>&limit=20
 *   - Cursor: base64-encoded JSON { f: boolean, t: ISOstring, i: uuid }.
 *   - Limit: hard-capped to 20 server-side (canon §1).
 *   - Returns: { posts: [...with user_liked/user_saved/user_reported], nextCursor }.
 *
 * Other (legacy) ?type=… branches retained for /teen/profile, hashtags, etc.
 */

import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

const CANONICAL_PAGE_SIZE = 20

type FeedCardRow = {
  id: string
  user_id: string
  type: string | null
  category: string | null
  content: string | null
  media_urls: unknown
  metadata: unknown
  visibility: string | null
  status: string | null
  featured: boolean | null
  likes_count: number | null
  comments_count: number | null
  shares_count: number | null
  created_at: string
  user_liked: boolean
  user_saved: boolean
  user_reported: boolean
}

type CursorShape = { f: boolean; t: string; i: string }

export function decodeFeedCursor(raw: string | null): CursorShape | null {
  if (!raw) return null
  try {
    const json = Buffer.from(raw, "base64").toString("utf-8")
    const parsed = JSON.parse(json)
    if (
      parsed &&
      typeof parsed.f === "boolean" &&
      typeof parsed.t === "string" &&
      typeof parsed.i === "string"
    ) {
      return parsed as CursorShape
    }
    return null
  } catch {
    return null
  }
}

export function encodeFeedCursor(c: CursorShape): string {
  return Buffer.from(JSON.stringify(c), "utf-8").toString("base64")
}

export async function fetchFeedPage(
  supabase: any,
  userId: string | null,
  cursor: CursorShape | null,
  limit: number
): Promise<{ posts: FeedCardRow[]; nextCursor: string | null }> {
  const safeLimit = Math.min(Math.max(limit, 1), CANONICAL_PAGE_SIZE)

  const rpcName = userId ? "get_feed_cursor_page" : "get_feed_cursor_page_anon"
  const rpcArgs = userId
    ? {
        p_user_id: userId,
        p_limit: safeLimit,
        p_cursor_featured: cursor?.f ?? null,
        p_cursor_created_at: cursor?.t ?? null,
        p_cursor_id: cursor?.i ?? null,
      }
    : {
        p_limit: safeLimit,
        p_cursor_featured: cursor?.f ?? null,
        p_cursor_created_at: cursor?.t ?? null,
        p_cursor_id: cursor?.i ?? null,
      }

  const { data, error } = await supabase.rpc(rpcName, rpcArgs)
  if (error) throw error

  const rows = (data ?? []) as FeedCardRow[]
  const nextCursor =
    rows.length === safeLimit
      ? encodeFeedCursor({
          f: rows[rows.length - 1].featured ?? false,
          t: rows[rows.length - 1].created_at,
          i: rows[rows.length - 1].id,
        })
      : null
  return { posts: rows, nextCursor }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const { searchParams } = new URL(request.url)
    const type = searchParams.get("type") || "feed"
    const cursorRaw = searchParams.get("cursor")
    const limitRaw = parseInt(searchParams.get("limit") || "20", 10)

    // ===== Wave 2A canonical paginated feed =====
    if (type === "feed") {
      const cursor = decodeFeedCursor(cursorRaw)
      const { posts, nextCursor } = await fetchFeedPage(
        supabase,
        user?.id ?? null,
        cursor,
        limitRaw
      )
      return NextResponse.json({ posts, nextCursor })
    }

    // ----- Legacy branches (kept; auth required) -----
    if (!user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }

    const filter = searchParams.get("filter") || "all"
    const limit = parseInt(searchParams.get("limit") || "20", 10)
    const offset = parseInt(searchParams.get("offset") || "0", 10)
    const postId = searchParams.get("post_id")
    const userId = searchParams.get("user_id")
    const hashtag = searchParams.get("hashtag")

    switch (type) {
      case "post": {
        if (!postId) {
          return NextResponse.json({ error: "post_id requis" }, { status: 400 })
        }

        const { data: post, error } = await supabase
          .from("feed_posts")
          .select(
            `*,
            user:users!user_id (id, username, display_name, avatar_url, level)`
          )
          .eq("id", postId)
          .single()

        if (error && error.code !== "PGRST116") throw error

        const [{ data: liked }, { data: bookmark }, { data: reported }] = await Promise.all([
          supabase.from("feed_likes").select("id").eq("post_id", postId).eq("user_id", user.id).maybeSingle(),
          supabase.from("feed_bookmarks").select("id").eq("post_id", postId).eq("user_id", user.id).maybeSingle(),
          supabase
            .from("user_reports")
            .select("id")
            .eq("target_type", "feed_post")
            .eq("target_id", postId)
            .eq("reporter_user_id", user.id)
            .maybeSingle(),
        ])

        return NextResponse.json({
          post: post
            ? {
                ...post,
                user_liked: !!liked,
                user_saved: !!bookmark,
                user_reported: !!reported,
                is_bookmarked: !!bookmark,
              }
            : null,
        })
      }

      case "user": {
        const targetUserId = userId || user.id
        // Wave 6G — match the canonical RPC's visibility gate
        // (mig 097: status='published' AND is_hidden=false). Without
        // the status filter, pending/rejected/removed posts would
        // surface on a user's profile feed.
        const { data: posts, error } = await supabase
          .from("feed_posts")
          .select(
            `*, user:users!user_id (id, username, display_name, avatar_url, level)`
          )
          .eq("user_id", targetUserId)
          .eq("is_hidden", false)
          .eq("status", "published")
          .order("created_at", { ascending: false })
          .range(offset, offset + limit - 1)

        if (error) throw error
        return NextResponse.json({ posts: posts || [], has_more: (posts?.length || 0) === limit })
      }

      case "hashtag": {
        if (!hashtag) return NextResponse.json({ error: "hashtag requis" }, { status: 400 })
        const { data: hashtagData } = await supabase
          .from("hashtags")
          .select("id, posts_count")
          .eq("tag", hashtag.toLowerCase())
          .single()
        if (!hashtagData) return NextResponse.json({ posts: [], hashtag_info: null })

        const { data: posts, error } = await supabase
          .from("post_hashtags")
          .select(
            `post:feed_posts (*, user:users!user_id (id, username, display_name, avatar_url, level))`
          )
          .eq("hashtag_id", hashtagData.id)
          .order("post(created_at)", { ascending: false })
          .range(offset, offset + limit - 1)

        if (error) throw error
        return NextResponse.json({
          posts: posts?.map((p: any) => p.post).filter(Boolean) || [],
          hashtag_info: hashtagData,
          has_more: (posts?.length || 0) === limit,
        })
      }

      case "trending": {
        const { data: hashtags, error } = await supabase.rpc("get_trending_hashtags", {
          p_limit: limit,
        })
        if (error) throw error
        return NextResponse.json({ hashtags: hashtags || [] })
      }

      case "bookmarks": {
        const collection = searchParams.get("collection") || "default"
        const { data: bookmarks, error } = await supabase
          .from("feed_bookmarks")
          .select(
            `id, collection, created_at, post:feed_posts (*, user:users!user_id (id, username, display_name, avatar_url, level))`
          )
          .eq("user_id", user.id)
          .eq("collection", collection)
          .order("created_at", { ascending: false })
          .range(offset, offset + limit - 1)

        if (error) throw error
        return NextResponse.json({ bookmarks: bookmarks || [], has_more: (bookmarks?.length || 0) === limit })
      }

      case "mentions": {
        const { data: mentions, error } = await supabase
          .from("feed_mentions")
          .select(
            `*,
            post:feed_posts (id, content, post_type, created_at,
              user:users!user_id (id, username, display_name, avatar_url)),
            comment:feed_comments (id, content, created_at, post:feed_posts (id)),
            mentioner:users!mentioned_by (id, username, display_name, avatar_url)`
          )
          .eq("mentioned_user_id", user.id)
          .order("created_at", { ascending: false })
          .range(offset, offset + limit - 1)

        if (error) throw error
        return NextResponse.json({ mentions: mentions || [], has_more: (mentions?.length || 0) === limit })
      }

      default:
        return NextResponse.json({ error: "Type invalide" }, { status: 400 })
    }
  } catch (error) {
    console.error("Feed GET error:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}

// POST: Actions sur le feed (legacy, kept).
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
    const { action } = body

    switch (action) {
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

        if (!content && media_urls.length === 0) {
          return NextResponse.json({ error: "Contenu ou média requis" }, { status: 400 })
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

        const { data: post } = await supabase
          .from("feed_posts")
          .select(
            `*, user:users!user_id (id, username, display_name, avatar_url, level)`
          )
          .eq("id", postId)
          .single()

        return NextResponse.json({ success: true, post })
      }

      case "update": {
        const { post_id, content, visibility } = body
        if (!post_id) return NextResponse.json({ error: "post_id requis" }, { status: 400 })
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

      case "delete": {
        const { post_id } = body
        if (!post_id) return NextResponse.json({ error: "post_id requis" }, { status: 400 })
        const { error } = await supabase
          .from("feed_posts")
          .delete()
          .eq("id", post_id)
          .eq("user_id", user.id)
        if (error) throw error
        return NextResponse.json({ success: true })
      }

      case "like":
      case "unlike": {
        const { post_id, reaction_type = "like" } = body
        if (!post_id) return NextResponse.json({ error: "post_id requis" }, { status: 400 })
        const { data: result, error } = await supabase.rpc("toggle_post_like", {
          p_user_id: user.id,
          p_post_id: post_id,
          p_reaction_type: reaction_type,
        })
        if (error) throw error
        return NextResponse.json({ success: true, ...result })
      }

      case "bookmark": {
        const { post_id, collection = "default" } = body
        if (!post_id) return NextResponse.json({ error: "post_id requis" }, { status: 400 })
        const { error } = await supabase
          .from("feed_bookmarks")
          .insert({ post_id, user_id: user.id, collection })
        if (error && error.code !== "23505") throw error
        return NextResponse.json({ success: true })
      }

      case "unbookmark": {
        const { post_id } = body
        if (!post_id) return NextResponse.json({ error: "post_id requis" }, { status: 400 })
        const { error } = await supabase
          .from("feed_bookmarks")
          .delete()
          .eq("post_id", post_id)
          .eq("user_id", user.id)
        if (error) throw error
        return NextResponse.json({ success: true })
      }

      case "hide": {
        const { post_id, reason } = body
        if (!post_id) return NextResponse.json({ error: "post_id requis" }, { status: 400 })
        const { error } = await supabase
          .from("hidden_posts")
          .insert({ user_id: user.id, post_id, reason })
        if (error && error.code !== "23505") throw error
        return NextResponse.json({ success: true })
      }

      case "share": {
        const { post_id, share_type = "repost", comment } = body
        if (!post_id) return NextResponse.json({ error: "post_id requis" }, { status: 400 })

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

        // Wave 6G — broken `update({ shares_count: supabase.rpc(...) })`
        // pattern removed. `supabase.rpc()` returns a Promise, not a
        // numeric value, so the previous code wrote garbage / NaN to the
        // counter (or silently failed). The `feed_shares` insert above
        // is the canonical signal; counters are now derived by the
        // canonical engagement pipeline (`/api/teen/feed/[id]/engage`)
        // which does a real read-then-update, or by future SQL triggers.

        return NextResponse.json({ success: true })
      }

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
          .upsert({ user_id: user.id, muted_user_id: target_user_id, mute_until: muteUntil })
        if (error) throw error
        return NextResponse.json({ success: true })
      }

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

      case "view": {
        const { post_id, duration = 0 } = body
        if (!post_id) return NextResponse.json({ error: "post_id requis" }, { status: 400 })
        const { error } = await supabase
          .from("feed_views")
          .upsert({ post_id, user_id: user.id, view_duration: duration })
        if (error && error.code !== "23505") throw error
        // Wave 6G — broken `update({ views_count: supabase.rpc(...) })`
        // pattern removed (same root cause as the share branch above).
        // Real counter maintenance lives in
        // `/api/teen/feed/[id]/engage`, which does a proper
        // read-then-update for views_count.
        return NextResponse.json({ success: true })
      }

      default:
        return NextResponse.json({ error: "Action invalide" }, { status: 400 })
    }
  } catch (error) {
    console.error("Feed POST error:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
