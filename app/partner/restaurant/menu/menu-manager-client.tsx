"use client"

/**
 * Partner restaurant menu manager (client).
 *
 * Wave 2 / TICKET-002 — design-system token sweep:
 *  - Buttons routed through <Button> primitive.
 *  - Raw bg-blue-600 / bg-red-* / text-gray-* / text-blue-700 removed in
 *    favour of semantic tokens (primary, destructive, muted-foreground,
 *    info-soft).
 *  - Native inputs get min-h-11 (44px touch target) + token borders.
 */

import { useState } from "react"
import { Button } from "@/components/ui/button"

interface Item {
  id: string
  name: string
  price_dh: number
  price_coins: number | null
  calories: number | null
  is_halal: boolean
  is_active: boolean
  category?: string | null
  nutrition_tags?: string[] | null
}

const inputClass =
  "min-h-11 rounded-xl border border-border bg-card/40 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"

export default function MenuManagerClient({ initialItems }: { initialItems: Item[] }) {
  const [items, setItems] = useState<Item[]>(initialItems)
  const [name, setName] = useState("")
  const [priceDh, setPriceDh] = useState("")
  const [calories, setCalories] = useState("")
  const [isHalal, setIsHalal] = useState(true)
  const [tags, setTags] = useState("")
  const [busy, setBusy] = useState(false)

  const create = async () => {
    if (!name || !priceDh) return
    setBusy(true)
    const res = await fetch("/api/partner/restaurant/menu/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        price_dh: Number(priceDh),
        calories: calories ? Number(calories) : null,
        is_halal: isHalal,
        nutrition_tags: tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
      }),
    })
    const json = await res.json()
    if (json?.success) {
      setItems((s) => [json.data, ...s])
      setName("")
      setPriceDh("")
      setCalories("")
      setTags("")
      setIsHalal(true)
    }
    setBusy(false)
  }

  const remove = async (id: string) => {
    if (!confirm("Supprimer cet item ?")) return
    await fetch(`/api/partner/restaurant/menu/items/${id}`, { method: "DELETE" })
    setItems((s) => s.filter((i) => i.id !== id))
  }

  return (
    <div>
      <div className="rounded-2xl border border-border bg-card/30 p-4 mb-6 grid grid-cols-2 gap-2 text-sm backdrop-blur-md">
        <input
          className={`${inputClass} col-span-2`}
          placeholder="Nom du plat"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          className={inputClass}
          placeholder="Prix DH"
          type="number"
          value={priceDh}
          onChange={(e) => setPriceDh(e.target.value)}
        />
        <input
          className={inputClass}
          placeholder="Calories"
          type="number"
          value={calories}
          onChange={(e) => setCalories(e.target.value)}
        />
        <input
          className={`${inputClass} col-span-2`}
          placeholder="Tags (csv: healthy,vegetarian,halal)"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
        />
        <label className="flex items-center gap-2 col-span-1 text-foreground">
          <input
            type="checkbox"
            checked={isHalal}
            onChange={(e) => setIsHalal(e.target.checked)}
            className="h-5 w-5 rounded accent-primary"
          />
          Halal
        </label>
        <Button
          type="button"
          onClick={create}
          disabled={busy}
          className="col-span-1"
        >
          {busy ? "..." : "Ajouter"}
        </Button>
      </div>

      <ul className="space-y-2">
        {items.map((it) => (
          <li
            key={it.id}
            className="rounded-2xl border border-border bg-card/30 p-3 flex justify-between text-sm backdrop-blur-md"
          >
            <div>
              <div className="font-medium text-foreground">
                {it.name}{" "}
                {!it.is_halal && (
                  <span className="text-destructive text-xs">(non-halal)</span>
                )}{" "}
                {!it.is_active && (
                  <span className="text-muted-foreground text-xs">(inactif)</span>
                )}
              </div>
              <div className="text-xs text-muted-foreground">
                {it.price_dh} DH · {it.price_coins ?? Math.round(it.price_dh * 100)} coins
                {it.calories ? ` · ${it.calories} kcal` : ""}
              </div>
              {(it.nutrition_tags ?? []).length > 0 && (
                <div className="text-xs text-info">
                  {(it.nutrition_tags ?? []).join(" · ")}
                </div>
              )}
            </div>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={() => remove(it.id)}
            >
              Supprimer
            </Button>
          </li>
        ))}
      </ul>
    </div>
  )
}
