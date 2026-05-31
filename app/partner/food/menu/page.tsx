/**
 * /partner/food/menu — partner menu manager (list + add/edit/delete).
 *
 * Refonte V2 (#171) — namespace `food/*` héberge désormais la page réelle ;
 * `/partner/restaurant/menu` est conservé en redirect `@deprecated`. Le CRUD
 * et les endpoints `/api/partner/restaurant/menu/...` restent inchangés.
 */

import { redirect } from "next/navigation"
import { getUserRole } from "@/lib/auth/get-user-role"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import MenuManagerClient from "@/app/partner/restaurant/menu/menu-manager-client"

export const dynamic = "force-dynamic"

export default async function PartnerFoodMenuPage() {
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
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <header className="space-y-2">
        <p className="eyebrow">Restaurant · Menu</p>
        <h1 className="font-display text-4xl font-extrabold tracking-tight text-ink">
          Ton <em className="font-semibold italic text-pink">menu</em>
        </h1>
        <p className="text-mute max-w-md">
          Ajoute tes plats : nom, prix, halal, calories et tags nutrition.
          {partner?.company_name ? ` — ${partner.company_name}` : ""}
        </p>
      </header>
      <MenuManagerClient
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        initialItems={(items ?? []) as any[]}
      />
    </main>
  )
}
