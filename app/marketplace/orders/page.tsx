/**
 * /marketplace/orders — buy + sell history.
 */

import { redirect } from "next/navigation"
import { getUserRole } from "@/lib/auth/get-user-role"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

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
    <main className="min-h-screen mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-bold mb-4">Mes commandes</h1>
      <section className="mb-8">
        <h2 className="font-semibold mb-2">Achats</h2>
        {(!bought || bought.length === 0) && <p className="text-sm text-gray-500">Aucun achat.</p>}
        <ul className="space-y-2">
          {(bought ?? []).map((t) => (
            <li key={t.id} className="border rounded p-3 flex justify-between">
              <span>{t.amount_coins} coins · {t.meet_method}</span>
              <span className="text-xs text-gray-600">{t.status}</span>
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h2 className="font-semibold mb-2">Ventes</h2>
        {(!sold || sold.length === 0) && <p className="text-sm text-gray-500">Aucune vente.</p>}
        <ul className="space-y-2">
          {(sold ?? []).map((t) => (
            <li key={t.id} className="border rounded p-3 flex justify-between">
              <span>{t.amount_coins} coins · {t.meet_method}</span>
              <span className="text-xs text-gray-600">{t.status}</span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  )
}
