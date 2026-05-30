"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"

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
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <Button size="sm" variant="lime" disabled={busy} onClick={approve}>
        Approuver
      </Button>
      <Button size="sm" variant="outline" className="text-destructive" disabled={busy} onClick={reject}>
        Rejeter
      </Button>
      <Button
        size="sm"
        disabled={busy}
        onClick={feature}
        className="bg-gold text-ink border-ink hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-stkr-md"
      >
        <span>★ Mettre en avant</span>
        <span className="ml-1 font-mono text-[11px] text-ink">
          +500&nbsp;XP&nbsp;·&nbsp;+200&nbsp;⊙
        </span>
      </Button>
      {msg && <span className="ml-2 text-xs text-mute">{msg}</span>}
    </div>
  )
}
