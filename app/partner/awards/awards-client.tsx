"use client"

import { useState } from "react"
import { Niv } from "@/components/brand/niv"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { FormField } from "@/components/ui/field"
import { cn } from "@/lib/utils"
import { Award, Send } from "lucide-react"

const CATS = [
  { id: "school", label: "École 📚" },
  { id: "sport", label: "Sport 💪" },
  { id: "crea", label: "Créa 🎨" },
]

// Refonte V1.5 (#99) — UI d'attribution XP coach/prof. POST /api/partner/awards/grant.
export function AwardsClient() {
  const [form, setForm] = useState({ teen_id: "", amount_xp: 50, category: "school", reason: "" })
  const [state, setState] = useState<{ kind: "idle" | "ok" | "error"; msg?: string }>({ kind: "idle" })
  const [busy, setBusy] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setState({ kind: "idle" })
    try {
      const res = await fetch("/api/partner/awards/grant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, amount_xp: Number(form.amount_xp) }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        setState({ kind: "ok", msg: "XP attribué — en attente de revue parentale." })
        setForm({ teen_id: "", amount_xp: 50, category: "school", reason: "" })
      } else if (res.status === 409) {
        setState({ kind: "error", msg: `Plafond hebdo atteint (reste ${data.remaining ?? 0} XP).` })
      } else if (res.status === 403) {
        setState({ kind: "error", msg: "Non autorisé : réservé aux coachs/profs habilités." })
      } else {
        setState({ kind: "error", msg: "Échec de l'attribution." })
      }
    } catch {
      setState({ kind: "error", msg: "Erreur réseau." })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-8 pt-6 max-w-2xl">
      <header className="space-y-2">
        <p className="eyebrow">Coach · Prof</p>
        <h1 className="text-4xl font-extrabold tracking-tight">
          Attribuer de l'<span className="text-pink italic">XP</span>
        </h1>
        <p className="text-mute">Récompense le mérite d'un ado. Plafond : 500 XP / ado / semaine.</p>
      </header>

      <Card className="bg-[linear-gradient(135deg,var(--night-2),var(--night))] border-ink flex-row items-center gap-4 px-6 py-5">
        <Niv size={72} mood="proud" />
        <p className="text-paper/80 text-sm">L'XP est validé par le parent avant d'être crédité. Joins une preuve si possible.</p>
      </Card>

      <Card className="p-6">
        <form onSubmit={submit} className="space-y-4 px-6">
          <FormField label="ID de l'ado" required>
            <Input value={form.teen_id} onChange={(e) => setForm({ ...form, teen_id: e.target.value })} placeholder="UUID du teen" required />
          </FormField>
          <FormField label="Montant XP" required>
            <Input type="number" min={1} max={500} value={form.amount_xp} onChange={(e) => setForm({ ...form, amount_xp: Number(e.target.value) })} required />
          </FormField>
          <div className="space-y-2">
            <p className="eyebrow">Catégorie</p>
            <div className="flex gap-2">
              {CATS.map((c) => (
                <button type="button" key={c.id} onClick={() => setForm({ ...form, category: c.id })}
                  className={cn("rounded-xl border-2 border-ink px-4 py-2 text-sm font-bold", form.category === c.id ? "bg-ink text-paper" : "bg-card hover:bg-accent")}>
                  {c.label}
                </button>
              ))}
            </div>
          </div>
          <FormField label="Raison">
            <Input value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="Ex: meilleure progression du mois" />
          </FormField>
          {state.kind !== "idle" && (
            <p className={cn("text-sm font-medium", state.kind === "ok" ? "text-lime" : "text-destructive")}>{state.msg}</p>
          )}
          <Button type="submit" variant="pink" disabled={busy}>
            <Send className="w-4 h-4 mr-2" />{busy ? "Envoi..." : "Attribuer l'XP"}
          </Button>
        </form>
      </Card>

      <p className="flex items-center gap-2 text-xs text-mute">
        <Award className="w-4 h-4 text-gold" /> Chaque attribution est tracée et soumise à la revue du parent.
      </p>
    </div>
  )
}
