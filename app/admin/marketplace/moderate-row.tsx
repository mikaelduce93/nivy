"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
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
    try {
      const res = await fetch(`/api/admin/marketplace/moderate/${listing.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.error || "request_failed")
      }
      toast.success(decision === "approve" ? "Annonce approuvée" : "Annonce rejetée")
      router.refresh()
    } catch {
      toast.error("Action impossible pour le moment. Réessaie.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <li className="flex flex-col rounded-2xl border-2 border-ink bg-white text-ink shadow-stkr-md p-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="font-display font-extrabold text-ink">{listing.title}</div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-mute">
            <span className="rounded-md border-2 border-ink bg-paper px-2 py-0.5 font-mono uppercase tracking-[0.12em] text-ink-2">
              {listing.category}
            </span>
            <span className="font-mono font-semibold text-coral">
              ⊙ {listing.price_coins ?? 0}
            </span>
            <span className="font-mono">{new Date(listing.created_at).toLocaleString("fr-FR")}</span>
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
