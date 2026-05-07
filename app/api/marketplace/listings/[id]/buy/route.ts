/**
 * POST /api/marketplace/listings/:id/buy
 * Body: { meet_method: 'school'|'venue_partner'|'public_pickup'|'shipping',
 *         meet_location_partner_id?: uuid }
 *
 * Calls buy_listing RPC. Teen buyers above ceiling get a parental_approvals row.
 */

import { NextResponse } from "next/server"
import { getUserRole } from "@/lib/auth/get-user-role"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const VALID_METHODS = new Set(["school", "venue_partner", "public_pickup", "shipping"])

export async function POST(
  request: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params
  const userInfo = await getUserRole()
  if (!userInfo) return NextResponse.json({ success: false, error: "unauthorized" }, { status: 401 })

  const buyerId = userInfo.role === "teen" ? (userInfo.teenData?.id || userInfo.profileId) : userInfo.profileId
  if (!buyerId) return NextResponse.json({ success: false, error: "no_profile" }, { status: 400 })

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
  const meetMethod = String(body.meet_method ?? "")
  const partnerId = body.meet_location_partner_id ? String(body.meet_location_partner_id) : null

  if (!VALID_METHODS.has(meetMethod))
    return NextResponse.json({ success: false, error: "invalid_meet_method" }, { status: 400 })

  const sb = createServiceRoleClient()
  const { data, error } = await sb.rpc("buy_listing", {
    p_listing_id: id,
    p_buyer_id: buyerId,
    p_meet_method: meetMethod,
    p_meet_location_partner_id: partnerId,
  })
  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
