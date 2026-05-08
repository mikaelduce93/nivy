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
  const [result, setResult] = useState<unknown>(null)

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
    setResult(null)
    const itemsPayload = Object.entries(cart)
      .filter(([, q]) => q > 0)
      .map(([id, qty]) => ({ menuItemId: id, qty }))
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
    setResult(json)
    setSubmitting(false)
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2 text-sm">
        {(["all", "halal", "vegetarian", "healthy"] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`rounded border px-3 py-1 ${
              filter === f ? "bg-blue-600 text-white" : "bg-white"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      <ul className="space-y-3">
        {filtered.map((it) => {
          const qty = cart[it.id] ?? 0
          const coins = it.price_coins ?? Math.round(it.price_dh * 100)
          return (
            <li key={it.id} className="rounded border p-3 flex justify-between gap-4">
              <div className="flex-1">
                <div className="font-medium">
                  {it.name}{" "}
                  {!it.is_halal && (
                    <span className="ml-1 rounded bg-red-100 px-1 text-xs text-red-700">
                      non-halal
                    </span>
                  )}
                </div>
                {it.description && (
                  <div className="text-xs text-gray-600">{it.description}</div>
                )}
                <div className="text-xs text-gray-500 mt-1">
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
                  className="rounded bg-gray-100 px-2 py-1 text-sm"
                >
                  −
                </button>
                <span className="w-6 text-center text-sm">{qty}</span>
                <button
                  type="button"
                  onClick={() => setCart((c) => ({ ...c, [it.id]: qty + 1 }))}
                  className="rounded bg-gray-100 px-2 py-1 text-sm"
                >
                  +
                </button>
              </div>
            </li>
          )
        })}
      </ul>

      <div className="sticky bottom-0 mt-6 flex items-center justify-between rounded-lg bg-blue-50 p-3">
        <div className="text-sm">
          Total: <strong>{totalCoins} coins</strong>
        </div>
        <button
          type="button"
          disabled={submitting || totalCoins === 0}
          onClick={submit}
          className="rounded-md bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
        >
          {submitting ? "Envoi..." : "Commander"}
        </button>
      </div>

      {result != null && (
        <pre className="mt-4 rounded bg-gray-50 p-3 text-xs overflow-auto">
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </div>
  )
}
