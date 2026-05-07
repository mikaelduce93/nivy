/**
 * Partner restaurant menu CRUD — :id endpoints.
 *  - PATCH: update item fields
 *  - DELETE: soft-delete (is_active=false) by default; ?hard=true for hard delete
 */

import { NextResponse } from "next/server"
import { getUserRole } from "@/lib/auth/get-user-role"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

async function partnerOwns(email: string, itemId: string) {
  const admin = createServiceRoleClient()
  const { data } = await admin
    .from("menu_items")
    .select("partner_id, partners!inner(email)")
    .eq("id", itemId)
    .maybeSingle()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return Boolean(data && (data.partners as any)?.email === email)
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  const userInfo = await getUserRole()
  if (!userInfo || userInfo.role !== "partner") {
    return NextResponse.json({ success: false, error: "Non autorisé" }, { status: 401 })
  }
  const owns = await partnerOwns(userInfo.email!, id)
  if (!owns) {
    return NextResponse.json({ success: false, error: "Item not yours" }, { status: 403 })
  }
  const body = await request.json()
  const admin = createServiceRoleClient()
  const allowed = [
    "name",
    "description",
    "category",
    "price_dh",
    "price_coins",
    "image_url",
    "calories",
    "nutrition_tags",
    "allergens",
    "is_halal",
    "available_from",
    "available_until",
    "available_days",
    "prep_time_minutes",
    "is_active",
  ]
  const update: Record<string, unknown> = {}
  for (const k of allowed) if (k in body) update[k] = body[k]
  const { data, error } = await admin
    .from("menu_items")
    .update(update)
    .eq("id", id)
    .select("*")
    .single()
  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, data })
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  const userInfo = await getUserRole()
  if (!userInfo || userInfo.role !== "partner") {
    return NextResponse.json({ success: false, error: "Non autorisé" }, { status: 401 })
  }
  const owns = await partnerOwns(userInfo.email!, id)
  if (!owns) {
    return NextResponse.json({ success: false, error: "Item not yours" }, { status: 403 })
  }
  const url = new URL(request.url)
  const hard = url.searchParams.get("hard") === "true"
  const admin = createServiceRoleClient()
  if (hard) {
    const { error } = await admin.from("menu_items").delete().eq("id", id)
    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  } else {
    const { error } = await admin.from("menu_items").update({ is_active: false }).eq("id", id)
    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
  return NextResponse.json({ success: true })
}
