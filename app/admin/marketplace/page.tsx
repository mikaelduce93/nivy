/**
 * /admin/marketplace — moderation queue + disputes (admin only).
 */

import { redirect } from "next/navigation"
import { getUserRole } from "@/lib/auth/get-user-role"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { ModerateRow } from "./moderate-row"

export const dynamic = "force-dynamic"

export default async function AdminMarketplacePage() {
  const userInfo = await getUserRole()
  if (!userInfo) redirect("/auth/login")
  if (!["admin","super_admin","moderator"].includes(userInfo.role)) {
    return (
      <main className="min-h-screen p-8">
        <p>Accès refusé (admin only).</p>
      </main>
    )
  }

  const sb = createServiceRoleClient()
  const { data: pending } = await sb
    .from("marketplace_listings")
    .select("id, title, category, price_coins, seller_user_id, created_at")
    .eq("status", "pending_moderation")
    .order("created_at", { ascending: true })
    .limit(50)

  const { data: disputes } = await sb
    .from("marketplace_disputes")
    .select("id, transaction_id, reason, status, created_at")
    .in("status", ["open","investigating"])
    .order("created_at", { ascending: true })

  return (
    <main className="min-h-screen mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-2xl font-bold mb-4">Marketplace · Modération & litiges</h1>

      <section className="mb-8">
        <h2 className="font-semibold mb-2">Annonces en attente ({pending?.length ?? 0})</h2>
        {(!pending || pending.length === 0) && <p className="text-sm text-gray-500">File vide.</p>}
        <ul className="space-y-2">
          {(pending ?? []).map((l) => (
            <ModerateRow key={l.id} listing={l} />
          ))}
        </ul>
      </section>

      <section>
        <h2 className="font-semibold mb-2">Litiges ouverts ({disputes?.length ?? 0})</h2>
        <ul className="space-y-2">
          {(disputes ?? []).map((d) => (
            <li key={d.id} className="border rounded p-3">
              <div className="font-mono text-xs">tx {d.transaction_id}</div>
              <div className="text-sm">{d.reason}</div>
              <div className="text-xs text-gray-500">{d.status} · {new Date(d.created_at).toLocaleString()}</div>
            </li>
          ))}
        </ul>
      </section>
    </main>
  )
}
