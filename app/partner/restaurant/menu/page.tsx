/**
 * /partner/restaurant/menu — partner menu manager (list + add/edit/delete).
 *
 * Wave 2 / TICKET-002 — design-system token sweep:
 *  - Heading routed through <H1> primitive (semantic + scale tokens).
 *  - Raw text-gray-* removed → text-muted-foreground.
 *  - Surface containers use semantic border/bg tokens.
 */

import { redirect } from "next/navigation"
import { getUserRole } from "@/lib/auth/get-user-role"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { H1 } from "@/components/ui/headings"
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
      <H1 className="mb-2">Menu — {partner?.company_name}</H1>
      <p className="text-sm text-muted-foreground mb-6">
        Gérez vos plats : nom, prix, halal, calories, tags nutrition.
      </p>
      <MenuManagerClient
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        initialItems={(items ?? []) as any[]}
      />
    </main>
  )
}
