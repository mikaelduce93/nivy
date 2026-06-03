"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, SkipForward } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { StickerCard } from "@/components/ui/sticker-card"
import { SegmentedProgress } from "@/components/ui/progress"
import { NivCoach, NivEmpty } from "@/components/brand"
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
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <div className="space-y-3 text-center">
        <p className="eyebrow tracking-[0.16em]">Étape 1 / 4 · Découverte</p>
        <SegmentedProgress steps={4} current={0} className="mx-auto max-w-xs" />
        <h1 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
          Qu'est-ce qui te fait{" "}
          <em className="font-semibold italic text-pink">vibrer</em> ?
        </h1>
        <p className="text-sm text-mute sm:text-base">
          Choisis entre {minSelected} et {maxSelected} centres d'intérêt. On personnalisera ton flux.
        </p>
      </div>

      <NivCoach
        mood="hype"
        message="Dis-moi ce qui te branche — je te construis un flux rien qu'à toi."
      />

      {grouped.length === 0 ? (
        <NivEmpty
          title="Catalogue indisponible"
          description="On n'a pas pu charger les centres d'intérêt. Tu peux passer cette étape et y revenir plus tard."
        />
      ) : (
        <StickerCard className="p-4 sm:p-6">
          <div className="space-y-6">
            {grouped.map(([category, items]) => (
              <section key={category} aria-labelledby={`cat-${category}`}>
                <h2
                  id={`cat-${category}`}
                  className="mb-3 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-mute"
                >
                  {CATEGORY_LABELS[category] ?? category}
                </h2>
                <div className="flex flex-wrap gap-2">
                  {items.map((row) => {
                    const isOn = selected.has(row.tag)
                    return (
                      <button
                        key={row.tag}
                        type="button"
                        onClick={() => toggle(row.tag)}
                        aria-pressed={isOn}
                        className={cn(
                          "inline-flex select-none items-center gap-1.5 rounded-full border-2 px-3 py-2 text-sm font-medium transition-all duration-150",
                          "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-pink/40",
                          isOn
                            ? "-translate-x-0.5 -translate-y-0.5 border-ink bg-ink text-paper shadow-stkr-pink motion-reduce:translate-x-0 motion-reduce:translate-y-0"
                            : "border-ink bg-white text-ink hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-stkr-sm motion-reduce:translate-x-0 motion-reduce:translate-y-0"
                        )}
                      >
                        {row.icon ? <span aria-hidden>{row.icon}</span> : null}
                        <span>{row.display_fr ?? row.display_en ?? row.tag}</span>
                      </button>
                    )
                  })}
                </div>
              </section>
            ))}
          </div>
        </StickerCard>
      )}

      <div className="sticky bottom-0 z-10 -mx-4 bg-gradient-to-t from-paper via-paper to-transparent px-4 py-4">
        <div className="mx-auto flex max-w-3xl flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
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

          <div className="flex items-center gap-3">
            <span
              className={cn(
                "font-mono text-sm font-bold tabular-nums",
                enough ? "text-pink" : "text-mute"
              )}
              aria-live="polite"
            >
              {count} / {maxSelected}
            </span>
            <Button
              variant="pink"
              size="lg"
              onClick={handleConfirm}
              disabled={!enough || submitting !== null}
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
      </div>
    </div>
  )
}
