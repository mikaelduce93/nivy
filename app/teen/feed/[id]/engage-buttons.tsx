"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

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
      <button
        disabled={busy}
        onClick={() => fire("like")}
        className="rounded border px-3 py-1 text-sm hover:bg-gray-50 disabled:opacity-50"
      >
        ♥ Like
      </button>
      <button
        disabled={busy}
        onClick={() => fire("comment")}
        className="rounded border px-3 py-1 text-sm hover:bg-gray-50 disabled:opacity-50"
      >
        💬 Comment
      </button>
      <button
        disabled={busy}
        onClick={() => fire("share")}
        className="rounded border px-3 py-1 text-sm hover:bg-gray-50 disabled:opacity-50"
      >
        ↗ Share
      </button>
      <button
        disabled={busy}
        onClick={() => fire("save")}
        className="rounded border px-3 py-1 text-sm hover:bg-gray-50 disabled:opacity-50"
      >
        🔖 Save
      </button>
      {msg && <span className="ml-2 text-xs text-gray-500">{msg}</span>}
    </div>
  )
}
