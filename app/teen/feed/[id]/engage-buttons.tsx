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
import { useT } from "@/lib/i18n"

type Action = "view" | "like" | "comment" | "share" | "save"

export default function EngageButtons({ submissionId }: { submissionId: string }) {
  const router = useRouter()
  const t = useT()
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
        toast.error(json.error ?? t("teen.feed.actionFailed"))
      } else {
        if (action === "like") {
          setCelebrate(true)
          window.setTimeout(() => setCelebrate(false), 1200)
        }
        toast.success(t("teen.feed.engaged"))
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
        {t("teen.feed.like")}
      </Button>
      <Button disabled={busy} onClick={() => fire("comment")} variant="outline" size="sm">
        {t("teen.feed.comment")}
      </Button>
      <Button disabled={busy} onClick={() => fire("share")} variant="outline" size="sm">
        {t("teen.feed.share")}
      </Button>
      <Button disabled={busy} onClick={() => fire("save")} variant="outline" size="sm">
        {t("teen.feed.save")}
      </Button>
    </div>
  )
}
