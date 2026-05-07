"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, SkipForward, Target } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

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
    const cleaned = goals
      .map((g) => g.trim())
      .filter((g) => g.length > 0)

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
    <div className="w-full max-w-2xl mx-auto space-y-6">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold">
          <Target className="w-3.5 h-3.5" />
          Étape Objectifs
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
          Mes 3 objectifs cette saison
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          On t'aidera à les atteindre avec des missions et des recommandations sur-mesure.
        </p>
      </div>

      <Card className="p-4 sm:p-6">
        <div className="space-y-5">
          {goals.map((g, idx) => (
            <div key={idx} className="space-y-1.5">
              <Label htmlFor={`goal-${idx}`} className="font-semibold">
                Objectif {idx + 1}
              </Label>
              <Textarea
                id={`goal-${idx}`}
                value={g}
                onChange={(e) => update(idx, e.target.value)}
                placeholder={PLACEHOLDERS[idx]}
                maxLength={280}
                rows={2}
                className="resize-none"
              />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{HELP[idx]}</span>
                <span className="tabular-nums">{g.length} / 280</span>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3">
        <Button
          variant="ghost"
          size="lg"
          onClick={handleSkip}
          disabled={submitting !== null}
          className="text-muted-foreground"
        >
          {submitting === "skip" ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <SkipForward className="w-4 h-4" />
          )}
          Passer cette étape
        </Button>
        <Button
          size="lg"
          onClick={handleConfirm}
          disabled={submitting !== null}
          className="min-w-40"
        >
          {submitting === "confirm" ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Sauvegarde…
            </>
          ) : (
            <>Continuer</>
          )}
        </Button>
      </div>
    </div>
  )
}
