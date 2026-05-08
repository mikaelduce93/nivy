"use client"

import { useState, useMemo } from "react"

interface MenuItem {
  id: string
  name: string
  description?: string | null
  category?: string | null
  price_dh: number
  price_coins: number | null
  calories?: number | null
  nutrition_tags?: string[] | null
  allergens?: string[] | null
  is_halal: boolean
  prep_time_minutes?: number | null
}

const FILTER_LABELS: Record<"all" | "halal" | "vegetarian" | "healthy", string> = {
  all: "Tous",
  halal: "Halal",
  vegetarian: "Végétarien",
  healthy: "Healthy",
}

export default function MenuCartClient({
  partnerId,
  items,
}: {
  partnerId: string
  items: MenuItem[]
}) {
  const [cart, setCart] = useState<Record<string, number>>({})
  const [filter, setFilter] = useState<"all" | "halal" | "vegetarian" | "healthy">("all")
  const [submitting, setSubmitting] = useState(false)
  const [orderResult, setOrderResult] = useState<{
    ok: boolean
    message: string
    orderId?: string
  } | null>(null)

  const filtered = useMemo(() => {
    if (filter === "all") return items
    if (filter === "halal") return items.filter((i) => i.is_halal)
    return items.filter((i) => (i.nutrition_tags ?? []).includes(filter))
  }, [items, filter])

  const totalCoins = useMemo(
    () =>
      Object.entries(cart).reduce((sum, [id, qty]) => {
        const it = items.find((x) => x.id === id)
        const coins = it?.price_coins ?? Math.round((it?.price_dh ?? 0) * 100)
        return sum + coins * qty
      }, 0),
    [cart, items]
  )

  const submit = async () => {
    setSubmitting(true)
    setOrderResult(null)
    const itemsPayload = Object.entries(cart)
      .filter(([, q]) => q > 0)
      .map(([id, qty]) => ({ menuItemId: id, qty }))
    try {
      const res = await fetch("/api/teen/food/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          partnerId,
          deliveryType: "pickup",
          items: itemsPayload,
          paymentMethod: "coins",
        }),
      })
      const json = await res.json()
      if (res.ok && json?.success) {
        setOrderResult({
          ok: true,
          message: "Commande envoyée avec succès.",
          orderId: json?.data?.orderId ?? json?.orderId,
        })
        setCart({})
      } else {
        setOrderResult({
          ok: false,
          message: json?.error ?? "Erreur lors de la commande.",
        })
      }
    } catch (err) {
      setOrderResult({
        ok: false,
        message: err instanceof Error ? err.message : "Erreur réseau.",
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <div
        role="group"
        aria-label="Filtres du menu"
        className="mb-4 flex flex-wrap gap-2 text-sm"
      >
        {(["all", "halal", "vegetarian", "healthy"] as const).map((f) => {
          const active = filter === f
          return (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              aria-pressed={active}
              className={`rounded border px-3 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                active ? "bg-blue-600 text-white" : "bg-white text-zinc-900"
              }`}
            >
              {FILTER_LABELS[f]}
            </button>
          )
        })}
      </div>

      <ul className="space-y-3">
        {filtered.map((it) => {
          const qty = cart[it.id] ?? 0
          const coins = it.price_coins ?? Math.round(it.price_dh * 100)
          return (
            <li key={it.id} className="rounded border p-3 flex justify-between gap-4">
              <div className="flex-1">
                <h3 className="font-medium text-base m-0">
                  {it.name}{" "}
                  {!it.is_halal && (
                    <span className="ml-1 rounded bg-red-100 px-1 text-xs text-red-700">
                      non-halal
                    </span>
                  )}
                </h3>
                {it.description && (
                  <div className="text-xs text-zinc-600">{it.description}</div>
                )}
                <div className="text-xs text-zinc-700 mt-1">
                  {coins} coins · {it.price_dh} DH
                  {it.calories ? ` · ${it.calories} kcal` : ""}
                  {it.prep_time_minutes ? ` · ${it.prep_time_minutes} min` : ""}
                </div>
                {(it.nutrition_tags ?? []).length > 0 && (
                  <div className="text-xs text-blue-700 mt-1">
                    {(it.nutrition_tags ?? []).join(" · ")}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCart((c) => ({ ...c, [it.id]: Math.max(0, qty - 1) }))}
                  aria-label={`Diminuer la quantité de ${it.name}`}
                  className="rounded bg-gray-100 px-2 py-1 text-sm text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                >
                  <span aria-hidden="true">−</span>
                </button>
                <span
                  className="w-6 text-center text-sm"
                  aria-label={`Quantité de ${it.name}: ${qty}`}
                  aria-live="polite"
                >
                  {qty}
                </span>
                <button
                  type="button"
                  onClick={() => setCart((c) => ({ ...c, [it.id]: qty + 1 }))}
                  aria-label={`Augmenter la quantité de ${it.name}`}
                  className="rounded bg-gray-100 px-2 py-1 text-sm text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                >
                  <span aria-hidden="true">+</span>
                </button>
              </div>
            </li>
          )
        })}
      </ul>

      <div className="sticky bottom-0 mt-6 flex items-center justify-between rounded-lg bg-blue-50 p-3">
        <div className="text-sm text-zinc-900">
          Total: <strong>{totalCoins} coins</strong>
        </div>
        <button
          type="button"
          disabled={submitting || totalCoins === 0}
          onClick={submit}
          className="rounded-md bg-blue-600 px-4 py-2 text-white disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700"
        >
          {submitting ? "Envoi..." : "Commander"}
        </button>
      </div>

      {orderResult && (
        <div
          role={orderResult.ok ? "status" : "alert"}
          aria-live={orderResult.ok ? "polite" : "assertive"}
          className={`mt-4 rounded p-3 text-sm ${
            orderResult.ok
              ? "bg-emerald-50 text-emerald-900 border border-emerald-200"
              : "bg-red-50 text-red-900 border border-red-200"
          }`}
        >
          <p className="font-medium">{orderResult.message}</p>
          {orderResult.orderId && (
            <p className="mt-1 text-xs opacity-80">
              Commande #{orderResult.orderId.slice(0, 8)}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
