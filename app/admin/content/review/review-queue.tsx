"use client"

/**
 * G3-C — Selectable review queue with bulk Approve / Reject.
 *
 * Wraps the unit rows (<ReviewQuizRow> / <ReviewMissionRow>) with checkbox
 * selection ("tout sélectionner" included) and grouped actions that hit
 * POST /api/admin/content/review/batch — built for the 100+ seeded quizzes
 * landing with the G3-A wave, where unit-only review does not scale.
 *
 * Bulk reject shares ONE reason for the whole selection (logged per row in
 * audit_log by the endpoint). Per-id failures returned by the endpoint are
 * summarized inline; unit actions on each row keep working independently.
 */
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { ReviewQuizRow, type PendingQuiz } from "./review-quiz-row"
import { ReviewMissionRow, type PendingMission } from "./review-mission-row"

const MAX_BATCH = 200 // mirror of the endpoint guard

type ReviewQueueProps =
  | { target: "quiz"; items: PendingQuiz[] }
  | { target: "mission"; items: PendingMission[] }

export function ReviewQueue(props: ReviewQueueProps) {
  const router = useRouter()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState(false)
  const [showReject, setShowReject] = useState(false)
  const [reason, setReason] = useState("")
  const [feedback, setFeedback] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const ids = props.items.map((i) => i.id)
  const allSelected = ids.length > 0 && ids.every((id) => selected.has(id))

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(ids))
  }

  async function runBatch(action: "approve" | "reject") {
    const batchIds = ids.filter((id) => selected.has(id))
    if (batchIds.length === 0) return
    if (batchIds.length > MAX_BATCH) {
      setError(`Maximum ${MAX_BATCH} éléments par action groupée.`)
      return
    }
    if (action === "reject" && !reason.trim()) {
      setError("Indiquez un motif de rejet (appliqué à toute la sélection).")
      return
    }
    setBusy(true)
    setError(null)
    setFeedback(null)
    try {
      const res = await fetch("/api/admin/content/review/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          target: props.target,
          action,
          ids: batchIds,
          ...(action === "reject" ? { reason: reason.trim() } : {}),
        }),
      })
      const j = (await res.json().catch(() => ({}))) as {
        error?: unknown
        succeeded?: string[]
        failed?: Array<{ id: string; error: string }>
      }
      if (!res.ok) {
        setError(typeof j.error === "string" ? j.error : "Erreur du traitement en masse")
        return
      }
      const ok = Array.isArray(j.succeeded) ? j.succeeded.length : 0
      const failures = Array.isArray(j.failed) ? j.failed : []
      const verb = action === "approve" ? "approuvé(s)" : "rejeté(s)"
      setFeedback(
        `${ok} ${verb}${
          failures.length > 0
            ? ` · ${failures.length} échec(s) : ${failures
                .slice(0, 3)
                .map((f) => f.error)
                .join(", ")}${failures.length > 3 ? "…" : ""}`
            : ""
        }`,
      )
      setSelected(new Set())
      setShowReject(false)
      setReason("")
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  if (props.items.length === 0) return null

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-3 rounded-2xl border-2 border-ink bg-white p-3 text-ink shadow-stkr-md">
        <label
          htmlFor={`select-all-${props.target}`}
          className="flex items-center gap-2 text-sm font-medium"
        >
          <Checkbox
            id={`select-all-${props.target}`}
            checked={allSelected}
            onCheckedChange={toggleAll}
            disabled={busy}
          />
          Tout sélectionner
        </label>
        <span className="font-mono text-xs uppercase tracking-[0.16em] text-mute">
          {selected.size} / {ids.length}
        </span>
        <div className="flex flex-wrap gap-2 sm:ml-auto">
          <Button
            type="button"
            size="sm"
            variant="lime"
            disabled={busy || selected.size === 0}
            onClick={() => runBatch("approve")}
          >
            Approuver la sélection
          </Button>
          {!showReject ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="text-destructive"
              disabled={busy || selected.size === 0}
              onClick={() => setShowReject(true)}
            >
              Rejeter la sélection
            </Button>
          ) : (
            <>
              <Button
                type="button"
                size="sm"
                variant="destructive"
                disabled={busy}
                onClick={() => runBatch("reject")}
              >
                Confirmer le rejet ({selected.size})
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={() => {
                  setShowReject(false)
                  setReason("")
                  setError(null)
                }}
              >
                Annuler
              </Button>
            </>
          )}
        </div>
        {showReject && (
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Motif de rejet appliqué à toute la sélection (obligatoire)"
            rows={2}
            maxLength={1000}
            className="w-full rounded-lg border-2 border-ink bg-paper p-2 text-sm text-ink"
          />
        )}
      </div>

      {feedback && <p className="mb-2 text-xs text-teal">{feedback}</p>}
      {error && <p className="mb-2 text-xs text-destructive">{error}</p>}

      <ul className="space-y-3">
        {props.target === "quiz"
          ? props.items.map((q) => (
              <ReviewQuizRow
                key={q.id}
                quiz={q}
                selected={selected.has(q.id)}
                onToggleSelected={() => toggle(q.id)}
              />
            ))
          : props.items.map((m) => (
              <ReviewMissionRow
                key={m.id}
                mission={m}
                selected={selected.has(m.id)}
                onToggleSelected={() => toggle(m.id)}
              />
            ))}
      </ul>
    </div>
  )
}
