/**
 * GET /api/teen/food/restaurants — discover food partners.
 * Query: ?city=&sub_category=&halal=true&tag=healthy
 */

import { NextResponse } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const subCategory = url.searchParams.get("sub_category")
    const halalOnly = url.searchParams.get("halal") === "true"
    const tag = url.searchParams.get("tag")

    const admin = createServiceRoleClient()
    let q = admin
      .from("partners")
      .select("id, company_name, partner_type, sub_category, status")
      .eq("status", "active")
      .in("sub_category", subCategory
        ? [subCategory]
        : ["restaurant", "cafe", "bakery", "fast_food", "catering", "grocery"])

    const { data: partners, error } = await q
    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    // Optionally filter by tag/halal via menu_items aggregate (cheap approximation)
    let result = partners ?? []
    if (halalOnly || tag) {
      const ids = result.map((p) => p.id)
      if (ids.length > 0) {
        let mq = admin
          .from("menu_items")
          .select("partner_id")
          .in("partner_id", ids)
          .eq("is_active", true)
        if (halalOnly) mq = mq.eq("is_halal", true)
        if (tag) mq = mq.contains("nutrition_tags", [tag])
        const { data: hits } = await mq
        const ok = new Set((hits ?? []).map((r) => r.partner_id))
        result = result.filter((p) => ok.has(p.id))
      }
    }

    return NextResponse.json({ success: true, data: result })
  } catch (err) {
    console.error("[teen/food/restaurants] error:", err)
    return NextResponse.json({ success: false, error: "Erreur serveur" }, { status: 500 })
  }
}
