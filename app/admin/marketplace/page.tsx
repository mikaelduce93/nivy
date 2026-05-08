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

  // Polish-F: wrap both queries — the previous bare awaits would 500 the
  // route on any RLS / network failure. Now the page degrades to "File vide"
  // and surfaces a banner instead.
  const sb = createServiceRoleClient()
  let pending: Array<{
    id: string
    title: string
    category: string
    price_coins: number | null
    seller_user_id: string
    created_at: string
  }> = []
  let disputes: Array<{
    id: string
    transaction_id: string | null
    reason: string | null
    status: string | null
    created_at: string | null
  }> = []
  let loadError: string | null = null
  try {
    const [p, d] = await Promise.all([
      sb
        .from("marketplace_listings")
        .select("id, title, category, price_coins, seller_user_id, created_at")
        .eq("status", "pending_moderation")
        .order("created_at", { ascending: true })
        .limit(50),
      sb
        .from("marketplace_disputes")
        .select("id, transaction_id, reason, status, created_at")
        .in("status", ["open","investigating"])
        .order("created_at", { ascending: true }),
    ])
    if (p.error) {
      console.error("[admin/marketplace] listings error:", p.error)
      loadError = "Impossible de charger les annonces."
    } else {
      pending = (p.data ?? []) as typeof pending
    }
    if (d.error) {
      console.error("[admin/marketplace] disputes error:", d.error)
      loadError = loadError ?? "Impossible de charger les litiges."
    } else {
      disputes = (d.data ?? []) as typeof disputes
    }
  } catch (err) {
    console.error("[admin/marketplace] queries threw:", err)
    loadError = "Une erreur est survenue lors du chargement."
  }

  return (
    <main className="min-h-screen mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-2xl font-bold mb-4">Marketplace · Modération & litiges</h1>

      {loadError && (
        <div
          role="alert"
          className="mb-4 rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          {loadError}
        </div>
      )}

      <section className="mb-8">
        <h2 className="font-semibold mb-2">Annonces en attente ({pending.length})</h2>
        {pending.length === 0 && <p className="text-sm text-gray-500">File vide.</p>}
        <ul className="space-y-2">
          {pending.map((l) => (
            <ModerateRow key={l.id} listing={l} />
          ))}
        </ul>
      </section>

      <section>
        <h2 className="font-semibold mb-2">Litiges ouverts ({disputes.length})</h2>
        <ul className="space-y-2">
          {disputes.length === 0 && (
            <li className="text-sm text-gray-500">Aucun litige ouvert.</li>
          )}
          {disputes.map((d) => (
            <li key={d.id} className="border rounded p-3">
              <div className="font-mono text-xs">tx {d.transaction_id}</div>
              <div className="text-sm">{d.reason}</div>
              <div className="text-xs text-gray-500">{d.status} · {d.created_at ? new Date(d.created_at).toLocaleString() : ""}</div>
            </li>
          ))}
        </ul>
      </section>
    </main>
  )
}
