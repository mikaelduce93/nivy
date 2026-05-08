"use client"

import { useRouter } from "next/navigation"
import { useState, useOptimistic, startTransition } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Lock, X, Check, Loader2 } from "lucide-react"
import { toast } from "sonner"

// TICKET-031 — savings goal lock/contribute uses useOptimistic so the panel
// closes and shows a "verrouillé" confirmation instantly. On server failure
// the optimistic state reverts and we surface the error inline.
type LockState =
  | { status: "idle" }
  | { status: "locked"; amount: number }

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

  const [confirmedLock, setConfirmedLock] = useState<LockState>({ status: "idle" })
  const [optimisticLock, applyLock] = useOptimistic(
    confirmedLock,
    (_prev: LockState, next: LockState) => next,
  )

  async function lock() {
    if (busy) return
    setBusy(true)
    setErr(null)

    const lockedAmount = amount

    startTransition(async () => {
      // Optimistic flip — immediately show the locked confirmation pill and
      // close the input panel. Reverts automatically on error.
      applyLock({ status: "locked", amount: lockedAmount })
      setOpen(false)

      try {
        const res = await fetch(`/api/teen/savings/goals/${goalId}/lock`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ amount_coins: lockedAmount }),
        })
        const json = await res.json().catch(() => ({}))
        if (!res.ok || !json.success) {
          // Rollback: re-open the form, restore error.
          setErr(json?.error ?? "Erreur")
          setOpen(true)
          toast.error(json?.error ?? "Verrouillage impossible")
          return
        }
        // Confirm and re-sync from server (totals, progress, etc).
        setConfirmedLock({ status: "locked", amount: lockedAmount })
        toast.success(`+${lockedAmount} coins verrouillés`)
        router.refresh()
      } catch {
        setErr("Erreur réseau")
        setOpen(true)
        toast.error("Erreur réseau")
      } finally {
        setBusy(false)
      }
    })
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

  // While the optimistic mutation is in-flight (or after a successful lock,
  // before router.refresh swaps the parent), show a "verrouillé" pill so the
  // user gets immediate visual confirmation.
  if (optimisticLock.status === "locked" && busy) {
    return (
      <div className="flex gap-2 items-center">
        <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600">
          <Loader2 className="w-3 h-3 animate-spin" />
          Verrouillage de {optimisticLock.amount} coins…
        </span>
      </div>
    )
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
          disabled={busy}
        />
        <Button size="sm" onClick={lock} disabled={busy || amount <= 0 || amount > spendable}>
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)} disabled={busy}>
          Annuler
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">Disponible : {spendable} coins</p>
      {err && <p className="text-xs text-destructive">{err}</p>}
    </div>
  )
}
