/**
 * /marketplace/my-listings — own listings (server-side).
 */

import { redirect } from "next/navigation"
import { getUserRole } from "@/lib/auth/get-user-role"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import Link from "next/link"

export const dynamic = "force-dynamic"

export default async function MyListingsPage() {
  const userInfo = await getUserRole()
  if (!userInfo) redirect("/auth/login")
  const sellerId = userInfo.role === "teen" ? (userInfo.teenData?.id || userInfo.profileId) : userInfo.profileId

  const sb = createServiceRoleClient()
  const { data: listings } = await sb
    .from("marketplace_listings")
    .select("id, title, status, price_coins, created_at")
    .eq("seller_user_id", sellerId)
    .order("created_at", { ascending: false })

  return (
    <main className="min-h-screen mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-bold mb-4">Mes annonces</h1>
      {(!listings || listings.length === 0) && <p className="text-gray-500">Aucune annonce pour l&apos;instant.</p>}
      <ul className="space-y-2">
        {(listings ?? []).map((l) => (
          <li key={l.id} className="border rounded p-3 flex items-center justify-between">
            <Link href={`/marketplace/listings/${l.id}`} className="flex-1">
              <div className="font-semibold">{l.title}</div>
              <div className="text-xs text-gray-500">
                {l.price_coins} coins · {new Date(l.created_at).toLocaleDateString()}
              </div>
            </Link>
            <span className={`text-xs rounded px-2 py-1 ${
              l.status === "active" ? "bg-green-100 text-green-700"
                : l.status === "sold" ? "bg-gray-200 text-gray-700"
                : "bg-yellow-100 text-yellow-700"
            }`}>
              {l.status}
            </span>
          </li>
        ))}
      </ul>
    </main>
  )
}
