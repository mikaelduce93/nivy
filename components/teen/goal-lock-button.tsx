"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Lock, X } from "lucide-react"

export function GoalLockButton({
  goalId,
  spendable,
}: {
  goalId: string
  spendable: number
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [amount, setAmount] = useState(100)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function lock() {
    setBusy(true)
    setErr(null)
    const res = await fetch(`/api/teen/savings/goals/${goalId}/lock`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount_coins: amount }),
    })
    const json = await res.json()
    setBusy(false)
    if (!res.ok || !json.success) {
      setErr(json.error ?? "Erreur")
      return
    }
    setOpen(false)
    router.refresh()
  }

  async function cancel() {
    if (!confirm("Annuler cet objectif et libérer les coins ?")) return
    setBusy(true)
    const res = await fetch(`/api/teen/savings/goals/${goalId}/cancel`, {
      method: "POST",
    })
    setBusy(false)
    if (res.ok) router.refresh()
  }

  if (!open) {
    return (
      <div className="flex gap-2">
        <Button size="sm" onClick={() => setOpen(true)}>
          <Lock className="w-4 h-4 mr-1" /> Verrouiller
        </Button>
        <Button size="sm" variant="ghost" onClick={cancel} disabled={busy}>
          <X className="w-4 h-4 mr-1" /> Annuler
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          type="number"
          min={1}
          max={spendable}
          value={amount}
          onChange={(e) => setAmount(Number(e.target.value))}
        />
        <Button size="sm" onClick={lock} disabled={busy || amount <= 0 || amount > spendable}>
          OK
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
          Annuler
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">Disponible : {spendable} coins</p>
      {err && <p className="text-xs text-destructive">{err}</p>}
    </div>
  )
}
