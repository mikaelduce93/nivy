"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

export default function ModerationActions({
  queueId,
  submissionId,
}: {
  queueId: string
  submissionId: string
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  async function approve() {
    setBusy(true)
    try {
      const res = await fetch(`/api/admin/creator/moderate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ queueId, submissionId, action: "approve" }),
      })
      const j = await res.json()
      setMsg(res.ok ? "Approuvé" : j.error ?? "Erreur")
      if (res.ok) router.refresh()
    } finally {
      setBusy(false)
    }
  }

  async function reject() {
    setBusy(true)
    try {
      const res = await fetch(`/api/admin/creator/moderate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ queueId, submissionId, action: "reject" }),
      })
      const j = await res.json()
      setMsg(res.ok ? "Rejeté" : j.error ?? "Erreur")
      if (res.ok) router.refresh()
    } finally {
      setBusy(false)
    }
  }

  async function feature() {
    setBusy(true)
    try {
      const res = await fetch(`/api/admin/creator/feature/${submissionId}`, { method: "POST" })
      const j = await res.json()
      setMsg(res.ok ? `Featured (+500 XP, +200 coins)` : j.error ?? "Erreur")
      if (res.ok) router.refresh()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      <button
        disabled={busy}
        onClick={approve}
        className="rounded bg-green-600 px-3 py-1 text-xs text-white hover:bg-green-700 disabled:opacity-50"
      >
        Approuver
      </button>
      <button
        disabled={busy}
        onClick={reject}
        className="rounded bg-red-600 px-3 py-1 text-xs text-white hover:bg-red-700 disabled:opacity-50"
      >
        Rejeter
      </button>
      <button
        disabled={busy}
        onClick={feature}
        className="rounded bg-yellow-500 px-3 py-1 text-xs text-white hover:bg-yellow-600 disabled:opacity-50"
      >
        ★ Featurer
      </button>
      {msg && <span className="ml-2 text-xs text-gray-500">{msg}</span>}
    </div>
  )
}
