"use client"

/**
 * G3-C — PO tool: live DAILY_ quizzes with no human-approval trace.
 *
 * Before the 2026-07-11 fail-closed fix (G1), the daily cron published
 * AI-generated quizzes straight to is_active=true — those rows never went
 * through the review queue. This section lists them and offers a BULK
 * DEACTIVATE (batch endpoint, action 'deactivate'): flipping is_active=false
 * puts them back into the pending review queue above. Nothing is automatic —
 * the decision belongs to the PO, hence the explicit confirm step.
 *
 * Which rows land here is decided server-side (page.tsx): active DAILY_
 * quizzes MINUS those with an audit_log 'content.review.approve' entry.
 * See the page for the heuristic's documented limits.
 */
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"

const MAX_BATCH = 200 // mirror of the endpoint guard

export interface LegacyActiveQuiz {
  id: string
  code: string
  title: string
  subject: string
  created_at: string | null
}

export function LegacyActiveQuizzes({ items }: { items: LegacyActiveQuiz[] }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const ids = items.map((i) => i.id)
  const allSelected = ids.length > 0 && ids.every((id) => selected.has(id))

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
    setConfirming(false)
  }

  async function deactivate() {
    const batchIds = ids.filter((id) => selected.has(id))
    if (batchIds.length === 0) return
    if (batchIds.length > MAX_BATCH) {
      setError(`Maximum ${MAX_BATCH} éléments par action groupée.`)
      return
    }
    setBusy(true)
    setError(null)
    setFeedback(null)
    try {
      const res = await fetch("/api/admin/content/review/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target: "quiz", action: "deactivate", ids: batchIds }),
      })
      const j = (await res.json().catch(() => ({}))) as {
        error?: unknown
        succeeded?: string[]
        failed?: Array<{ id: string; error: string }>
      }
      if (!res.ok) {
        setError(typeof j.error === "string" ? j.error : "Erreur de désactivation")
        return
      }
      const ok = Array.isArray(j.succeeded) ? j.succeeded.length : 0
      const ko = Array.isArray(j.failed) ? j.failed.length : 0
      setFeedback(
        `${ok} quiz désactivé(s) — renvoyés dans la file de revue.${
          ko > 0 ? ` ${ko} échec(s).` : ""
        }`,
      )
      setSelected(new Set())
      setConfirming(false)
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  if (items.length === 0) {
    return (
      <p className="text-sm text-mute">
        Aucun quiz IA actif sans trace d'approbation humaine.
      </p>
    )
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="mb-3 text-xs text-teal underline-offset-4 hover:text-teal hover:underline"
      >
        {open ? "Masquer" : "Afficher"} la liste ({items.length})
      </button>

      {open && (
        <div className="rounded-2xl border-2 border-ink bg-white p-3 text-ink shadow-stkr-md">
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <label
              htmlFor="select-all-legacy"
              className="flex items-center gap-2 text-sm font-medium"
            >
              <Checkbox
                id="select-all-legacy"
                checked={allSelected}
                onCheckedChange={() => {
                  setSelected(allSelected ? new Set() : new Set(ids))
                  setConfirming(false)
                }}
                disabled={busy}
              />
              Tout sélectionner
            </label>
            <span className="font-mono text-xs uppercase tracking-[0.16em] text-mute">
              {selected.size} / {ids.length}
            </span>
            <div className="flex flex-wrap gap-2 sm:ml-auto">
              {!confirming ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="text-destructive"
                  disabled={busy || selected.size === 0}
                  onClick={() => setConfirming(true)}
                >
                  Désactiver la sélection
                </Button>
              ) : (
                <>
                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    disabled={busy}
                    onClick={deactivate}
                  >
                    Confirmer la désactivation ({selected.size})
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={busy}
                    onClick={() => setConfirming(false)}
                  >
                    Annuler
                  </Button>
                </>
              )}
            </div>
          </div>

          {feedback && <p className="mb-2 text-xs text-teal">{feedback}</p>}
          {error && <p className="mb-2 text-xs text-destructive">{error}</p>}

          <ul className="divide-y divide-ink/10">
            {items.map((q) => (
              <li key={q.id} className="flex flex-wrap items-center gap-2 py-2">
                <Checkbox
                  checked={selected.has(q.id)}
                  onCheckedChange={() => toggle(q.id)}
                  disabled={busy}
                  aria-label={`Sélectionner « ${q.title} »`}
                />
                <span className="font-mono text-xs uppercase tracking-[0.16em] text-mute">
                  {q.code}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm font-medium">
                  {q.title}
                </span>
                <span className="text-xs text-mute">{q.subject}</span>
                <span className="text-xs text-mute">
                  {q.created_at
                    ? new Date(q.created_at).toLocaleDateString("fr-FR")
                    : "?"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
