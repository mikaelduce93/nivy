/**
 * /partner/food/orders — incoming orders feed (kitchen ticker).
 *
 * Refonte V2 (#171) — namespace `food/*` héberge désormais la page réelle ;
 * `/partner/restaurant/orders` est conservé en redirect `@deprecated`. Le
 * polling et les endpoints `/api/partner/restaurant/orders/...` restent
 * inchangés.
 */

import { redirect } from "next/navigation"
import { getUserRole } from "@/lib/auth/get-user-role"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import OrdersFeedClient from "@/app/partner/restaurant/orders/orders-feed-client"

export const dynamic = "force-dynamic"

export default async function PartnerFoodOrdersPage() {
  const userInfo = await getUserRole()
  if (!userInfo || userInfo.role !== "partner") {
    redirect("/auth/login")
  }
  const sb = createServiceRoleClient()
  const { data: partner } = await sb
    .from("partners")
    .select("id, company_name")
    .eq("email", userInfo!.email)
    .maybeSingle()

  const { data: orders } = partner
    ? await sb
        .from("food_orders")
        .select("*")
        .eq("partner_id", partner.id)
        .order("created_at", { ascending: false })
        .limit(50)
    : { data: [] }

  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <header className="space-y-2">
        <p className="eyebrow">Restaurant · Commandes</p>
        <h1 className="font-display text-4xl font-extrabold tracking-tight text-ink">
          Ticker <em className="font-semibold italic text-pink">cuisine</em>
        </h1>
        <p className="text-mute max-w-md">
          Accepte ou refuse les commandes entrantes en temps réel.
          {partner?.company_name ? ` — ${partner.company_name}` : ""}
        </p>
      </header>
      <OrdersFeedClient
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        initialOrders={(orders ?? []) as any[]}
      />
    </main>
  )
}
