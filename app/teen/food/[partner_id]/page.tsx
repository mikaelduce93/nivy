/**
 * /teen/food/:partner_id — menu page with cart for a partner restaurant.
 */

import { notFound } from "next/navigation"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import MenuCartClient from "./menu-cart-client"

export const dynamic = "force-dynamic"

export default async function TeenRestaurantMenuPage({
  params,
}: {
  params: Promise<{ partner_id: string }>
}) {
  const { partner_id } = await params
  const sb = createServiceRoleClient()

  const { data: partner } = await sb
    .from("partners")
    .select("id, company_name, sub_category")
    .eq("id", partner_id)
    .maybeSingle()

  if (!partner) return notFound()

  const { data: items } = await sb
    .from("menu_items")
    .select(
      "id, name, description, category, price_dh, price_coins, image_url, calories, nutrition_tags, allergens, is_halal, prep_time_minutes"
    )
    .eq("partner_id", partner_id)
    .eq("is_active", true)
    .order("category", { ascending: true })
    .order("name", { ascending: true })

  return (
    <main className="min-h-screen mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-bold">{partner.company_name}</h1>
      <p className="text-sm text-gray-500 mb-6 uppercase tracking-wide">
        {partner.sub_category ?? "restaurant"}
      </p>
      <MenuCartClient
        partnerId={partner_id}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        items={(items ?? []) as any[]}
      />
    </main>
  )
}
