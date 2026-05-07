/**
 * Partner restaurant menu CRUD.
 *  - GET: list partner's menu items
 *  - POST: create menu item
 */

import { NextResponse } from "next/server"
import { getUserRole } from "@/lib/auth/get-user-role"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

async function resolvePartnerId(email: string) {
  const admin = createServiceRoleClient()
  const { data } = await admin.from("partners").select("id").eq("email", email).maybeSingle()
  return data?.id as string | undefined
}

export async function GET() {
  const userInfo = await getUserRole()
  if (!userInfo || userInfo.role !== "partner") {
    return NextResponse.json({ success: false, error: "Non autorisé" }, { status: 401 })
  }
  const partnerId = await resolvePartnerId(userInfo.email!)
  if (!partnerId) {
    return NextResponse.json({ success: false, error: "Partenaire introuvable" }, { status: 404 })
  }
  const admin = createServiceRoleClient()
  const { data, error } = await admin
    .from("menu_items")
    .select("*")
    .eq("partner_id", partnerId)
    .order("created_at", { ascending: false })
  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, data: data ?? [] })
}

export async function POST(request: Request) {
  const userInfo = await getUserRole()
  if (!userInfo || userInfo.role !== "partner") {
    return NextResponse.json({ success: false, error: "Non autorisé" }, { status: 401 })
  }
  const partnerId = await resolvePartnerId(userInfo.email!)
  if (!partnerId) {
    return NextResponse.json({ success: false, error: "Partenaire introuvable" }, { status: 404 })
  }
  const body = await request.json()
  if (!body.name || body.price_dh == null) {
    return NextResponse.json({ success: false, error: "name + price_dh requis" }, { status: 400 })
  }
  const admin = createServiceRoleClient()
  const insert = {
    partner_id: partnerId,
    name: String(body.name),
    description: body.description ?? null,
    category: body.category ?? null,
    price_dh: Number(body.price_dh),
    price_coins: body.price_coins != null ? Number(body.price_coins) : Math.round(Number(body.price_dh) * 100),
    image_url: body.image_url ?? null,
    calories: body.calories != null ? Number(body.calories) : null,
    nutrition_tags: Array.isArray(body.nutrition_tags) ? body.nutrition_tags : [],
    allergens: Array.isArray(body.allergens) ? body.allergens : [],
    is_halal: body.is_halal !== false,
    available_from: body.available_from ?? null,
    available_until: body.available_until ?? null,
    available_days: Array.isArray(body.available_days) ? body.available_days : [1, 2, 3, 4, 5, 6, 7],
    prep_time_minutes: body.prep_time_minutes != null ? Number(body.prep_time_minutes) : null,
    is_active: body.is_active !== false,
  }
  const { data, error } = await admin.from("menu_items").insert(insert).select("*").single()
  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, data })
}
