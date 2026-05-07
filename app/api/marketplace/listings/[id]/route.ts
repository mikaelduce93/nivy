/**
 * GET /api/marketplace/listings/:id — listing detail (increments views_count)
 */

import { NextResponse } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

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
