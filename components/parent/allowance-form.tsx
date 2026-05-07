"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"

interface Teen {
  id: string
  name: string
}

export function AllowanceForm({ teens }: { teens: Teen[] }) {
  const router = useRouter()
  const [teenId, setTeenId] = useState(teens[0]?.id ?? "")
  const [amount, setAmount] = useState(20)
  const [cadence, setCadence] = useState("weekly")
  const [dayOfWeek, setDayOfWeek] = useState(5) // Friday
  const [dayOfMonth, setDayOfMonth] = useState(1)
  const [conditional, setConditional] = useState(false)
  const [conditionThreshold, setConditionThreshold] = useState(5)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)

    const cadence_config: Record<string, number> = { hour: 9 }
    if (cadence === "weekly" || cadence === "biweekly") {
      cadence_config.day_of_week = dayOfWeek
    } else if (cadence === "monthly") {
      cadence_config.day_of_month = dayOfMonth
    }

    const res = await fetch("/api/parent/allowances", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        teenId,
        amount_dh: amount,
        cadence,
        cadence_config,
        conditional,
        condition_type: conditional ? "streak_min" : undefined,
        condition_threshold: conditional ? conditionThreshold : undefined,
      }),
    })
    setBusy(false)
    const json = await res.json()
    if (!res.ok || !json.success) {
      setError(json.error ?? "Erreur")
      return
    }
    router.push("/parent/allowances")
    router.refresh()
  }

  if (teens.length === 0) {
    return (
      <div className="text-muted-foreground">
        Aucun ado lié à ton compte. Lie d&apos;abord un ado.
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <Label>Ado</Label>
        <Select value={teenId} onValueChange={setTeenId}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {teens.map((t) => (
              <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>Montant (DH)</Label>
        <Input
          type="number"
          min={1}
          value={amount}
          onChange={(e) => setAmount(Number(e.target.value))}
        />
      </div>

      <div>
        <Label>Cadence</Label>
        <Select value={cadence} onValueChange={setCadence}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="weekly">Hebdomadaire</SelectItem>
            <SelectItem value="biweekly">Bimensuelle</SelectItem>
            <SelectItem value="monthly">Mensuelle</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {(cadence === "weekly" || cadence === "biweekly") && (
        <div>
          <Label>Jour de la semaine (0=Dim, 5=Vendredi)</Label>
          <Input
            type="number"
            min={0}
            max={6}
            value={dayOfWeek}
            onChange={(e) => setDayOfWeek(Number(e.target.value))}
          />
        </div>
      )}

      {cadence === "monthly" && (
        <div>
          <Label>Jour du mois (1..28)</Label>
          <Input
            type="number"
            min={1}
            max={28}
            value={dayOfMonth}
            onChange={(e) => setDayOfMonth(Number(e.target.value))}
          />
        </div>
      )}

      <div className="flex items-center gap-3">
        <Switch checked={conditional} onCheckedChange={setConditional} />
        <Label>Conditionnel (streak minimum)</Label>
      </div>

      {conditional && (
        <div>
          <Label>Seuil de streak</Label>
          <Input
            type="number"
            min={1}
            value={conditionThreshold}
            onChange={(e) => setConditionThreshold(Number(e.target.value))}
          />
        </div>
      )}

      {error && <p className="text-destructive text-sm">{error}</p>}

      <Button type="submit" disabled={busy}>
        {busy ? "Création..." : "Créer l'allowance"}
      </Button>
    </form>
  )
}
