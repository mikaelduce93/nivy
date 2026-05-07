"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { Loader2, SkipForward, Sparkles } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"

export interface InterestTaxonomyRow {
  tag: string
  category: string
  display_fr: string | null
  display_en: string | null
  icon: string | null
}

interface InterestPickerProps {
  /** Full interest_taxonomy where is_active=true. */
  taxonomy: InterestTaxonomyRow[]
  /** Tags the teen has already declared (preselected). */
  initialSelected?: string[]
  /** Where to go after confirm/skip. */
  nextHref?: string
  minSelected?: number
  maxSelected?: number
}

const CATEGORY_LABELS: Record<string, string> = {
  sport: "Sport",
  music: "Musique",
  art: "Art",
  tech: "Tech",
  science: "Sciences",
  academic: "Études",
  lifestyle: "Lifestyle",
  food: "Food",
  nature: "Nature",
  social: "Social",
  crafts: "DIY",
  travel: "Voyage",
  reading: "Lecture",
  writing: "Écriture",
  cinema: "Cinéma",
  podcasts: "Podcasts",
  media: "Médias",
}

export function InterestPicker({
  taxonomy,
  initialSelected = [],
  nextHref = "/onboarding/goals",
  minSelected = 5,
  maxSelected = 10,
}: InterestPickerProps) {
  const router = useRouter()
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(initialSelected)
  )
  const [submitting, setSubmitting] = useState<"confirm" | "skip" | null>(null)

  const grouped = useMemo(() => {
    const map = new Map<string, InterestTaxonomyRow[]>()
    for (const row of taxonomy) {
      const list = map.get(row.category) ?? []
      list.push(row)
      map.set(row.category, list)
    }
    // Stable category order: by total count desc, then alpha
    return Array.from(map.entries()).sort(([a, la], [b, lb]) => {
      if (lb.length !== la.length) return lb.length - la.length
      return a.localeCompare(b)
    })
  }, [taxonomy])

  function toggle(tag: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(tag)) {
        next.delete(tag)
      } else {
        if (next.size >= maxSelected) {
          toast.warning(`Tu peux choisir au maximum ${maxSelected} centres d'intérêt`)
          return prev
        }
        next.add(tag)
      }
      return next
    })
  }

  async function submit(tags: string[], action: "confirm" | "skip") {
    setSubmitting(action)
    try {
      const res = await fetch("/api/teen/onboarding/interests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tags }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json?.success) {
        toast.error(json?.error ?? "Erreur lors de l'enregistrement")
        setSubmitting(null)
        return
      }
      router.push(nextHref)
    } catch (err) {
      console.error("Interest submit error:", err)
      toast.error("Erreur réseau")
      setSubmitting(null)
    }
  }

  function handleConfirm() {
    if (selected.size < minSelected) {
      toast.warning(`Choisis au moins ${minSelected} centres d'intérêt`)
      return
    }
    submit(Array.from(selected), "confirm")
  }

  function handleSkip() {
    submit([], "skip")
  }

  const count = selected.size
  const enough = count >= minSelected

  return (
    <div className="w-full max-w-3xl mx-auto space-y-6">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold">
          <Sparkles className="w-3.5 h-3.5" />
          Étape Découverte
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
          Qu'est-ce qui te fait vibrer ?
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Choisis entre {minSelected} et {maxSelected} centres d'intérêt. On personnalisera ton flux.
        </p>
      </div>

      <Card className="p-4 sm:p-6">
        <div className="space-y-6">
          {grouped.map(([category, items]) => (
            <section key={category} aria-labelledby={`cat-${category}`}>
              <h2
                id={`cat-${category}`}
                className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3"
              >
                {CATEGORY_LABELS[category] ?? category}
              </h2>
              <div className="flex flex-wrap gap-2">
                {items.map((row) => {
                  const isOn = selected.has(row.tag)
                  return (
                    <motion.button
                      key={row.tag}
                      type="button"
                      whileTap={{ scale: 0.95 }}
                      onClick={() => toggle(row.tag)}
                      aria-pressed={isOn}
                      className={cn(
                        "inline-flex items-center gap-1.5 px-3 py-2 rounded-full border text-sm font-medium",
                        "transition-all duration-150 active:scale-95 select-none",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
                        isOn
                          ? "bg-primary text-primary-foreground border-primary shadow-sm shadow-primary/30"
                          : "bg-background hover:bg-muted border-border text-foreground"
                      )}
                    >
                      {row.icon ? <span aria-hidden>{row.icon}</span> : null}
                      <span>{row.display_fr ?? row.display_en ?? row.tag}</span>
                    </motion.button>
                  )
                })}
              </div>
            </section>
          ))}
        </div>
      </Card>

      <div className="sticky bottom-0 z-10 -mx-4 px-4 py-4 bg-gradient-to-t from-background via-background to-transparent">
        <div className="max-w-3xl mx-auto flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3">
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

          <div className="flex items-center gap-3">
            <span
              className={cn(
                "text-sm font-semibold tabular-nums",
                enough ? "text-primary" : "text-muted-foreground"
              )}
              aria-live="polite"
            >
              {count} / {maxSelected}
            </span>
            <Button
              size="lg"
              onClick={handleConfirm}
              disabled={!enough || submitting !== null}
              className="min-w-40"
            >
              {submitting === "confirm" ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Sauvegarde…
                </>
              ) : (
                <>
                  Continuer
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
