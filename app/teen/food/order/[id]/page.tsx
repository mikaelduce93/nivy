/**
 * /teen/food/order/:id — order tracking with status timeline.
 *
 * Refonte V2 (#158) — timeline via <SegmentedProgress> à 6 segments FR,
 * totaux en ⊙ mono coral, articles en sticker. Confetti delivered préservé.
 */

import { notFound, redirect } from "next/navigation"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { getUserRole } from "@/lib/auth/get-user-role"
import { H1, H2 } from "@/components/ui/headings"
import { SegmentedProgress } from "@/components/ui/progress"
import { StickerCard } from "@/components/ui/sticker-card"
import { getT } from "@/lib/i18n/server"
import { foodOrderStatusLabel } from "@/lib/i18n/status-labels"
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

const DELIVERY_TYPE_LABELS: Record<string, string> = {
  pickup: "À emporter",
  delivery: "Livraison",
}

export default async function FoodOrderTrackingPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const t = await getT()

  // #201 Stop the lies — contrôle d'ownership : un teen ne peut voir QUE ses
  // propres commandes (la page lisait en service-role sans filtre teen_id).
  const userInfo = await getUserRole()
  if (!userInfo || userInfo.role !== "teen") redirect("/auth/redirect")
  const teenId = userInfo.teenData?.id || userInfo.profileId
  if (!teenId) return notFound()

  const sb = createServiceRoleClient()

  const { data: order } = await sb
    .from("food_orders")
    .select("*, partners!inner(company_name)")
    .eq("id", id)
    .eq("teen_id", teenId)
    .maybeSingle()

  if (!order) return notFound()

  const { data: items } = await sb
    .from("food_order_items")
    .select("qty, unit_price_dh, unit_price_coins, menu_items!inner(name)")
    .eq("order_id", id)

  const currentIdx = STATUSES.indexOf(order.status as (typeof STATUSES)[number])
  const isTerminated =
    order.status === "rejected" || order.status === "cancelled"
  const deliveryLabel =
    DELIVERY_TYPE_LABELS[String(order.delivery_type)] ??
    String(order.delivery_type)

  return (
    <main className="mx-auto min-h-screen max-w-2xl space-y-6 px-4 py-8">
      {/* Wave 3 / TICKET-022 — celebrate on the first render where the
          server reports status === "delivered". The client gate dedupes
          per-orderId via sessionStorage so a refresh doesn't re-fire. */}
      <OrderDeliveredCelebrate orderId={String(id)} status={String(order.status)} />
      <header>
        <p className="eyebrow tracking-[0.16em] mb-1">Suivi de commande</p>
        <H1 className="font-display text-4xl font-extrabold tracking-tight">
          Ta <em className="font-semibold italic text-pink">commande</em>
        </H1>
        <p className="mt-2 font-mono text-[12px] uppercase tracking-[0.12em] text-mute">
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          {(order.partners as any)?.company_name} · {deliveryLabel} · #{String(id).slice(0, 8)}
        </p>
      </header>

      <StickerCard className="gap-4 p-5">
        {isTerminated ? (
          <p className="font-mono text-[12px] font-bold uppercase tracking-[0.12em] text-destructive">
            {order.status === "cancelled" ? "Commande annulée" : "Commande refusée"}
          </p>
        ) : (
          <>
            <SegmentedProgress
              steps={STATUSES.length}
              current={Math.max(0, currentIdx)}
              size="md"
            />
            <ol className="flex flex-wrap gap-x-3 gap-y-1 font-mono text-[11px] uppercase tracking-[0.1em]">
              {STATUSES.map((s, idx) => (
                <li
                  key={s}
                  className={
                    idx <= currentIdx ? "font-bold text-ink" : "text-mute"
                  }
                >
                  {foodOrderStatusLabel(s, t)}
                </li>
              ))}
            </ol>
          </>
        )}
      </StickerCard>

      <section className="space-y-3">
        <H2 className="font-display text-lg font-bold text-ink">Articles</H2>
        <ul className="space-y-2">
          {(items ?? []).map((it, i) => (
            <li
              key={i}
              className="flex items-center justify-between gap-3 rounded-2xl border-2 border-ink bg-white p-3 text-sm shadow-stkr-sm"
            >
              <span className="text-ink">
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {it.qty}× {(it.menu_items as any)?.name}
              </span>
              <span className="font-mono font-bold tabular-nums text-coral">
                ⊙ {it.unit_price_coins ?? Math.round(Number(it.unit_price_dh) * 100)}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <StickerCard className="gap-1.5 p-5 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-ink">Total</span>
          <span className="font-mono text-base font-bold tabular-nums text-coral">
            ⊙ {order.total_coins}{" "}
            <span className="text-mute">({order.total_dh} DH)</span>
          </span>
        </div>
        {order.cashback_xp ? (
          <div className="font-mono text-xs font-bold text-gold">
            +{order.cashback_xp} XP cashback
          </div>
        ) : null}
        {order.parent_approval_id && (
          <div className="font-mono text-xs uppercase tracking-[0.1em] text-gold">
            En attente d&apos;approbation parent
          </div>
        )}
        {order.notes && (
          <div className="mt-1 text-mute">Notes : {order.notes}</div>
        )}
      </StickerCard>
    </main>
  )
}
