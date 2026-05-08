"use client"

/**
 * Partner restaurant orders feed (client).
 *
 * Wave 2 / TICKET-002 — design-system token sweep:
 *  - Status pill replaced by <StatusBadge variant=...> (TICKET-007).
 *  - Buttons routed through <Button> primitive (success/destructive variants).
 *  - Raw bg-green-* / bg-red-* / text-gray-* removed.
 */

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { StatusBadge, type StatusVariant } from "@/components/ui/status-badge"
import { EmptyState } from "@/components/ui/states/empty-state"
import { Inbox } from "lucide-react"

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
      alert(json?.error || "Échec")
    }
  }

  return (
    <ul className="space-y-3">
      {orders.length === 0 && (
        <li>
          <EmptyState
            size="small"
            icon={Inbox}
            title="Aucune commande"
            description="Les nouvelles commandes apparaîtront ici en temps réel."
          />
        </li>
      )}
      {orders.map((o) => (
        <li
          key={o.id}
          className="rounded-2xl border border-border bg-card/30 p-3 text-sm backdrop-blur-md"
        >
          <div className="flex justify-between gap-3">
            <div>
              <div className="font-medium text-foreground">
                #{o.id.slice(0, 8)} · {o.delivery_type}
              </div>
              <div className="text-xs text-muted-foreground">
                {o.total_coins} coins · {o.total_dh} DH
                {o.parent_approval_id ? " · attente parent" : ""}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge
                variant={statusVariant(o.status)}
                label={o.status}
                pulse={o.status === "pending"}
              />
              {o.status === "pending" && !o.parent_approval_id && (
                <>
                  <Button
                    type="button"
                    variant="success"
                    size="sm"
                    onClick={() => act(o.id, "accept")}
                  >
                    Accepter
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() => act(o.id, "reject")}
                  >
                    Rejeter
                  </Button>
                </>
              )}
            </div>
          </div>
          {o.notes && (
            <div className="mt-1 text-xs text-muted-foreground">Notes: {o.notes}</div>
          )}
        </li>
      ))}
    </ul>
  )
}
