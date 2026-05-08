/**
 * /partner/restaurant/orders — incoming orders feed (kitchen ticker).
 */

import { redirect } from "next/navigation"
import { getUserRole } from "@/lib/auth/get-user-role"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import OrdersFeedClient from "./orders-feed-client"

export const dynamic = "force-dynamic"

export default async function PartnerRestaurantOrdersPage() {
  const userInfo = await getUserRole()
  if (!userInfo || userInfo.role !== "partner") {
    redirect("/auth/connexion")
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
    <main className="min-h-screen mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-bold mb-2">Commandes — {partner?.company_name}</h1>
      <p className="text-sm text-gray-600 mb-6">Accepter ou rejeter les commandes entrantes.</p>
      <OrdersFeedClient
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        initialOrders={(orders ?? []) as any[]}
      />
    </main>
  )
}
