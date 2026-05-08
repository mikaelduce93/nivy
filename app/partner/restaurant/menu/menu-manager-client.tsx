"use client"

import { useState } from "react"

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
      <div className="rounded-lg border p-4 mb-6 grid grid-cols-2 gap-2 text-sm">
        <input
          className="rounded border px-2 py-1 col-span-2"
          placeholder="Nom du plat"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          className="rounded border px-2 py-1"
          placeholder="Prix DH"
          type="number"
          value={priceDh}
          onChange={(e) => setPriceDh(e.target.value)}
        />
        <input
          className="rounded border px-2 py-1"
          placeholder="Calories"
          type="number"
          value={calories}
          onChange={(e) => setCalories(e.target.value)}
        />
        <input
          className="rounded border px-2 py-1 col-span-2"
          placeholder="Tags (csv: healthy,vegetarian,halal)"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
        />
        <label className="flex items-center gap-1 col-span-1">
          <input
            type="checkbox"
            checked={isHalal}
            onChange={(e) => setIsHalal(e.target.checked)}
          />
          Halal
        </label>
        <button
          type="button"
          onClick={create}
          disabled={busy}
          className="rounded bg-blue-600 px-3 py-1 text-white disabled:opacity-50 col-span-1"
        >
          {busy ? "..." : "Ajouter"}
        </button>
      </div>

      <ul className="space-y-2">
        {items.map((it) => (
          <li key={it.id} className="rounded border p-3 flex justify-between text-sm">
            <div>
              <div className="font-medium">
                {it.name} {!it.is_halal && <span className="text-red-600 text-xs">(non-halal)</span>}{" "}
                {!it.is_active && <span className="text-gray-500 text-xs">(inactif)</span>}
              </div>
              <div className="text-xs text-gray-500">
                {it.price_dh} DH · {it.price_coins ?? Math.round(it.price_dh * 100)} coins
                {it.calories ? ` · ${it.calories} kcal` : ""}
              </div>
              {(it.nutrition_tags ?? []).length > 0 && (
                <div className="text-xs text-blue-700">
                  {(it.nutrition_tags ?? []).join(" · ")}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => remove(it.id)}
              className="rounded bg-red-50 px-2 py-1 text-xs text-red-700"
            >
              Supprimer
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
