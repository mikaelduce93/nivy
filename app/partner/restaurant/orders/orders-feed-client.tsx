"use client"

/**
 * Partner restaurant orders feed (client).
 *
 * Refonte V2 (#171) — reskin charte « ticker cuisine » :
 *  - Surfaces translucides `bg-card/30` supprimées → sticker cards.
 *  - Commandes `pending` mises en avant en grandes cartes (montant DH mono
 *    prominent, pulse rose) ; commandes traitées en cartes compactes dessous.
 *  - Statuts francisés via `STATUS_FR` passés au `label` du `<StatusBadge>`.
 *  - Boutons Accepter (`pink`) / Refuser (`outline`). Empty → `<NivEmpty>`.
 * Iso-fonctionnel : poll 5 s, `act`, endpoints `/api/partner/restaurant/...`,
 * `statusVariant`, et tout l'état conservés.
 */

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { StatusBadge, type StatusVariant } from "@/components/ui/status-badge"
import { StickerCard } from "@/components/ui/sticker-card"
import { NivEmpty } from "@/components/brand"

import { toast } from "sonner"

interface Order {
  id: string
  status: string
  delivery_type: string
  total_coins: number
  total_dh: number
  parent_approval_id: string | null
  created_at: string
  notes: string | null
}

function statusVariant(status: string): StatusVariant {
  switch (status) {
    case "accepted":
    case "ready":
    case "delivered":
      return "success"
    case "rejected":
    case "cancelled":
      return "danger"
    case "pending":
      return "pending"
    case "preparing":
    case "out_for_delivery":
      return "info"
    default:
      return "neutral"
  }
}

// Francisation des statuts bruts (DB) → libellés charte.
const STATUS_FR: Record<string, string> = {
  pending: "En attente",
  accepted: "Acceptée",
  preparing: "En prép",
  ready: "Prête",
  out_for_delivery: "En route",
  delivered: "Livrée",
  rejected: "Refusée",
  cancelled: "Annulée",
}

function statusLabel(status: string): string {
  return STATUS_FR[status] ?? status
}

export default function OrdersFeedClient({ initialOrders }: { initialOrders: Order[] }) {
  const [orders, setOrders] = useState<Order[]>(initialOrders)

  // Real-time poll OK per spec.
  useEffect(() => {
    const i = setInterval(async () => {
      const res = await fetch("/api/partner/restaurant/orders/feed").catch(() => null)
      if (!res?.ok) return
      const json = await res.json().catch(() => null)
      if (json?.success && Array.isArray(json.data)) setOrders(json.data)
    }, 5000)
    return () => clearInterval(i)
  }, [])

  const act = async (id: string, kind: "accept" | "reject") => {
    const res = await fetch(`/api/partner/restaurant/orders/${id}/${kind}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    })
    const json = await res.json()
    if (json?.success) {
      setOrders((s) =>
        s.map((o) =>
          o.id === id ? { ...o, status: kind === "accept" ? "accepted" : "rejected" } : o,
        ),
      )
    } else {
      toast.error(json?.error || "Échec")
    }
  }

  if (orders.length === 0) {
    return (
      <NivEmpty
        mood="calm"
        title="Aucune commande"
        description="Les nouvelles commandes débarquent ici en temps réel. Garde la cuisine prête."
      />
    )
  }

  const pending = orders.filter((o) => o.status === "pending")
  const handled = orders.filter((o) => o.status !== "pending")

  return (
    <div className="space-y-6">
      {/* Commandes en attente — mises en avant */}
      {pending.length > 0 && (
        <ul className="space-y-3">
          {pending.map((o) => (
            <li key={o.id}>
              <StickerCard variant="default" className="gap-3 p-5 shadow-stkr-pink">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-display font-bold text-ink">
                      #{o.id.slice(0, 8)} · {o.delivery_type}
                    </div>
                    <div className="mt-1 font-mono text-lg font-semibold tabular-nums text-ink">
                      {o.total_dh} DH
                      <span className="text-mute"> · </span>
                      <span className="text-coral">{o.total_coins} ⊙</span>
                    </div>
                    {o.parent_approval_id ? (
                      <p className="mt-1 font-mono text-xs uppercase tracking-wide text-mute">
                        Attente accord parent
                      </p>
                    ) : null}
                  </div>
                  <StatusBadge
                    variant={statusVariant(o.status)}
                    label={statusLabel(o.status)}
                    pulse
                  />
                </div>
                {o.notes && (
                  <p className="text-sm text-mute">Notes : {o.notes}</p>
                )}
                {!o.parent_approval_id && (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="pink"
                      size="sm"
                      onClick={() => act(o.id, "accept")}
                    >
                      Accepter
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => act(o.id, "reject")}
                    >
                      Refuser
                    </Button>
                  </div>
                )}
              </StickerCard>
            </li>
          ))}
        </ul>
      )}

      {/* Commandes traitées — compactes */}
      {handled.length > 0 && (
        <ul className="space-y-2">
          {handled.map((o) => (
            <li key={o.id}>
              <StickerCard variant="panel" className="p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-mono text-sm font-medium text-ink">
                      #{o.id.slice(0, 8)} · {o.delivery_type}
                    </div>
                    <div className="font-mono text-xs tabular-nums text-mute">
                      {o.total_dh} DH · {o.total_coins} ⊙
                    </div>
                  </div>
                  <StatusBadge
                    variant={statusVariant(o.status)}
                    label={statusLabel(o.status)}
                  />
                </div>
              </StickerCard>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
