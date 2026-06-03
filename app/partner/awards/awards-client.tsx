"use client"

import { useState } from "react"
import { NivCoach, NivCelebration } from "@/components/brand"
import { StickerCard } from "@/components/ui/sticker-card"
import { Button } from "@/components/ui/button"
import { FieldInput } from "@/components/ui/field-input"
import { SegmentedProgress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"
import { Award, Send } from "lucide-react"
import { CATS } from "./awards-categories"

const WEEKLY_CAP = 500 // Plafond hebdo par ado (teacher-coach-xp §9).

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

  const amount = Math.max(0, Math.min(WEEKLY_CAP, Number(form.amount_xp) || 0))
  const capSegments = 10
  const capCurrent = Math.round((amount / WEEKLY_CAP) * capSegments)

  return (
    <div className="max-w-2xl space-y-8 pt-6">
      <header className="space-y-2">
        <p className="eyebrow">Coach · Prof</p>
        <h1 className="font-display text-4xl font-extrabold tracking-tight">
          Attribuer de l'<em className="font-semibold italic text-pink">XP</em>
        </h1>
        <p className="text-mute">Récompense le mérite d'un ado. Plafond : 500 XP / ado / semaine.</p>
      </header>

      {state.kind === "ok" ? (
        <NivCelebration
          tone="gold"
          palette="xp"
          title="XP attribué"
          value={`+${amount || ""}`.trim() || "+XP"}
          caption="En attente de revue parentale avant d'être crédité."
          trigger
        />
      ) : (
        <NivCoach mood="proud" message="L'XP est validé par le parent avant d'être crédité. Joins une preuve si possible." />
      )}

      <StickerCard className="gap-5 p-6">
        <form onSubmit={submit} className="space-y-5">
          <FieldInput
            label="ID de l'ado"
            value={form.teen_id}
            onChange={(e) => setForm({ ...form, teen_id: e.target.value })}
            placeholder="UUID du teen"
            required
          />

          {/* Montant XP — chiffre gold mis en valeur + jauge du plafond hebdo. */}
          <div className="space-y-3 rounded-2xl border-2 border-line bg-paper-2 p-4">
            <div className="flex items-end justify-between gap-3">
              <FieldInput
                label="Montant XP"
                type="number"
                min={1}
                max={WEEKLY_CAP}
                value={form.amount_xp}
                onChange={(e) => setForm({ ...form, amount_xp: Number(e.target.value) })}
                required
                containerClassName="flex-1"
              />
              <span className="pb-2 font-display text-3xl font-extrabold tabular-nums text-gold">
                +{amount} XP
              </span>
            </div>
            <SegmentedProgress steps={capSegments} current={capCurrent} />
            <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-mute">
              Reste {Math.max(0, WEEKLY_CAP - amount)} XP sur le plafond hebdo
            </p>
          </div>

          <div className="space-y-2">
            <p className="eyebrow">Catégorie</p>
            <div className="flex flex-wrap gap-2">
              {CATS.map((c) => (
                <button
                  type="button"
                  key={c.id}
                  onClick={() => setForm({ ...form, category: c.id })}
                  className={cn(
                    "rounded-xl border-2 border-ink px-4 py-2 text-sm font-bold transition-all",
                    form.category === c.id
                      ? "-translate-x-0.5 -translate-y-0.5 bg-ink text-paper shadow-stkr-pink motion-reduce:translate-x-0 motion-reduce:translate-y-0"
                      : "bg-white hover:bg-paper-2",
                  )}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          <FieldInput
            label="Raison"
            value={form.reason}
            onChange={(e) => setForm({ ...form, reason: e.target.value })}
            placeholder="Ex : meilleure progression du mois"
          />

          {state.kind === "error" && (
            <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-ink bg-coral px-3 py-1 font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-ink">
              {state.msg}
            </span>
          )}

          <Button type="submit" variant="pink" disabled={busy} className="shadow-stkr-md">
            <Send className="mr-2 h-4 w-4" />
            {busy ? "Envoi..." : "Attribuer l'XP"}
          </Button>
        </form>
      </StickerCard>

      <p className="flex items-center gap-2 text-xs text-mute">
        <Award className="h-4 w-4 text-gold" /> Chaque attribution est tracée et soumise à la revue du parent.
      </p>
    </div>
  )
}
