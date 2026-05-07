"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

const CATEGORIES = [
  "clothing","books","school","sport","gaming","art","crafts","tickets","services","other",
] as const

const CONDITIONS = ["new","like_new","good","fair","poor"] as const

export function SellForm() {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setBusy(true)
    setErr(null)
    const fd = new FormData(e.currentTarget)
    const body = {
      title: String(fd.get("title") ?? ""),
      description: String(fd.get("description") ?? ""),
      category: String(fd.get("category") ?? "other"),
      price_coins: Number(fd.get("price_coins") ?? 0),
      condition: String(fd.get("condition") ?? "good"),
      brand: String(fd.get("brand") ?? ""),
      size: String(fd.get("size") ?? ""),
      color: String(fd.get("color") ?? ""),
      city: String(fd.get("city") ?? ""),
      neighborhood: String(fd.get("neighborhood") ?? ""),
    }
    const res = await fetch("/api/marketplace/listings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    const json = await res.json()
    setBusy(false)
    if (!json.success) {
      setErr(json.error ?? "unknown_error")
      return
    }
    router.push("/marketplace/my-listings")
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <input name="title" required minLength={3} maxLength={120} placeholder="Titre" className="w-full border rounded px-3 py-2" />
      <textarea name="description" rows={4} placeholder="Description (sans coordonnées)" className="w-full border rounded px-3 py-2" />
      <div className="grid grid-cols-2 gap-3">
        <select name="category" required className="border rounded px-3 py-2">
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select name="condition" className="border rounded px-3 py-2">
          {CONDITIONS.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <input name="price_coins" type="number" min={1} required placeholder="Prix (coins)" className="border rounded px-3 py-2" />
        <input name="brand" placeholder="Marque (optionnel)" className="border rounded px-3 py-2" />
        <input name="size" placeholder="Taille (optionnel)" className="border rounded px-3 py-2" />
        <input name="color" placeholder="Couleur (optionnel)" className="border rounded px-3 py-2" />
        <input name="city" placeholder="Ville" className="border rounded px-3 py-2" />
        <input name="neighborhood" placeholder="Quartier" className="border rounded px-3 py-2" />
      </div>
      {err && <p className="text-sm text-red-600">Erreur : {err}</p>}
      <button type="submit" disabled={busy} className="rounded bg-blue-600 text-white px-4 py-2 disabled:opacity-50">
        {busy ? "Envoi…" : "Publier l'annonce"}
      </button>
    </form>
  )
}
