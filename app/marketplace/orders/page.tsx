/**
 * /marketplace/orders — buy + sell history.
 */

import { redirect } from "next/navigation"
import { getUserRole } from "@/lib/auth/get-user-role"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { OrdersClient } from "./orders-client"

export const dynamic = "force-dynamic"

export default async function OrdersPage() {
  const userInfo = await getUserRole()
  if (!userInfo) redirect("/auth/login")
  const userId = userInfo.role === "teen" ? (userInfo.teenData?.id || userInfo.profileId) : userInfo.profileId

  const sb = createServiceRoleClient()
  const [{ data: bought }, { data: sold }] = await Promise.all([
    sb.from("marketplace_transactions").select("*").eq("buyer_user_id", userId).order("created_at", { ascending: false }),
    sb.from("marketplace_transactions").select("*").eq("seller_user_id", userId).order("created_at", { ascending: false }),
  ])

  return (
    <div className="min-h-screen bg-paper">
      <Navbar />
      <main className="mx-auto max-w-3xl px-4 pb-20 pt-24">
        <header className="mb-6">
          <p className="eyebrow tracking-[0.18em] text-mute">Marketplace Nivy</p>
          <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
            Mes <em className="font-semibold italic text-pink">commandes</em>
          </h1>
        </header>

        <OrdersClient bought={bought ?? []} sold={sold ?? []} />
      </main>
      <Footer />
    </div>
  )
}
