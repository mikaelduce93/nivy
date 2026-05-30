"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

interface PendingQuiz {
  id: string
  code: string
  title: string
  subject: string
  description: string | null
  difficulty: string | null
  grade_level: string | null
  cohort_key: string | null
  language: string | null
  questions: unknown
  quality_score: number | null
  created_at: string | null
}

export function ReviewQuizRow({ quiz }: { quiz: PendingQuiz }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [showReject, setShowReject] = useState(false)
  const [showQuestions, setShowQuestions] = useState(false)
  const [reason, setReason] = useState("")
  const [error, setError] = useState<string | null>(null)

  async function approve() {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/content/review/${quiz.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve" }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(typeof j.error === "string" ? j.error : "Erreur d'approbation")
        return
      }
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  async function reject() {
    if (!reason.trim()) {
      setError("Indiquez un motif de rejet.")
      return
    }
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/content/review/${quiz.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reject", reason: reason.trim() }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(typeof j.error === "string" ? j.error : "Erreur de rejet")
        return
      }
      setShowReject(false)
      setReason("")
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  const questionCount = Array.isArray(quiz.questions) ? quiz.questions.length : 0

  return (
    <li className="rounded border border-ink bg-card p-4">
      <header className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="text-xs uppercase tracking-wide text-mute">
            {quiz.code}
          </div>
          <div className="font-semibold text-ink">{quiz.title}</div>
          {quiz.description && (
            <div className="mt-1 text-sm text-mute">{quiz.description}</div>
          )}
          <div className="mt-1 text-xs text-mute">
            Soumis le{" "}
            {quiz.created_at
              ? new Date(quiz.created_at).toLocaleString("fr-FR")
              : "?"}
          </div>
        </div>
        <span className="rounded bg-gold/20 px-2 py-0.5 text-xs text-gold">
          En attente
        </span>
      </header>

      <div className="mb-3 flex flex-wrap gap-2 text-xs">
        <Tag label="Subject" value={quiz.subject} />
        {quiz.difficulty && <Tag label="Difficulty" value={quiz.difficulty} />}
        {quiz.grade_level && <Tag label="Grade" value={quiz.grade_level} />}
        {quiz.language && <Tag label="Lang" value={quiz.language} />}
        {quiz.cohort_key && <Tag label="Cohort" value={quiz.cohort_key} />}
        {quiz.quality_score != null && (
          <Tag label="Quality" value={String(quiz.quality_score)} />
        )}
        <Tag label="Questions" value={String(questionCount)} />
      </div>

      <button
        type="button"
        onClick={() => setShowQuestions((v) => !v)}
        className="mb-3 text-xs text-teal underline-offset-4 hover:text-teal hover:underline"
      >
        {showQuestions ? "Masquer" : "Afficher"} le JSON des questions
      </button>

      {showQuestions && (
        <pre className="mb-3 max-h-96 overflow-auto rounded bg-background p-3 text-xs text-ink-2">
          {JSON.stringify(quiz.questions, null, 2)}
        </pre>
      )}

      {showReject && (
        <div className="mb-3">
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Motif de rejet pédagogique (obligatoire)"
            rows={2}
            maxLength={1000}
            className="w-full rounded border border-ink bg-background p-2 text-sm text-ink"
          />
        </div>
      )}

      {error && <p className="mb-2 text-xs text-destructive">{error}</p>}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={approve}
          className="rounded bg-lime px-3 py-1 text-sm text-ink hover:bg-lime disabled:opacity-50"
        >
          Approuver
        </button>
        {!showReject ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => setShowReject(true)}
            className="rounded bg-destructive px-3 py-1 text-sm text-ink hover:bg-destructive disabled:opacity-50"
          >
            Rejeter
          </button>
        ) : (
          <>
            <button
              type="button"
              disabled={busy}
              onClick={reject}
              className="rounded bg-destructive px-3 py-1 text-sm text-ink hover:bg-destructive disabled:opacity-50"
            >
              Confirmer le rejet
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setShowReject(false)
                setReason("")
                setError(null)
              }}
              className="rounded bg-muted px-3 py-1 text-sm text-ink hover:bg-muted disabled:opacity-50"
            >
              Annuler
            </button>
          </>
        )}
      </div>
    </li>
  )
}

function Tag({ label, value }: { label: string; value: string }) {
  return (
    <span className="rounded border border-ink bg-background px-2 py-0.5 text-ink-2">
      <span className="text-mute">{label}:</span> {value}
    </span>
  )
}
