"use client"

/**
 * Engagement actions on a feed submission detail.
 *
 * Wave 2 / TICKET-002 — design-system token sweep:
 *  - Native <button> → <Button variant="outline" size="sm">.
 *  - Raw text-gray-* / hover:bg-gray-* removed.
 */

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"

type Action = "view" | "like" | "comment" | "share" | "save"

export default function EngageButtons({ submissionId }: { submissionId: string }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  async function fire(action: Action) {
    setBusy(true)
    setMsg(null)
    try {
      const res = await fetch(`/api/teen/feed/${submissionId}/engage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      })
      const json = await res.json()
      if (!res.ok) {
        setMsg(json.error ?? "Erreur")
      } else {
        setMsg(`OK${json.xp ? ` · ${JSON.stringify(json.xp)}` : ""}`)
        router.refresh()
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button disabled={busy} onClick={() => fire("like")} variant="outline" size="sm">
        ♥ Like
      </Button>
      <Button disabled={busy} onClick={() => fire("comment")} variant="outline" size="sm">
        💬 Comment
      </Button>
      <Button disabled={busy} onClick={() => fire("share")} variant="outline" size="sm">
        ↗ Share
      </Button>
      <Button disabled={busy} onClick={() => fire("save")} variant="outline" size="sm">
        🔖 Save
      </Button>
      {msg && <span className="ml-2 text-xs text-muted-foreground">{msg}</span>}
    </div>
  )
}
