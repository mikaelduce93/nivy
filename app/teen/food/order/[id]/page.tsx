/**
 * /teen/food/order/:id — order tracking with status timeline.
 */

import { notFound } from "next/navigation"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

export const dynamic = "force-dynamic"

const STATUSES = [
  "pending",
  "accepted",
  "preparing",
  "ready",
  "out_for_delivery",
  "delivered",
] as const

export default async function FoodOrderTrackingPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const sb = createServiceRoleClient()

  const { data: order } = await sb
    .from("food_orders")
    .select("*, partners!inner(company_name)")
    .eq("id", id)
    .maybeSingle()

  if (!order) return notFound()

  const { data: items } = await sb
    .from("food_order_items")
    .select("qty, unit_price_dh, unit_price_coins, menu_items!inner(name)")
    .eq("order_id", id)

  const currentIdx = STATUSES.indexOf(order.status as (typeof STATUSES)[number])

  return (
    <main className="min-h-screen mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-bold mb-2">Suivi commande</h1>
      <p className="text-sm text-gray-600 mb-6">
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        {(order.partners as any)?.company_name} · {order.delivery_type} · #{String(id).slice(0, 8)}
      </p>

      <ol className="mb-6 flex flex-wrap gap-2 text-xs">
        {STATUSES.map((s, idx) => (
          <li
            key={s}
            className={`rounded px-2 py-1 ${
              idx <= currentIdx
                ? "bg-blue-600 text-white"
                : order.status === "rejected" || order.status === "cancelled"
                ? "bg-gray-200 text-gray-500"
                : "bg-gray-100 text-gray-500"
            }`}
          >
            {s}
          </li>
        ))}
      </ol>

      <h2 className="text-lg font-semibold mb-2">Articles</h2>
      <ul className="mb-6 space-y-1 text-sm">
        {(items ?? []).map((it, i) => (
          <li key={i}>
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {it.qty}× {(it.menu_items as any)?.name} —{" "}
            {it.unit_price_coins ?? Math.round(Number(it.unit_price_dh) * 100)} coins
          </li>
        ))}
      </ul>

      <div className="rounded-lg bg-gray-50 p-3 text-sm">
        <div>
          Total: <strong>{order.total_coins} coins</strong> ({order.total_dh} DH)
        </div>
        {order.cashback_xp ? (
          <div className="text-green-700">+{order.cashback_xp} XP cashback</div>
        ) : null}
        {order.parent_approval_id && (
          <div className="text-amber-700">En attente d'approbation parent</div>
        )}
        {order.notes && <div className="text-gray-500 mt-1">Notes: {order.notes}</div>}
      </div>
    </main>
  )
}
