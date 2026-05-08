"use client"

import { useEffect, useState } from "react"

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
        s.map((o) => (o.id === id ? { ...o, status: kind === "accept" ? "accepted" : "rejected" } : o))
      )
    } else {
      alert(json?.error || "Échec")
    }
  }

  return (
    <ul className="space-y-3">
      {orders.length === 0 && (
        <li className="text-sm text-gray-500">Aucune commande.</li>
      )}
      {orders.map((o) => (
        <li key={o.id} className="rounded border p-3 text-sm">
          <div className="flex justify-between">
            <div>
              <div className="font-medium">#{o.id.slice(0, 8)} · {o.delivery_type}</div>
              <div className="text-xs text-gray-500">
                {o.total_coins} coins · {o.total_dh} DH
                {o.parent_approval_id ? " · attente parent" : ""}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase">{o.status}</span>
              {o.status === "pending" && !o.parent_approval_id && (
                <>
                  <button
                    type="button"
                    onClick={() => act(o.id, "accept")}
                    className="rounded bg-green-600 px-2 py-1 text-xs text-white"
                  >
                    Accepter
                  </button>
                  <button
                    type="button"
                    onClick={() => act(o.id, "reject")}
                    className="rounded bg-red-600 px-2 py-1 text-xs text-white"
                  >
                    Rejeter
                  </button>
                </>
              )}
            </div>
          </div>
          {o.notes && <div className="mt-1 text-xs text-gray-500">Notes: {o.notes}</div>}
        </li>
      ))}
    </ul>
  )
}
