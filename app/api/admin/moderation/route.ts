/**
 * Wave V1.2-E — Unified moderation queue.
 *
 * GET /api/admin/moderation
 *   Query params (optional):
 *     limit  int  default 100, max 500
 *     offset int  default 0
 *
 * Returns a unified list of pending items, oldest first:
 *   - moderation_queue rows where status='pending' (any content_type)
 *   - marketplace_listings where status='pending_review' that have no queue row
 *   - feed_posts where status='pending_review' that have no queue row
 *
 * Shape:
 *   {
 *     success: true,
 *     items: [{
 *       source: 'queue' | 'marketplace_listing' | 'feed_post',
 *       queue_id?: uuid,
 *       content_type: text,
 *       content_id: uuid,
 *       owner_id: uuid | null,
 *       payload: object | null,
 *       created_at: ISO,
 *     }, ...],
 *     total
 *   }
 *
 * Auth: admin / super_admin / moderator only.
 */
import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

interface UnifiedItem {
  source: "queue" | "marketplace_listing" | "feed_post"
  queue_id?: string
  content_type: string
  content_id: string
  owner_id: string | null
  payload: Record<string, unknown> | null
  created_at: string
}

export async function GET(req: Request) {
  const supabase = await createClient()
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser()
  if (authErr || !user) {
    return NextResponse.json({ success: false, error: "unauthenticated" }, { status: 401 })
  }

  const sr = createServiceRoleClient()
  const { data: role } = await sr
    .from("admin_roles")
    .select("role")
    .eq("profile_id", user.id)
    .maybeSingle()
  if (!role || !["admin", "super_admin", "moderator"].includes(role.role)) {
    return NextResponse.json({ success: false, error: "forbidden" }, { status: 403 })
  }

  const url = new URL(req.url)
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "100", 10) || 100, 500)
  const offset = Math.max(parseInt(url.searchParams.get("offset") || "0", 10) || 0, 0)

  // 1. moderation_queue pending rows.
  const { data: qRows, error: qErr } = await sr
    .from("moderation_queue")
    .select("id, content_type, content_id, payload, created_at")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(limit + offset + 200)
  if (qErr) return NextResponse.json({ success: false, error: qErr.message }, { status: 500 })

  const queueRows = qRows ?? []
  const queueListingIds = new Set(
    queueRows.filter((r) => r.content_type === "marketplace_listing").map((r) => r.content_id),
  )
  const queueFeedIds = new Set(
    queueRows.filter((r) => r.content_type === "feed_post").map((r) => r.content_id),
  )

  // 2. marketplace_listings 'pending_review' that have no queue row yet.
  const { data: pendingListings } = await sr
    .from("marketplace_listings")
    .select("id, seller_user_id, title, category, created_at")
    .eq("status", "pending_review")
    .order("created_at", { ascending: true })
    .limit(limit + offset + 200)

  // 3. feed_posts 'pending_review'.
  const { data: pendingFeed } = await sr
    .from("feed_posts")
    .select("id, user_id, content, post_type, created_at")
    .eq("status", "pending_review")
    .order("created_at", { ascending: true })
    .limit(limit + offset + 200)

  // 4. Resolve owner ids for queue rows. Avoid N+1: collect listing/feed ids
  // referenced by queue rows that aren't already in our pending sets.
  const extraListingIds = queueRows
    .filter((r) => r.content_type === "marketplace_listing")
    .map((r) => r.content_id)
  const extraFeedIds = queueRows
    .filter((r) => r.content_type === "feed_post")
    .map((r) => r.content_id)

  const ownerByListing = new Map<string, string>()
  if (extraListingIds.length > 0) {
    const { data } = await sr
      .from("marketplace_listings")
      .select("id, seller_user_id")
      .in("id", extraListingIds)
    for (const r of data ?? []) {
      if (r.id && r.seller_user_id) ownerByListing.set(r.id as string, r.seller_user_id as string)
    }
  }
  const ownerByFeed = new Map<string, string>()
  if (extraFeedIds.length > 0) {
    const { data } = await sr.from("feed_posts").select("id, user_id").in("id", extraFeedIds)
    for (const r of data ?? []) {
      if (r.id && r.user_id) ownerByFeed.set(r.id as string, r.user_id as string)
    }
  }

  const items: UnifiedItem[] = []

  for (const r of queueRows) {
    let ownerId: string | null = null
    if (r.content_type === "marketplace_listing" && r.content_id) {
      ownerId = ownerByListing.get(r.content_id) ?? null
    } else if (r.content_type === "feed_post" && r.content_id) {
      ownerId = ownerByFeed.get(r.content_id) ?? null
    }
    items.push({
      source: "queue",
      queue_id: r.id as string,
      content_type: r.content_type as string,
      content_id: r.content_id as string,
      owner_id: ownerId,
      payload: (r.payload as Record<string, unknown> | null) ?? null,
      created_at: r.created_at as string,
    })
  }

  for (const r of pendingListings ?? []) {
    if (queueListingIds.has(r.id as string)) continue
    items.push({
      source: "marketplace_listing",
      content_type: "marketplace_listing",
      content_id: r.id as string,
      owner_id: (r.seller_user_id as string) ?? null,
      payload: { title: r.title, category: r.category },
      created_at: r.created_at as string,
    })
  }

  for (const r of pendingFeed ?? []) {
    if (queueFeedIds.has(r.id as string)) continue
    items.push({
      source: "feed_post",
      content_type: "feed_post",
      content_id: r.id as string,
      owner_id: (r.user_id as string) ?? null,
      payload: { content: r.content, post_type: r.post_type },
      created_at: r.created_at as string,
    })
  }

  // Sort by oldest pending and paginate.
  items.sort((a, b) => {
    const ta = Date.parse(a.created_at) || 0
    const tb = Date.parse(b.created_at) || 0
    return ta - tb
  })
  const total = items.length
  const paged = items.slice(offset, offset + limit)

  return NextResponse.json({ success: true, items: paged, total, limit, offset })
}
