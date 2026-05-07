"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

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
        <div>
          <Label className="text-xs">Match %</Label>
          <Input
            type="number"
            min={0}
            max={100}
            value={pct}
            onChange={(e) => setPct(Number(e.target.value))}
          />
        </div>
        <div>
          <Label className="text-xs">Cap (coins, vide = illimité)</Label>
          <Input
            type="number"
            min={0}
            value={cap}
            onChange={(e) => setCap(e.target.value === "" ? "" : Number(e.target.value))}
          />
        </div>
      </div>
      {err && <p className="text-destructive text-xs">{err}</p>}
      <Button type="submit" size="sm" disabled={busy}>
        {busy ? "..." : "Sauvegarder le match"}
      </Button>
    </form>
  )
}
