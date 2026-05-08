/**
 * /parent/food — view active food orders + nutrition_challenges for the parent's teens.
 */

import { redirect } from "next/navigation"
import { getUserRole } from "@/lib/auth/get-user-role"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

export const dynamic = "force-dynamic"

export default async function ParentFoodPage() {
  const userInfo = await getUserRole()
  if (!userInfo || userInfo.role !== "parent") {
    redirect("/auth/connexion")
  }
  const parentId = userInfo!.profileId
  const sb = createServiceRoleClient()

  const { data: orders } = await sb
    .from("food_orders")
    .select("id, status, total_coins, total_dh, partner_id, teen_id, created_at, parent_approval_id, partners!inner(company_name)")
    .eq("parent_id", parentId)
    .order("created_at", { ascending: false })
    .limit(50)

  const { data: challenges } = await sb
    .from("nutrition_challenges")
    .select("*")
    .eq("parent_id", parentId)
    .order("created_at", { ascending: false })

  return (
    <main className="min-h-screen mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Food (parent)</h1>

      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-2">Commandes récentes</h2>
        {(orders ?? []).length === 0 ? (
          <p className="text-sm text-gray-500">Aucune commande.</p>
        ) : (
          <ul className="space-y-2">
            {(orders ?? []).map((o) => (
              <li key={o.id} className="rounded border p-3 text-sm">
                <div className="flex justify-between">
                  <span className="font-medium">
                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                    {(o.partners as any)?.company_name}
                  </span>
                  <span className="text-xs uppercase tracking-wide">{o.status}</span>
                </div>
                <div className="text-xs text-gray-500">
                  {o.total_coins} coins · {o.total_dh} DH
                  {o.parent_approval_id ? " · approbation requise" : ""}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-2">Défis nutrition actifs</h2>
        {(challenges ?? []).length === 0 ? (
          <p className="text-sm text-gray-500">Aucun défi configuré.</p>
        ) : (
          <ul className="space-y-2">
            {(challenges ?? []).map((c) => (
              <li key={c.id} className="rounded border p-3 text-sm">
                <div className="font-medium">{c.title}</div>
                <div className="text-xs text-gray-500">
                  {c.is_active ? "actif" : "inactif"} · {c.valid_from} → {c.valid_until ?? "∞"}
                </div>
                <pre className="text-xs text-gray-600 mt-1">
                  {JSON.stringify(c.nutrition_targets, null, 2)}
                </pre>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  )
}
