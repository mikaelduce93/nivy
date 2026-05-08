/**
 * POST /api/teen/food/order — Wave 3.2 food order entry-point.
 *
 * Body: {
 *   partnerId: uuid,
 *   deliveryType: 'delivery'|'pickup'|'dine_in',
 *   items: [{ menuItemId: uuid, qty: number, customizations?: object }],
 *   address?: string,
 *   scheduledFor?: ISO8601,
 *   paymentMethod?: 'coins'|'dh'|'split'  (default 'coins')
 * }
 *
 * Calls RPC `place_food_order` (SECURITY DEFINER, paired ledger + cashback XP per §29).
 */

import { NextResponse } from "next/server"
import { getUserRole } from "@/lib/auth/get-user-role"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

interface OrderItemInput {
  menuItemId?: string
  menu_item_id?: string
  qty?: number
  customizations?: Record<string, unknown>
}

interface OrderBody {
  partnerId?: string
  deliveryType?: string
  items?: OrderItemInput[]
  address?: string
  scheduledFor?: string
  paymentMethod?: string
}

export async function POST(request: Request) {
  try {
    const userInfo = await getUserRole()
    if (!userInfo || userInfo.role !== "teen") {
      return NextResponse.json({ success: false, error: "Non autorisé" }, { status: 401 })
    }
    const teenId = userInfo.teenData?.id || userInfo.profileId
    if (!teenId) {
      return NextResponse.json({ success: false, error: "Profil teen introuvable" }, { status: 400 })
    }

    const body = (await request.json()) as OrderBody
    if (!body.partnerId || !body.deliveryType || !Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json(
        { success: false, error: "partnerId, deliveryType, items[] requis" },
        { status: 400 }
      )
    }

    const items = body.items
      .map((it) => ({
        menu_item_id: it.menuItemId || it.menu_item_id,
        qty: Number(it.qty ?? 1),
        customizations: it.customizations ?? {},
      }))
      .filter((it) => it.menu_item_id && it.qty > 0)

    if (items.length === 0) {
      return NextResponse.json({ success: false, error: "items[] vides" }, { status: 400 })
    }

    const admin = createServiceRoleClient()
    const { data, error } = await admin.rpc("place_food_order", {
      p_teen_id: teenId,
      p_partner_id: body.partnerId,
      p_delivery_type: body.deliveryType,
      p_items: items,
      p_address: body.address ?? null,
      p_scheduled_for: body.scheduledFor ?? null,
      p_payment_method: body.paymentMethod ?? "coins",
    })

    if (error) {
      console.error("[teen/food/order] RPC error:", error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    type RpcResult = { success?: boolean; error?: string }
    const result = data as RpcResult | null
    if (!result?.success) {
      return NextResponse.json(
        { success: false, error: result?.error || "place_food_order_failed", details: data },
        { status: 400 }
      )
    }
    return NextResponse.json({ success: true, ...data })
  } catch (err) {
    console.error("[teen/food/order] unexpected:", err)
    return NextResponse.json({ success: false, error: "Erreur serveur" }, { status: 500 })
  }
}
