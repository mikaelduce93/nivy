/**
 * /partner/restaurant/menu — partner menu manager (list + add/edit/delete).
 */

import { redirect } from "next/navigation"
import { getUserRole } from "@/lib/auth/get-user-role"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import MenuManagerClient from "./menu-manager-client"

export const dynamic = "force-dynamic"

export default async function PartnerRestaurantMenuPage() {
  const userInfo = await getUserRole()
  if (!userInfo || userInfo.role !== "partner") {
    redirect("/auth/connexion")
  }
  const sb = createServiceRoleClient()
  const { data: partner } = await sb
    .from("partners")
    .select("id, company_name, sub_category")
    .eq("email", userInfo!.email)
    .maybeSingle()

  const { data: items } = partner
    ? await sb
        .from("menu_items")
        .select("*")
        .eq("partner_id", partner.id)
        .order("created_at", { ascending: false })
    : { data: [] }

  return (
    <main className="min-h-screen mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-bold mb-2">Menu — {partner?.company_name}</h1>
      <p className="text-sm text-gray-600 mb-6">
        Gérez vos plats : nom, prix, halal, calories, tags nutrition.
      </p>
      <MenuManagerClient
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        initialItems={(items ?? []) as any[]}
      />
    </main>
  )
}
