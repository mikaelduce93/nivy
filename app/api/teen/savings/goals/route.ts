/**
 * Teen savings goals — list + create.
 *
 * POST creates a `savings_goals` row owned by the teen (RLS enforces it).
 * GET  returns the teen's goals along with locked_in_goals / spendable from
 *      the `user_coins_spendable` view so the UI can render progress + the
 *      "spendable" tile in the same payload.
 */

import { NextResponse } from "next/server"
import { getUserRole } from "@/lib/auth/get-user-role"
import { createClient } from "@/lib/supabase/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

interface CreateBody {
  title?: string
  description?: string
  image_url?: string
  target_coins?: number
  target_date?: string
}

export async function GET() {
  const userInfo = await getUserRole()
  if (!userInfo || userInfo.role !== "teen") {
    return NextResponse.json({ success: false, error: "Non autorisé" }, { status: 401 })
  }

  const supabase = await createClient()
  const teenId = userInfo.profileId

  const [{ data: goals, error: goalsErr }, { data: spendable }] = await Promise.all([
    supabase
      .from("savings_goals")
      .select("*")
      .eq("teen_id", teenId)
      .order("created_at", { ascending: false }),
    supabase
      .from("user_coins_spendable")
      .select("total, locked_in_goals, spendable")
      .eq("teen_id", teenId)
      .maybeSingle(),
  ])

  if (goalsErr) {
    return NextResponse.json(
      { success: false, error: goalsErr.message },
      { status: 500 }
    )
  }

  return NextResponse.json({
    success: true,
    data: {
      goals: goals ?? [],
      spendable: spendable ?? { total: 0, locked_in_goals: 0, spendable: 0 },
    },
  })
}

export async function POST(request: Request) {
  const userInfo = await getUserRole()
  if (!userInfo || userInfo.role !== "teen") {
    return NextResponse.json({ success: false, error: "Non autorisé" }, { status: 401 })
  }

  const body = (await request.json()) as CreateBody
  const title = (body.title ?? "").trim()
  const targetCoins = Number(body.target_coins)

  if (!title || !Number.isFinite(targetCoins) || targetCoins <= 0) {
    return NextResponse.json(
      { success: false, error: "Données manquantes (title, target_coins)" },
      { status: 400 }
    )
  }

  const admin = createServiceRoleClient()
  const { data, error } = await admin
    .from("savings_goals")
    .insert({
      teen_id: userInfo.profileId,
      title,
      description: body.description ?? null,
      image_url: body.image_url ?? null,
      target_coins: targetCoins,
      target_date: body.target_date ?? null,
    })
    .select("*")
    .single()

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
  return NextResponse.json({ success: true, data })
}
