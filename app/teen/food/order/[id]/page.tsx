/**
 * /teen/food/order/:id — order tracking with status timeline.
 */

import { notFound } from "next/navigation"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { H1, H2 } from "@/components/ui/headings"
import { StatusBadge, type StatusVariant } from "@/components/ui/status-badge"
import { OrderDeliveredCelebrate } from "./order-delivered-celebrate"

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
  const isTerminated =
    order.status === "rejected" || order.status === "cancelled"

  return (
    <main className="min-h-screen mx-auto max-w-2xl px-4 py-8">
      {/* Wave 3 / TICKET-022 — celebrate on the first render where the
          server reports status === "delivered". The client gate dedupes
          per-orderId via sessionStorage so a refresh doesn't re-fire. */}
      <OrderDeliveredCelebrate orderId={String(id)} status={String(order.status)} />
      <H1 className="text-4xl font-black tracking-tighter uppercase leading-none mb-2">
        Suivi commande
      </H1>
      <p className="text-sm text-muted-foreground mb-6">
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        {(order.partners as any)?.company_name} · {order.delivery_type} · #{String(id).slice(0, 8)}
      </p>

      <ol className="mb-6 flex flex-wrap gap-2 text-xs">
        {STATUSES.map((s, idx) => {
          const variant: StatusVariant = isTerminated
            ? "neutral"
            : idx < currentIdx
            ? "success"
            : idx === currentIdx
            ? "pending"
            : "neutral"
          return (
            <li key={s}>
              <StatusBadge
                variant={variant}
                size="sm"
                label={s}
                icon={false}
                pulse={!isTerminated && idx === currentIdx}
              />
            </li>
          )
        })}
      </ol>

      <H2 className="text-lg font-semibold mb-2">Articles</H2>
      <ul className="mb-6 space-y-1 text-sm text-foreground">
        {(items ?? []).map((it, i) => (
          <li key={i}>
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {it.qty}× {(it.menu_items as any)?.name} —{" "}
            {it.unit_price_coins ?? Math.round(Number(it.unit_price_dh) * 100)} coins
          </li>
        ))}
      </ul>

      <div className="rounded-lg bg-muted p-3 text-sm text-foreground">
        <div>
          Total: <strong>{order.total_coins} coins</strong> ({order.total_dh} DH)
        </div>
        {order.cashback_xp ? (
          <div className="text-success">+{order.cashback_xp} XP cashback</div>
        ) : null}
        {order.parent_approval_id && (
          <div className="text-warning-foreground">En attente d&apos;approbation parent</div>
        )}
        {order.notes && (
          <div className="text-muted-foreground mt-1">Notes: {order.notes}</div>
        )}
      </div>
    </main>
  )
}
