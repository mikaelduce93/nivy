"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import { Brain, Zap, Trophy, ArrowRight, Clock, X, CheckCircle2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import type { Quiz } from "@/lib/quiz/schema"
import { getCategoryMeta } from "@/lib/quiz/catalog"

interface SubmitResponse {
  success: true
  attempt: {
    id: string
    score: number
    passed: boolean
    correctCount: number
    totalQuestions: number
    xpEarned: number
    results: Array<{
      question: string
      userAnswer: number
      correctAnswer: number
      isCorrect: boolean
    }>
  }
}

export function QuizRunnerClient({ quiz }: { quiz: Quiz }) {
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
      setResult((data as SubmitResponse).attempt)
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
            <Link href="/teen/quiz" className="text-sm text-zinc-400 hover:text-white">
              ← Retour aux quiz
            </Link>
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className={cn(
              "p-8 rounded-3xl border text-center",
              result.passed
                ? "bg-gen-z-mint/10 border-gen-z-mint/30"
                : "bg-gen-z-coral/10 border-gen-z-coral/30",
            )}
          >
            <div className="flex justify-center mb-4">
              {result.passed ? (
                <Trophy className="w-16 h-16 text-yellow-500" />
              ) : (
                <Brain className="w-16 h-16 text-gen-z-coral" />
              )}
            </div>
            <h1 className="text-4xl font-black mb-2 uppercase italic">
              {result.passed ? "Bravo !" : "Pas mal..."}
            </h1>
            <p className="text-zinc-400 mb-6">
              Tu as répondu correctement à {result.correctCount} / {result.totalQuestions} questions
            </p>
            <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
              <div className="p-4 rounded-2xl bg-zinc-900/50 border border-white/5">
                <div className="text-3xl font-black text-white">{result.score}%</div>
                <div className="text-xs text-zinc-500 uppercase tracking-wider">Score</div>
              </div>
              <div className="p-4 rounded-2xl bg-zinc-900/50 border border-white/5">
                <div className="text-3xl font-black text-gen-z-lavender flex items-center justify-center gap-1">
                  <Zap className="w-6 h-6" />+{result.xpEarned}
                </div>
                <div className="text-xs text-zinc-500 uppercase tracking-wider">XP gagnés</div>
              </div>
            </div>
          </motion.div>

          {/* Per-question breakdown */}
          <div className="space-y-3">
            <h2 className="text-lg font-black uppercase">Détail</h2>
            {result.results.map((r, i) => (
              <div
                key={i}
                className={cn(
                  "p-4 rounded-2xl border",
                  r.isCorrect
                    ? "bg-gen-z-mint/5 border-gen-z-mint/20"
                    : "bg-gen-z-coral/5 border-gen-z-coral/20",
                )}
              >
                <div className="flex items-start gap-3">
                  {r.isCorrect ? (
                    <CheckCircle2 className="w-5 h-5 text-gen-z-mint shrink-0 mt-0.5" />
                  ) : (
                    <X className="w-5 h-5 text-gen-z-coral shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <p className="font-medium text-white">{r.question}</p>
                    {!r.isCorrect && quiz.questions[i] && (
                      <p className="text-sm text-zinc-400 mt-1">
                        Bonne réponse : <strong>{quiz.questions[i].options[r.correctAnswer]}</strong>
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            <Link href="/teen/quiz" className="flex-1">
              <Button variant="outline" className="w-full">
                Retour
              </Button>
            </Link>
            <Link href="/teen/quiz/history" className="flex-1">
              <Button className="w-full bg-gen-z-lavender text-black font-bold">
                Voir l'historique
              </Button>
            </Link>
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
          <Link href="/teen/quiz" className="text-sm text-zinc-400 hover:text-white">
            ← Quitter
          </Link>
          {timeLimitSec > 0 && (
            <div className="flex items-center gap-2 text-sm text-zinc-400">
              <Clock className="w-4 h-4" />
              <span>
                {Math.floor(secondsLeft / 60)}:
                {(secondsLeft % 60).toString().padStart(2, "0")}
              </span>
            </div>
          )}
        </div>

        {/* Title + progress */}
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "w-12 h-12 rounded-2xl flex items-center justify-center bg-gradient-to-br",
                meta.color,
              )}
            >
              <Brain className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight">{quiz.title}</h1>
              <p className="text-sm text-zinc-500">
                {meta.name} · Question {currentIndex + 1} / {totalQuestions}
              </p>
            </div>
          </div>
          <Progress
            value={((currentIndex + 1) / totalQuestions) * 100}
            className="h-2"
          />
        </div>

        {/* Question */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            <h2 className="text-xl font-bold text-white">{currentQuestion.question}</h2>
            <div className="space-y-2" data-testid="quiz-options">
              {currentQuestion.options.map((option, idx) => {
                const isSelected = answers[currentIndex] === idx
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => selectAnswer(idx)}
                    className={cn(
                      "w-full p-4 rounded-2xl border text-left transition-all",
                      isSelected
                        ? "bg-gen-z-lavender/20 border-gen-z-lavender text-white"
                        : "bg-zinc-900/50 border-white/5 text-zinc-300 hover:border-white/20",
                    )}
                    data-testid={`quiz-option-${idx}`}
                  >
                    <span className="font-medium">{option}</span>
                  </button>
                )
              })}
            </div>
          </motion.div>
        </AnimatePresence>

        {error && (
          <div className="p-3 rounded-xl bg-gen-z-coral/10 border border-gen-z-coral/30 text-sm text-gen-z-coral">
            {error}
          </div>
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
              disabled={answers[currentIndex] < 0}
              onClick={() => setCurrentIndex((i) => Math.min(totalQuestions - 1, i + 1))}
              className="flex-1 bg-gen-z-lavender text-black font-bold"
              data-testid="quiz-next-button"
            >
              Suivant <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button
              type="button"
              disabled={!allAnswered || submitting}
              onClick={submit}
              className="flex-1 bg-gen-z-mint text-black font-bold"
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
