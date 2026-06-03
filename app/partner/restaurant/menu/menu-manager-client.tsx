"use client"

/**
 * Partner restaurant menu manager (client).
 *
 * Refonte V2 (#171) — reskin charte paper néo-brutaliste :
 *  - Surfaces translucides `bg-card/30` `bg-card/40` supprimées → sticker cards
 *    (#fff + bordure 2px ink + ombre décalée).
 *  - Champs au kit (`<FieldInput>`) : label mono UPPERCASE, focus encre.
 *  - Halal en pill sélectionnable (fond ink actif).
 *  - Prix DH / ⊙ coins en mono prominent ; tags nutrition en pills lime.
 *  - Liste vide → `<NivEmpty>`.
 * Iso-fonctionnel : `create` / `remove` / endpoints `/api/partner/restaurant/...`
 * et tout l'état inchangés.
 */

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { FieldInput } from "@/components/ui/field-input"
import { StickerCard } from "@/components/ui/sticker-card"
import { NivEmpty } from "@/components/brand"
import { confirmToast } from "@/lib/ui/confirm-toast"

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
    if (!(await confirmToast({ message: "Supprimer cet item ?", destructive: true }))) return
    await fetch(`/api/partner/restaurant/menu/items/${id}`, { method: "DELETE" })
    setItems((s) => s.filter((i) => i.id !== id))
  }

  return (
    <div className="space-y-6">
      {/* Formulaire d'ajout */}
      <StickerCard className="gap-4 p-5">
        <h2 className="font-display text-lg font-extrabold tracking-tight text-ink">
          Ajouter un plat
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <FieldInput
            label="Nom du plat"
            placeholder="Tajine poulet citron"
            value={name}
            onChange={(e) => setName(e.target.value)}
            containerClassName="sm:col-span-2"
          />
          <FieldInput
            label="Prix DH"
            type="number"
            inputMode="numeric"
            placeholder="45"
            value={priceDh}
            onChange={(e) => setPriceDh(e.target.value)}
          />
          <FieldInput
            label="Calories"
            type="number"
            inputMode="numeric"
            placeholder="620"
            value={calories}
            onChange={(e) => setCalories(e.target.value)}
          />
          <FieldInput
            label="Tags nutrition (séparés par des virgules)"
            placeholder="healthy, vegetarian, halal"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            containerClassName="sm:col-span-2"
          />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setIsHalal((v) => !v)}
            aria-pressed={isHalal}
            className={
              "rounded-full border-2 border-ink px-4 py-2 font-mono text-xs font-semibold uppercase tracking-wide transition-colors " +
              (isHalal ? "bg-ink text-paper" : "bg-white text-ink")
            }
          >
            {isHalal ? "Halal ✓" : "Non-halal"}
          </button>
          <Button type="button" variant="pink" onClick={create} disabled={busy}>
            {busy ? "..." : "Ajouter"}
          </Button>
        </div>
      </StickerCard>

      {/* Liste des plats */}
      {items.length === 0 ? (
        <NivEmpty
          mood="calm"
          title="Ton menu est vide"
          description="Ajoute ton premier plat ci-dessus pour qu'il apparaisse côté ados."
        />
      ) : (
        <ul className="space-y-3">
          {items.map((it) => (
            <li key={it.id}>
              <StickerCard variant="default" className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-display font-bold text-ink">{it.name}</span>
                      {!it.is_halal && (
                        <span className="rounded-full border-2 border-ink bg-coral/15 px-2 py-0.5 font-mono text-[11px] font-semibold uppercase tracking-wide text-ink">
                          Non-halal
                        </span>
                      )}
                      {!it.is_active && (
                        <span className="rounded-full border-2 border-ink bg-paper-2 px-2 py-0.5 font-mono text-[11px] font-semibold uppercase tracking-wide text-mute">
                          Inactif
                        </span>
                      )}
                    </div>
                    <div className="mt-1 font-mono text-sm font-semibold tabular-nums text-ink">
                      {it.price_dh} DH
                      <span className="text-mute"> · </span>
                      <span className="text-coral">
                        {it.price_coins ?? Math.round(it.price_dh * 100)} ⊙
                      </span>
                      {it.calories ? (
                        <span className="text-mute"> · {it.calories} kcal</span>
                      ) : null}
                    </div>
                    {(it.nutrition_tags ?? []).length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {(it.nutrition_tags ?? []).map((t) => (
                          <span
                            key={t}
                            className="rounded-full border-2 border-ink bg-lime/15 px-2 py-0.5 font-mono text-[11px] font-medium text-ink"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => remove(it.id)}
                  >
                    Supprimer
                  </Button>
                </div>
              </StickerCard>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
