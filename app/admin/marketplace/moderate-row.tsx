"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

interface ListingRow {
  id: string
  title: string
  category: string
  price_coins: number | null
  seller_user_id: string
  created_at: string
}

export function ModerateRow({ listing }: { listing: ListingRow }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  async function decide(decision: "approve" | "reject") {
    setBusy(true)
    await fetch(`/api/admin/marketplace/moderate/${listing.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision }),
    })
    setBusy(false)
    router.refresh()
  }

  return (
    <li className="border rounded p-3 flex items-center justify-between">
      <div>
        <div className="font-semibold">{listing.title}</div>
        <div className="text-xs text-gray-500">
          {listing.category} · {listing.price_coins} coins · {new Date(listing.created_at).toLocaleString()}
        </div>
      </div>
      <div className="flex gap-2">
        <button onClick={() => decide("approve")} disabled={busy}
          className="rounded bg-green-600 text-white px-3 py-1 text-sm disabled:opacity-50">
          Approuver
        </button>
        <button onClick={() => decide("reject")} disabled={busy}
          className="rounded bg-red-600 text-white px-3 py-1 text-sm disabled:opacity-50">
          Rejeter
        </button>
      </div>
    </li>
  )
}
