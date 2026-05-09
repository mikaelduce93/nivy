/**
 * GET    /api/marketplace/listings/:id — listing detail. Public visibility
 *                                        is gated to status='active'; the
 *                                        seller and admins/moderators can
 *                                        still see non-active listings.
 * PATCH  /api/marketplace/listings/:id — owner edit. Material edits to a
 *                                        previously-approved listing flip
 *                                        it back to status='pending_review'.
 * DELETE /api/marketplace/listings/:id — owner soft-delete (status='removed').
 *
 * Wave 4C — adds the missing owner CRUD + status gate (canon §3 marketplace:
 * a pending or rejected listing must NEVER appear public via direct URL).
 */

import { NextResponse } from "next/server"
import { z } from "zod"
import { getUserRole } from "@/lib/auth/get-user-role"
import { getAdminInfo } from "@/lib/auth/admin-permissions"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const PUBLIC_VISIBLE_STATUSES = new Set(["active"])

export async function GET(
  _request: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params
  if (!id) return NextResponse.json({ success: false, error: "missing_id" }, { status: 400 })

  const sb = createServiceRoleClient()
  const { data: listing, error } = await sb
    .from("marketplace_listings")
    .select("*")
    .eq("id", id)
    .maybeSingle()
  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  if (!listing) return NextResponse.json({ success: false, error: "not_found" }, { status: 404 })

  // Wave 4C — non-active listings are gated to the seller / admin / moderator.
  // Bookmarking a pending or rejected ID must not leak unmoderated content.
  if (!PUBLIC_VISIBLE_STATUSES.has(listing.status)) {
    const userInfo = await getUserRole()
    const isOwner = !!userInfo && userInfo.profileId === listing.seller_user_id
    let isAdmin = false
    if (!isOwner) {
      const admin = await getAdminInfo()
      isAdmin = !!admin && admin.permissions["content.view"] === true
    }
    if (!isOwner && !isAdmin) {
      return NextResponse.json({ success: false, error: "not_found" }, { status: 404 })
    }
  }

  // best-effort views++ (only if active so deletes don't get weird)
  if (listing.status === "active") {
    await sb
      .from("marketplace_listings")
      .update({ views_count: (listing.views_count ?? 0) + 1 })
      .eq("id", id)
  }

  // join seller stats for trust badge
  const { data: stats } = await sb
    .from("user_seller_stats")
    .select("sold_count, rating_avg, trust_badge")
    .eq("user_id", listing.seller_user_id)
    .maybeSingle()

  return NextResponse.json({ success: true, listing, seller_stats: stats ?? null })
}

const RX_PHONE = /(\+?\d[\d\s().-]{7,}\d)/i
const RX_EMAIL = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i
const RX_HANDLE = /@[a-z0-9_.]{3,}/i
const RX_SOCIAL = /(whatsapp|wa\.me|instagram|insta\b|ig\b|t\.me|telegram|snap|snapchat)/i

const patchSchema = z.object({
  title: z.string().min(3).max(120).optional(),
  description: z.string().max(2000).optional(),
  price_coins: z.number().int().nonnegative().optional(),
  price_dh: z.number().nonnegative().optional(),
  images: z.array(z.string()).max(8).optional(),
  condition: z.string().max(40).nullable().optional(),
  size: z.string().max(40).nullable().optional(),
  brand: z.string().max(80).nullable().optional(),
  color: z.string().max(40).nullable().optional(),
  city: z.string().max(80).nullable().optional(),
  neighborhood: z.string().max(80).nullable().optional(),
})

export async function PATCH(
  request: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params
  if (!id) return NextResponse.json({ success: false, error: "missing_id" }, { status: 400 })

  const userInfo = await getUserRole()
  if (!userInfo) {
    return NextResponse.json({ success: false, error: "unauthorized" }, { status: 401 })
  }

  let parsed: z.infer<typeof patchSchema>
  try {
    parsed = patchSchema.parse(await request.json())
  } catch {
    return NextResponse.json({ success: false, error: "invalid_body" }, { status: 400 })
  }

  // Defence in depth — block contact-info / social-handle leakage in edits.
  if (parsed.title || parsed.description) {
    const combined = `${parsed.title ?? ""} ${parsed.description ?? ""}`.toLowerCase()
    if (RX_PHONE.test(combined) || RX_EMAIL.test(combined) || RX_HANDLE.test(combined) || RX_SOCIAL.test(combined)) {
      return NextResponse.json({ success: false, error: "contact_info_blocked" }, { status: 400 })
    }
  }

  const sb = createServiceRoleClient()
  const { data: existing } = await sb
    .from("marketplace_listings")
    .select("id, seller_user_id, status")
    .eq("id", id)
    .maybeSingle()
  if (!existing) {
    return NextResponse.json({ success: false, error: "not_found" }, { status: 404 })
  }
  if (existing.seller_user_id !== userInfo.profileId) {
    return NextResponse.json({ success: false, error: "not_owner" }, { status: 403 })
  }

  const update: Record<string, unknown> = {}
  for (const k of Object.keys(parsed) as Array<keyof typeof parsed>) {
    if (parsed[k] !== undefined) update[k] = parsed[k] as unknown
  }
  if (Object.keys(update).length === 0) {
    return NextResponse.json({ success: false, error: "no_fields" }, { status: 400 })
  }

  // Wave 4C — material edits to a previously-approved listing flip it back
  // to pending_review so the change re-enters moderation. Removed/sold
  // listings are not editable.
  if (existing.status === "removed" || existing.status === "sold") {
    return NextResponse.json(
      { success: false, error: "listing_not_editable", status: existing.status },
      { status: 409 },
    )
  }
  if (existing.status === "active") {
    update.status = "pending_review"
  }

  const { data: updated, error } = await sb
    .from("marketplace_listings")
    .update(update)
    .eq("id", id)
    .select("*")
    .single()
  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, listing: updated })
}

export async function DELETE(
  _request: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params
  if (!id) return NextResponse.json({ success: false, error: "missing_id" }, { status: 400 })

  const userInfo = await getUserRole()
  if (!userInfo) {
    return NextResponse.json({ success: false, error: "unauthorized" }, { status: 401 })
  }

  const sb = createServiceRoleClient()
  const { data: existing } = await sb
    .from("marketplace_listings")
    .select("id, seller_user_id, status")
    .eq("id", id)
    .maybeSingle()
  if (!existing) {
    return NextResponse.json({ success: false, error: "not_found" }, { status: 404 })
  }
  if (existing.seller_user_id !== userInfo.profileId) {
    return NextResponse.json({ success: false, error: "not_owner" }, { status: 403 })
  }
  if (existing.status === "sold") {
    return NextResponse.json(
      { success: false, error: "cannot_delete_sold" },
      { status: 409 },
    )
  }

  const { error } = await sb
    .from("marketplace_listings")
    .update({ status: "removed" })
    .eq("id", id)
  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, listing_id: id, status: "removed" })
}
