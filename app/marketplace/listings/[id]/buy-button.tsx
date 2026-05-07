"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

export function BuyButton({ listingId }: { listingId: string }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [meetMethod, setMeetMethod] = useState<"school" | "venue_partner">("school")
  const [msg, setMsg] = useState<string | null>(null)

  async function buy() {
    setBusy(true)
    setMsg(null)
    const res = await fetch(`/api/marketplace/listings/${listingId}/buy`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ meet_method: meetMethod }),
    })
    const json = await res.json()
    setBusy(false)
    if (!json.success) {
      setMsg(`Erreur : ${json.error}`)
      return
    }
    if (json.status === "pending_approval") {
      setMsg("Demande envoyée à ton parent pour approbation.")
      return
    }
    router.push("/marketplace/orders")
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium">Lieu de rendez-vous (sécurité teen)</label>
      <select
        value={meetMethod}
        onChange={(e) => setMeetMethod(e.target.value as "school" | "venue_partner")}
        className="w-full border rounded px-3 py-2"
      >
        <option value="school">À l&apos;école</option>
        <option value="venue_partner">Partenaire Nivy</option>
      </select>
      <button onClick={buy} disabled={busy} className="rounded bg-blue-600 text-white px-4 py-2 disabled:opacity-50">
        {busy ? "Achat en cours…" : "Acheter"}
      </button>
      {msg && <p className="text-sm">{msg}</p>}
    </div>
  )
}
