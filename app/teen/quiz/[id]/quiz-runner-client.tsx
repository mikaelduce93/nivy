"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Brain, Zap, ArrowRight, Clock, X, CheckCircle2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { SegmentedProgress } from "@/components/ui/progress"
import { StickerCard } from "@/components/ui/sticker-card"
import { Niv, DarkSurface } from "@/components/brand"
import { Confetti } from "@/components/ui/effects/confetti"
import type { QuizPublic } from "@/lib/quiz/schema"
import { getCategoryMeta } from "@/lib/quiz/catalog"
import { markPushPromptEligible } from "@/components/teen/push-permission-prompt"

interface SubmitResponse {
  success: true
  attempt: {
    id: string
    score: number
    passed: boolean
    correctCount: number
    totalQuestions: number
    xpEarned: number
    // Anti-farm (audit 2026-07-11 Q4) : l'XP n'est crédité qu'à la première
    // réussite — un rejeu réussi renvoie xpAwarded=false + alreadyRewarded=true.
    xpAwarded?: boolean
    alreadyRewarded?: boolean
    // J0 : la correction (correctAnswer) et l'explication arrivent ICI, dans
    // la réponse du submit — le payload initial du quiz est strippé
    // (`correct`/`explanation` absents, spec G4 §3.0 / migration 180).
    results: Array<{
      question: string
      userAnswer: number
      correctAnswer: number
      isCorrect: boolean
      explanation?: string | null
    }>
  }
}

export function QuizRunnerClient({ quiz }: { quiz: QuizPublic }) {
  const router = useRouter()
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<number[]>(() =>
    Array(quiz.questions.length).fill(-1),
  )
  const [startTime] = useState(() => Date.now())
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<SubmitResponse["attempt"] | null>(null)

  const totalQuestions = quiz.questions.length
  const currentQuestion = quiz.questions[currentIndex]
  const isLast = currentIndex === totalQuestions - 1
  const allAnswered = answers.every((a) => a >= 0)
  const meta = useMemo(() => getCategoryMeta(quiz.subject), [quiz.subject])

  // Optional time limit countdown
  const timeLimitSec = (quiz.time_limit_minutes ?? 0) * 60
  const [secondsLeft, setSecondsLeft] = useState(timeLimitSec)
  useEffect(() => {
    if (!timeLimitSec || result) return
    const tick = setInterval(() => {
      setSecondsLeft((s) => Math.max(0, s - 1))
    }, 1000)
    return () => clearInterval(tick)
  }, [timeLimitSec, result])

  // TICKET-009 — fire "quiz started" once when the runner mounts.
  // This is what burns the no-repeat slot in quiz_seen_history, instead of
  // the previous behaviour where merely loading the hub burned it.
  // Fire-and-forget: a network failure should not block the run.
  useEffect(() => {
    let cancelled = false
    void fetch(`/api/teen/quiz/${quiz.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    }).catch(() => {
      if (!cancelled) {
        // Swallow — start tracking is best-effort.
      }
    })
    return () => {
      cancelled = true
    }
  }, [quiz.id])

  function selectAnswer(idx: number) {
    setAnswers((prev) => {
      const next = [...prev]
      next[currentIndex] = idx
      return next
    })
  }

  async function submit() {
    if (submitting) return
    setSubmitting(true)
    setError(null)
    try {
      const timeSpentSeconds = Math.round((Date.now() - startTime) / 1000)
      const res = await fetch("/api/teen/quiz/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quizId: quiz.id,
          answers: answers.map((a) => (a < 0 ? 0 : a)),
          timeSpentSeconds,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data?.error ?? "Erreur lors de l'envoi du quiz")
        setSubmitting(false)
        return
      }
      const attempt = (data as SubmitResponse).attempt
      setResult(attempt)
      // V1.2 Wave 3 U3 — mark push prompt eligible after a *passing* quiz.
      // The deferred prompt mounted in app/teen/layout.tsx will pick this up
      // via the custom event + localStorage flag (no nag if already
      // granted/denied/dismissed).
      if (attempt?.passed) {
        markPushPromptEligible()
      }
      router.refresh()
    } catch {
      setError("Erreur réseau — réessaie")
    } finally {
      setSubmitting(false)
    }
  }

  /* -------------------- Result screen -------------------- */
  if (result) {
    return (
      <div className="min-h-screen pb-32 pt-6" data-testid="quiz-result-screen">
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <Link href="/teen/quiz" className="font-mono text-sm text-mute hover:text-ink">
              ← Retour aux quiz
            </Link>
          </div>

          {/* Moment de pic — surface sombre ponctuelle + Niv + confettis */}
          <DarkSurface tone={result.passed ? "lime" : "coral"} shadow className="p-8 text-center">
            {result.passed && <Confetti trigger palette="levelup" />}
            <Niv
              mood={result.passed ? "hype" : "proud"}
              float={result.passed}
              size={120}
              className="mx-auto"
            />
            <p className="eyebrow mt-4 tracking-[0.16em] text-paper/60">
              {result.passed ? "Réussi" : "Continue comme ça"}
            </p>
            <h1 className="mt-2 font-display text-4xl sm:text-5xl font-extrabold tracking-tight text-paper break-words">
              {result.passed ? "Bravo !" : "Pas mal..."}
            </h1>
            <p className="mt-3 text-paper/70">
              Tu as répondu correctement à {result.correctCount} / {result.totalQuestions} questions
            </p>
            <div className="mx-auto mt-6 grid max-w-md grid-cols-2 gap-4">
              <div className="rounded-2xl border-2 border-paper/20 bg-paper/5 p-4">
                <div
                  className={cn(
                    "font-display text-4xl sm:text-5xl font-extrabold leading-none tabular-nums",
                    result.passed ? "text-lime" : "text-coral",
                  )}
                >
                  {result.score}%
                </div>
                <div className="mt-2 font-mono text-[10px] uppercase tracking-[0.12em] text-paper/60">
                  Score
                </div>
              </div>
              <div className="rounded-2xl border-2 border-paper/20 bg-paper/5 p-4">
                {result.passed && result.alreadyRewarded ? (
                  <>
                    {/* Rejeu d'un quiz déjà réussi : entraînement, pas d'XP */}
                    <div className="grid min-h-12 place-items-center font-display text-xl sm:text-2xl font-extrabold leading-tight text-paper">
                      Déjà réussi
                    </div>
                    <div className="mt-2 font-mono text-[10px] uppercase tracking-[0.12em] text-paper/60">
                      Entraînement — pas d&apos;XP
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center justify-center gap-1 font-display text-4xl sm:text-5xl font-extrabold leading-none tabular-nums text-gold">
                      <Zap className="size-6 sm:size-7" aria-hidden="true" />+{result.xpEarned}
                    </div>
                    <div className="mt-2 font-mono text-[10px] uppercase tracking-[0.12em] text-paper/60">
                      XP gagnés
                    </div>
                  </>
                )}
              </div>
            </div>
          </DarkSurface>

          {/* Per-question breakdown */}
          <div className="space-y-3">
            <p className="eyebrow tracking-[0.16em]">Détail</p>
            {result.results.map((r, i) => (
              <StickerCard
                key={i}
                className={cn("p-4", r.isCorrect ? "bg-success-soft" : "border-coral")}
              >
                <div className="flex items-start gap-3">
                  <span
                    className={cn(
                      "grid size-7 shrink-0 place-items-center rounded-full border-2 border-ink",
                      r.isCorrect ? "bg-lime" : "bg-coral",
                    )}
                  >
                    {r.isCorrect ? (
                      <CheckCircle2 className="size-4 text-ink" aria-hidden="true" />
                    ) : (
                      <X className="size-4 text-ink" strokeWidth={3} aria-hidden="true" />
                    )}
                  </span>
                  <div className="flex-1">
                    <p className="font-medium text-ink">{r.question}</p>
                    {!r.isCorrect && quiz.questions[i] && (
                      <p className="text-sm text-mute mt-1">
                        Bonne réponse : <strong>{quiz.questions[i].options[r.correctAnswer]}</strong>
                      </p>
                    )}
                    {r.explanation && (
                      <p className="text-sm text-mute mt-1">{r.explanation}</p>
                    )}
                  </div>
                </div>
              </StickerCard>
            ))}
          </div>

          <div className="flex gap-3">
            <Button asChild variant="outline" className="flex-1">
              <Link href="/teen/quiz">Retour</Link>
            </Button>
            <Button asChild variant="pink" className="flex-1">
              <Link href="/teen/quiz/history">Voir l'historique</Link>
            </Button>
          </div>
        </div>
      </div>
    )
  }

  /* -------------------- Run screen -------------------- */
  return (
    <div className="min-h-screen pb-32 pt-6" data-testid="quiz-runner-screen">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Link href="/teen/quiz" className="font-mono text-sm text-mute hover:text-ink">
            ← Quitter
          </Link>
          {timeLimitSec > 0 && (
            <div className="flex items-center gap-2 font-mono text-sm text-mute">
              <Clock className="size-4" aria-hidden="true" />
              <span className="tabular-nums">
                {Math.floor(secondsLeft / 60)}:
                {(secondsLeft % 60).toString().padStart(2, "0")}
              </span>
            </div>
          )}
        </div>

        {/* Title + progress */}
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="grid size-12 place-items-center rounded-2xl border-2 border-ink bg-paper-2">
              <Brain className="size-6 text-ink" aria-hidden="true" />
            </span>
            <div>
              <h1 className="font-display text-2xl font-extrabold tracking-tight">{quiz.title}</h1>
              <p className="font-mono text-sm text-mute">
                {meta.name} · Question {currentIndex + 1} / {totalQuestions}
              </p>
            </div>
          </div>
          <SegmentedProgress steps={totalQuestions} current={currentIndex} size="md" />
        </div>

        {/* Question */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-ink">{currentQuestion.question}</h2>
          <div className="space-y-2" data-testid="quiz-options">
            {currentQuestion.options.map((option, idx) => {
              const isSelected = answers[currentIndex] === idx
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => selectAnswer(idx)}
                  className={cn(
                    "w-full rounded-2xl border-2 border-ink p-4 text-left transition-all duration-150 ease-out",
                    isSelected
                      ? "-translate-x-0.5 -translate-y-0.5 bg-ink text-paper shadow-stkr-pink motion-reduce:translate-x-0 motion-reduce:translate-y-0"
                      : "bg-white text-ink hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-stkr-md motion-reduce:translate-x-0 motion-reduce:translate-y-0",
                  )}
                  data-testid={`quiz-option-${idx}`}
                >
                  <span className="font-medium">{option}</span>
                </button>
              )
            })}
          </div>
        </div>

        {error && (
          <StickerCard className="border-coral p-3 text-sm text-coral">
            {error}
          </StickerCard>
        )}

        {/* Navigation */}
        <div className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            disabled={currentIndex === 0}
            onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
            className="flex-1"
          >
            Précédent
          </Button>
          {!isLast ? (
            <Button
              type="button"
              variant="pink"
              disabled={answers[currentIndex] < 0}
              onClick={() => setCurrentIndex((i) => Math.min(totalQuestions - 1, i + 1))}
              className="flex-1"
              data-testid="quiz-next-button"
            >
              Suivant <ArrowRight className="size-4" aria-hidden="true" />
            </Button>
          ) : (
            <Button
              type="button"
              variant="lime"
              disabled={!allAnswered || submitting}
              onClick={submit}
              className="flex-1"
              data-testid="quiz-submit-button"
            >
              {submitting ? "Envoi..." : "Valider"}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
