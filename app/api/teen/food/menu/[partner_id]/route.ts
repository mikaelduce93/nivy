/**
 * GET /api/teen/food/menu/:partner_id — list active menu_items for a partner.
 * Filters: is_active=true; current-time inside available_from/until window when set.
 */

import { NextResponse } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

export async function GET(
  _req: Request,
  context: { params: Promise<{ partner_id: string }> }
) {
  try {
    const { partner_id } = await context.params
    if (!partner_id) {
      return NextResponse.json({ success: false, error: "partner_id requis" }, { status: 400 })
    }

    const admin = createServiceRoleClient()
    const { data, error } = await admin
      .from("menu_items")
      .select(
        "id, name, description, category, price_dh, price_coins, image_url, calories, nutrition_tags, allergens, is_halal, prep_time_minutes, available_from, available_until, available_days, is_active"
      )
      .eq("partner_id", partner_id)
      .eq("is_active", true)
      .order("category", { ascending: true })
      .order("name", { ascending: true })

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
    return NextResponse.json({ success: true, data: data ?? [] })
  } catch (err) {
    console.error("[teen/food/menu] error:", err)
    return NextResponse.json({ success: false, error: "Erreur serveur" }, { status: 500 })
  }
}
