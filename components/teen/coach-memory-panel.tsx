"use client"

/**
 * #Transparency — Panneau « Ce que Niv retient de toi ».
 *
 * Section repliable dans le chat Niv. Affiche la mémoire long terme (résumé,
 * objectifs, faits) et permet à l'ado de l'effacer d'un clic (RGPD/CNDP).
 *
 * Monté dans avatar-coach-client.tsx via <CoachMemoryPanel coachName={...} />.
 * Lazy : ne fetch /api/teen/coach-memory qu'à l'ouverture.
 */

import * as React from "react"
import { Brain, Trash2, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

interface MemoryData {
  summary: string | null
  goals: Array<{ id: string; goal: string; status: string }>
  facts: Array<{ id: string; fact: string; createdAt: string | null }>
  isEmpty: boolean
}

export function CoachMemoryPanel({ coachName }: { coachName: string }) {
  const [open, setOpen] = React.useState(false)
  const [loading, setLoading] = React.useState(false)
  const [data, setData] = React.useState<MemoryData | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [confirming, setConfirming] = React.useState(false)
  const [clearing, setClearing] = React.useState(false)

  const load = React.useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/teen/coach-memory", { method: "GET" })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = (await res.json()) as MemoryData
      setData(json)
    } catch {
      setError("Impossible de charger la mémoire.")
    } finally {
      setLoading(false)
    }
  }, [])

  const handleToggle = React.useCallback(() => {
    setOpen((prev) => {
      const next = !prev
      if (next && !data && !loading) {
        queueMicrotask(load)
      }
      return next
    })
  }, [data, loading, load])

  const handleClear = React.useCallback(async () => {
    if (!confirming) {
      setConfirming(true)
      return
    }
    setClearing(true)
    setError(null)
    try {
      const res = await fetch("/api/teen/coach-memory", { method: "DELETE" })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setData({ summary: null, goals: [], facts: [], isEmpty: true })
      setConfirming(false)
    } catch {
      setError("L'effacement a échoué. Réessaie.")
    } finally {
      setClearing(false)
    }
  }, [confirming])

  return (
    <div className="mt-2" data-testid="coach-memory-panel">
      <button
        type="button"
        onClick={handleToggle}
        aria-expanded={open}
        aria-controls="coach-memory-content"
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5",
          "text-[11px] sm:text-xs font-semibold",
          "border border-ink bg-paper-2 text-ink/70 hover:text-ink",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 transition-colors",
        )}
      >
        <Brain className="h-3.5 w-3.5" aria-hidden="true" />
        <span>Ce que {coachName} retient de toi</span>
        <ChevronDown
          className={cn("h-3 w-3 transition-transform", open && "rotate-180")}
          aria-hidden="true"
        />
      </button>

      {open ? (
        <div
          id="coach-memory-content"
          role="region"
          aria-label={`Mémoire de ${coachName}`}
          className="mt-2 rounded-xl border border-ink bg-paper-2/50 p-3"
        >
          {loading ? (
            <p className="text-xs text-ink/50">Chargement…</p>
          ) : error ? (
            <p className="text-xs text-pink/90" role="alert">
              {error}
            </p>
          ) : data?.isEmpty ? (
            <p className="text-xs text-ink/50">
              {coachName} n'a rien retenu pour l'instant. Plus tu discutes, plus
              il retiendra tes préférences et objectifs — tu peux tout effacer
              ici quand tu veux.
            </p>
          ) : data ? (
            <div className="space-y-3">
              {data.summary ? (
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-mute">
                    Résumé
                  </p>
                  <p className="mt-1 text-xs text-ink/80">{data.summary}</p>
                </div>
              ) : null}

              {data.goals.length > 0 ? (
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-mute">
                    Objectifs
                  </p>
                  <ul className="mt-1 space-y-0.5">
                    {data.goals.map((g) => (
                      <li key={g.id} className="text-xs text-ink/80">
                        • {g.goal}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {data.facts.length > 0 ? (
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-mute">
                    À retenir
                  </p>
                  <ul className="mt-1 space-y-0.5">
                    {data.facts.map((f) => (
                      <li key={f.id} className="text-xs text-ink/80">
                        • {f.fact}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <div className="flex items-center justify-between gap-2 border-t border-ink pt-2">
                <p className="text-[10px] text-ink/40">
                  Tu contrôles cette mémoire. Effacer = repartir à zéro.
                </p>
                <button
                  type="button"
                  onClick={handleClear}
                  disabled={clearing}
                  aria-label="Effacer toute la mémoire de Niv"
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold",
                    "border transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
                    confirming
                      ? "border-pink bg-pink text-ink"
                      : "border-ink bg-white text-ink/70 hover:text-ink",
                  )}
                >
                  <Trash2 className="h-3 w-3" aria-hidden="true" />
                  {clearing ? "…" : confirming ? "Confirmer ?" : "Effacer"}
                </button>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
