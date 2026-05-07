/**
 * Marketplace listings — list & create.
 *
 * GET   /api/marketplace/listings          — discover feed (filters)
 * POST  /api/marketplace/listings          — create (calls create_listing RPC)
 *
 * Spec: docs/vision/marketplace-c2c.md (Wave 2.4)
 */

import { NextResponse } from "next/server"
import { getUserRole } from "@/lib/auth/get-user-role"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const VALID_CATEGORIES = new Set([
  "clothing","books","school","sport","gaming","art","crafts","tickets","services","other",
])

// Server-side safety regex (mirror of DB regex; defence in depth)
const RX_PHONE = /(\+?\d[\d\s().-]{7,}\d)/i
const RX_EMAIL = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i
const RX_HANDLE = /@[a-z0-9_.]{3,}/i
const RX_SOCIAL = /(whatsapp|wa\.me|instagram|insta\b|ig\b|t\.me|telegram|snap|snapchat)/i
const RX_BLOCKED = /\b(weapon|gun|knife|firearm|drug|cannabis|marijuana|cocaine|alcohol|wine|beer|whisky|tobacco|cigarette|vape|e-cigarette)\b/i

export async function GET(request: Request) {
  const url = new URL(request.url)
  const category = url.searchParams.get("category")
  const city = url.searchParams.get("city")
  const maxPrice = url.searchParams.get("max_price")
  const search = url.searchParams.get("search")

  const sb = createServiceRoleClient()
  let q = sb
    .from("marketplace_listings")
    .select(
      "id, seller_user_id, category, title, description, price_coins, price_dh, images, condition, city, neighborhood, views_count, created_at"
    )
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(60)

  if (category && VALID_CATEGORIES.has(category)) q = q.eq("category", category)
  if (city) q = q.eq("city", city)
  if (maxPrice) {
    const n = Number(maxPrice)
    if (Number.isFinite(n) && n > 0) q = q.lte("price_coins", n)
  }
  if (search) q = q.ilike("title", `%${search}%`)

  const { data, error } = await q
  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
  return NextResponse.json({ success: true, listings: data ?? [] })
}

export async function POST(request: Request) {
  try {
    const userInfo = await getUserRole()
    if (!userInfo) return NextResponse.json({ success: false, error: "unauthorized" }, { status: 401 })
    if (userInfo.role !== "teen" && userInfo.role !== "parent") {
      return NextResponse.json({ success: false, error: "role_not_allowed" }, { status: 403 })
    }

    const sellerId = userInfo.role === "teen" ? (userInfo.teenData?.id || userInfo.profileId) : userInfo.profileId
    if (!sellerId) return NextResponse.json({ success: false, error: "no_profile" }, { status: 400 })

    const body = (await request.json()) as Record<string, unknown>
    const title = String(body.title ?? "").trim()
    const description = body.description ? String(body.description).trim() : ""
    const category = String(body.category ?? "")
    const priceCoins = body.price_coins != null ? Number(body.price_coins) : null
    const priceDh = body.price_dh != null ? Number(body.price_dh) : null

    if (title.length < 3) return NextResponse.json({ success: false, error: "title_too_short" }, { status: 400 })
    if (!VALID_CATEGORIES.has(category)) return NextResponse.json({ success: false, error: "invalid_category" }, { status: 400 })
    if (priceCoins == null && priceDh == null)
      return NextResponse.json({ success: false, error: "price_required" }, { status: 400 })

    const combined = `${title} ${description}`.toLowerCase()
    if (RX_BLOCKED.test(combined))
      return NextResponse.json({ success: false, error: "blocked_category" }, { status: 400 })
    if (RX_PHONE.test(combined) || RX_EMAIL.test(combined) || RX_HANDLE.test(combined) || RX_SOCIAL.test(combined))
      return NextResponse.json({ success: false, error: "contact_info_blocked" }, { status: 400 })

    const params = {
      title,
      description,
      category,
      price_coins: priceCoins != null ? String(priceCoins) : null,
      price_dh: priceDh != null ? String(priceDh) : null,
      images: Array.isArray(body.images) ? body.images : [],
      condition: body.condition ?? null,
      size: body.size ?? null,
      brand: body.brand ?? null,
      color: body.color ?? null,
      city: body.city ?? null,
      neighborhood: body.neighborhood ?? null,
    }

    const sb = createServiceRoleClient()
    const { data, error } = await sb.rpc("create_listing", {
      p_seller_id: sellerId,
      p_params: params,
    })
    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    return NextResponse.json(data)
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "internal_error"
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
