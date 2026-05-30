"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"

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
    <li className="flex flex-col rounded-2xl border-2 border-ink bg-white text-ink shadow-stkr-md p-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="font-semibold">{listing.title}</div>
          <div className="text-xs text-mute">
            {listing.category} · <span className="font-mono">{listing.price_coins} coins</span> · {new Date(listing.created_at).toLocaleString("fr-FR")}
          </div>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="lime" onClick={() => decide("approve")} disabled={busy}>
            Approuver
          </Button>
          <Button size="sm" variant="outline" className="text-destructive" onClick={() => decide("reject")} disabled={busy}>
            Rejeter
          </Button>
        </div>
      </div>
    </li>
  )
}
