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
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Confetti } from "@/components/ui/effects/confetti"

type Action = "view" | "like" | "comment" | "share" | "save"

export default function EngageButtons({ submissionId }: { submissionId: string }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [celebrate, setCelebrate] = useState(false)

  async function fire(action: Action) {
    setBusy(true)
    try {
      const res = await fetch(`/api/teen/feed/${submissionId}/engage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      })
      const json = await res.json()
      if (!res.ok) {
        toast.error(json.error ?? "Action impossible, réessaie")
      } else {
        if (action === "like") {
          setCelebrate(true)
          window.setTimeout(() => setCelebrate(false), 1200)
        }
        toast.success("C'est noté !")
        router.refresh()
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Confetti trigger={celebrate} palette="reward" numberOfPieces={80} />
      <Button disabled={busy} onClick={() => fire("like")} variant="pink" size="sm">
        ♥ J&apos;aime
      </Button>
      <Button disabled={busy} onClick={() => fire("comment")} variant="outline" size="sm">
        💬 Commenter
      </Button>
      <Button disabled={busy} onClick={() => fire("share")} variant="outline" size="sm">
        ↗ Partager
      </Button>
      <Button disabled={busy} onClick={() => fire("save")} variant="outline" size="sm">
        🔖 Garder
      </Button>
    </div>
  )
}
