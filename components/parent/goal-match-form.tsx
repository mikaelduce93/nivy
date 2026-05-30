"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { FieldInput } from "@/components/ui/field-input"

export function GoalMatchForm({
  goalId,
  initialPct,
  initialCap,
}: {
  goalId: string
  initialPct: number
  initialCap: number | null
}) {
  const router = useRouter()
  const [pct, setPct] = useState(initialPct)
  const [cap, setCap] = useState<number | "">(initialCap ?? "")
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setErr(null)
    const res = await fetch("/api/parent/savings/match", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        goal_id: goalId,
        match_pct: pct,
        match_cap_coins: cap === "" ? null : cap,
      }),
    })
    const json = await res.json()
    setBusy(false)
    if (!res.ok || !json.success) {
      setErr(json.error ?? "Erreur")
      return
    }
    router.refresh()
  }

  return (
    <form onSubmit={submit} className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <FieldInput
          label="Match %"
          type="number"
          min={0}
          max={100}
          value={pct}
          onChange={(e) => setPct(Number(e.target.value))}
        />
        <FieldInput
          label="Cap (coins, vide = illimité)"
          type="number"
          min={0}
          value={cap}
          onChange={(e) => setCap(e.target.value === "" ? "" : Number(e.target.value))}
        />
      </div>
      {err && <p className="text-destructive text-xs">{err}</p>}
      <Button type="submit" size="sm" disabled={busy} className="w-full">
        {busy ? "..." : "Sauvegarder le match"}
      </Button>
    </form>
  )
}
