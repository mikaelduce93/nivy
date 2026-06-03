"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, SkipForward } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { StickerCard } from "@/components/ui/sticker-card"
import { SegmentedProgress } from "@/components/ui/progress"
import { Textarea } from "@/components/ui/textarea"
import { NivCoach } from "@/components/brand"
import { cn } from "@/lib/utils"

interface GoalsFormProps {
  initial?: string[]
  nextHref?: string
}

const PLACEHOLDERS = [
  "Ex: Améliorer mes notes en maths",
  "Ex: Apprendre la guitare",
  "Ex: Courir un 5km sans m'arrêter",
]

const HELP = [
  "Un objectif scolaire, sportif ou créatif.",
  "Quelque chose de fun que tu veux apprendre.",
  "Un défi perso pour cette saison.",
]

// Token gamifié visible par carte (charte §6 — couleurs économie).
const TOKENS = [
  { emoji: "📚", bg: "bg-teal" },
  { emoji: "🎸", bg: "bg-pink" },
  { emoji: "🔥", bg: "bg-gold" },
]

export function GoalsForm({
  initial = ["", "", ""],
  nextHref = "/onboarding/learning-style",
}: GoalsFormProps) {
  const router = useRouter()
  const [goals, setGoals] = useState<string[]>(() => {
    const arr = [...initial]
    while (arr.length < 3) arr.push("")
    return arr.slice(0, 3)
  })
  const [submitting, setSubmitting] = useState<"confirm" | "skip" | null>(null)

  function update(idx: number, value: string) {
    setGoals((prev) => prev.map((g, i) => (i === idx ? value : g)))
  }

  async function submit(payload: string[], action: "confirm" | "skip") {
    setSubmitting(action)
    try {
      const res = await fetch("/api/teen/onboarding/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goals: payload }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json?.success) {
        toast.error(json?.error ?? "Erreur lors de l'enregistrement")
        setSubmitting(null)
        return
      }
      router.push(nextHref)
    } catch (err) {
      console.error("Goals submit error:", err)
      toast.error("Erreur réseau")
      setSubmitting(null)
    }
  }

  function handleConfirm() {
    const cleaned = goals.map((g) => g.trim()).filter((g) => g.length > 0)

    if (cleaned.length === 0) {
      toast.warning("Écris au moins un objectif (ou passe l'étape)")
      return
    }
    submit(cleaned, "confirm")
  }

  function handleSkip() {
    submit([], "skip")
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      <div className="space-y-3 text-center">
        <p className="eyebrow tracking-[0.16em]">Étape 2 / 4 · Objectifs</p>
        <SegmentedProgress steps={4} current={1} className="mx-auto max-w-xs" />
        <h1 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
          Mes 3 <em className="font-semibold italic text-pink">objectifs</em> cette saison
        </h1>
        <p className="text-sm text-mute sm:text-base">
          On t'aidera à les atteindre avec des missions et des recommandations sur-mesure.
        </p>
      </div>

      <NivCoach
        mood="proud"
        message="Écris ce que tu veux accomplir — je transforme ça en missions et en XP."
      />

      <div className="space-y-4">
        {goals.map((g, idx) => {
          const token = TOKENS[idx]
          return (
            <StickerCard key={idx} className="gap-3 p-4 sm:p-5">
              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    "grid size-10 shrink-0 place-items-center rounded-xl border-2 border-ink text-lg",
                    token.bg,
                  )}
                  aria-hidden="true"
                >
                  {token.emoji}
                </span>
                <label
                  htmlFor={`goal-${idx}`}
                  className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-mute"
                >
                  Objectif {idx + 1}
                </label>
              </div>
              <Textarea
                id={`goal-${idx}`}
                value={g}
                onChange={(e) => update(idx, e.target.value)}
                placeholder={PLACEHOLDERS[idx]}
                maxLength={280}
                rows={2}
                className="resize-none rounded-xl border-2 border-line bg-white focus-visible:border-ink focus-visible:ring-0"
              />
              <div className="flex items-center justify-between text-xs text-mute">
                <span>{HELP[idx]}</span>
                <span className="font-mono tabular-nums">{g.length} / 280</span>
              </div>
            </StickerCard>
          )
        })}
      </div>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Button
          variant="ghost"
          size="lg"
          onClick={handleSkip}
          disabled={submitting !== null}
          className="text-mute"
        >
          {submitting === "skip" ? (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <SkipForward className="size-4" aria-hidden="true" />
          )}
          Passer cette étape
        </Button>
        <Button
          variant="pink"
          size="lg"
          onClick={handleConfirm}
          disabled={submitting !== null}
          className="min-w-40"
        >
          {submitting === "confirm" ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              Sauvegarde…
            </>
          ) : (
            "Continuer"
          )}
        </Button>
      </div>
    </div>
  )
}
