/**
 * POST /api/parent/food/budget — create or update a nutrition_challenge for a teen.
 *
 * Body: {
 *   teenId: uuid,
 *   title: string,
 *   budgetCoins?: number,
 *   nutritionTargets?: { halal_only?: boolean, max_calories_per_meal?: number, ... },
 *   validFrom?: 'YYYY-MM-DD',
 *   validUntil?: 'YYYY-MM-DD',
 *   isActive?: boolean
 * }
 */

import { NextResponse } from "next/server"
import { getUserRole } from "@/lib/auth/get-user-role"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

export async function POST(request: Request) {
  const userInfo = await getUserRole()
  if (!userInfo || userInfo.role !== "parent") {
    return NextResponse.json({ success: false, error: "Non autorisé" }, { status: 401 })
  }
  const parentId = userInfo.profileId
  if (!parentId) {
    return NextResponse.json({ success: false, error: "Parent inconnu" }, { status: 400 })
  }
  const body = await request.json()
  if (!body.teenId || !body.title) {
    return NextResponse.json({ success: false, error: "teenId + title requis" }, { status: 400 })
  }

  const admin = createServiceRoleClient()
  // Confirm parent-teen link
  const { data: link } = await admin
    .from("parent_teen_links")
    .select("id")
    .eq("parent_id", parentId)
    .eq("teen_id", body.teenId)
    .maybeSingle()
  if (!link) {
    return NextResponse.json({ success: false, error: "teen not linked to parent" }, { status: 403 })
  }

  const insert = {
    parent_id: parentId,
    teen_id: body.teenId,
    title: String(body.title),
    budget_coins: body.budgetCoins != null ? Number(body.budgetCoins) : null,
    nutrition_targets: body.nutritionTargets ?? {},
    valid_from: body.validFrom ?? new Date().toISOString().slice(0, 10),
    valid_until: body.validUntil ?? null,
    is_active: body.isActive !== false,
  }
  const { data, error } = await admin
    .from("nutrition_challenges")
    .insert(insert)
    .select("*")
    .single()
  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, data })
}
