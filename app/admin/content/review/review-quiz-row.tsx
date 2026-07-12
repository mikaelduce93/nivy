"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { StatusBadge } from "@/components/ui/status-badge"
import type { QuizQuestion } from "@/lib/quiz/schema"

export interface PendingQuiz {
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

/**
 * Tolerant parse of the questions JSONB into the runner shape
 * (lib/quiz/schema.ts QuizQuestion). Returns null when ANY question deviates —
 * the row then falls back to the raw JSON <pre> so the reviewer still sees
 * exactly what would ship.
 */
function parseQuestions(raw: unknown): QuizQuestion[] | null {
  if (!Array.isArray(raw) || raw.length === 0) return null
  const out: QuizQuestion[] = []
  for (const item of raw) {
    if (!item || typeof item !== "object") return null
    const q = item as Record<string, unknown>
    if (
      typeof q.question !== "string" ||
      !Array.isArray(q.options) ||
      q.options.length < 2 ||
      q.options.some((o) => typeof o !== "string") ||
      typeof q.correct !== "number" ||
      !Number.isInteger(q.correct) ||
      q.correct < 0 ||
      q.correct >= q.options.length
    ) {
      return null
    }
    out.push({
      question: q.question,
      options: q.options as string[],
      correct: q.correct,
      explanation: typeof q.explanation === "string" ? q.explanation : undefined,
    })
  }
  return out
}

export function ReviewQuizRow({
  quiz,
  selected,
  onToggleSelected,
}: {
  quiz: PendingQuiz
  /** Batch-selection state, wired by <ReviewQueue>. Omit to hide the checkbox. */
  selected?: boolean
  onToggleSelected?: () => void
}) {
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
  const parsed = parseQuestions(quiz.questions)

  return (
    <li className="flex flex-col rounded-2xl border-2 border-ink bg-white text-ink shadow-stkr-md p-4">
      <header className="mb-3 flex flex-wrap items-start justify-between gap-2">
        {onToggleSelected && (
          <Checkbox
            checked={selected === true}
            onCheckedChange={onToggleSelected}
            disabled={busy}
            aria-label={`Sélectionner « ${quiz.title} »`}
            className="mt-1"
          />
        )}
        <div className="min-w-0 flex-1">
          <div className="font-mono text-xs uppercase tracking-[0.16em] text-mute">
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
        <StatusBadge
          variant="pending"
          label="En attente"
          size="sm"
          className="font-mono uppercase tracking-[0.16em]"
        />
      </header>

      <div className="mb-3 flex flex-wrap gap-2 text-xs">
        <Tag label="Matière" value={quiz.subject} />
        {quiz.difficulty && <Tag label="Difficulté" value={quiz.difficulty} />}
        {quiz.grade_level && <Tag label="Niveau" value={quiz.grade_level} />}
        {quiz.language && <Tag label="Langue" value={quiz.language} />}
        {quiz.cohort_key && <Tag label="Cohorte" value={quiz.cohort_key} />}
        {quiz.quality_score != null && (
          <Tag label="Qualité" value={String(quiz.quality_score)} />
        )}
        <Tag label="Questions" value={String(questionCount)} />
      </div>

      <button
        type="button"
        onClick={() => setShowQuestions((v) => !v)}
        className="mb-3 text-xs text-teal underline-offset-4 hover:text-teal hover:underline"
      >
        {showQuestions ? "Masquer" : "Afficher"} les questions
      </button>

      {showQuestions &&
        (parsed ? (
          <div className="mb-3 max-h-96 space-y-3 overflow-auto rounded-lg border-2 border-ink bg-paper p-3">
            {parsed.map((q, i) => (
              <div key={i} className="rounded-lg border-2 border-ink bg-white p-3">
                <p className="text-sm font-semibold text-ink">
                  {i + 1}. {q.question}
                </p>
                <ul className="mt-2 space-y-1">
                  {q.options.map((opt, j) => (
                    <li
                      key={j}
                      className={`flex items-start gap-2 rounded-md px-2 py-1 text-sm ${
                        j === q.correct
                          ? "border-2 border-ink bg-lime/30 font-medium text-ink"
                          : "text-ink-2"
                      }`}
                    >
                      <span className="font-mono text-xs text-mute">
                        {String.fromCharCode(65 + j)}.
                      </span>
                      <span className="min-w-0 flex-1">{opt}</span>
                      {j === q.correct && (
                        <span className="shrink-0 font-mono text-[10px] uppercase tracking-[0.16em] text-ink">
                          Bonne réponse
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
                {q.explanation && (
                  <p className="mt-2 text-xs text-mute">
                    <span className="font-mono uppercase tracking-[0.16em]">Explication</span>{" "}
                    {q.explanation}
                  </p>
                )}
              </div>
            ))}
          </div>
        ) : (
          // Malformed / unexpected shape: show the raw payload — the reviewer
          // must still see exactly what would ship (and probably reject it).
          <pre className="mb-3 max-h-96 overflow-auto rounded-lg border-2 border-ink bg-paper p-3 text-xs text-ink-2 font-mono">
            {JSON.stringify(quiz.questions, null, 2)}
          </pre>
        ))}

      {showReject && (
        <div className="mb-3">
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Motif de rejet pédagogique (obligatoire)"
            rows={2}
            maxLength={1000}
            className="w-full rounded-lg border-2 border-ink bg-paper p-2 text-sm text-ink"
          />
        </div>
      )}

      {error && <p className="mb-2 text-xs text-destructive">{error}</p>}

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant="lime"
          disabled={busy}
          onClick={approve}
        >
          Approuver
        </Button>
        {!showReject ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="text-destructive"
            disabled={busy}
            onClick={() => setShowReject(true)}
          >
            Rejeter
          </Button>
        ) : (
          <>
            <Button
              type="button"
              size="sm"
              variant="destructive"
              disabled={busy}
              onClick={reject}
            >
              Confirmer le rejet
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
    </li>
  )
}

function Tag({ label, value }: { label: string; value: string }) {
  return (
    <span className="rounded-md border-2 border-ink bg-paper px-2 py-0.5 font-mono text-ink-2">
      <span className="uppercase tracking-[0.16em] text-mute">{label}</span> {value}
    </span>
  )
}
