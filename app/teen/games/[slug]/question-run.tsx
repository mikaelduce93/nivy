"use client"

/**
 * Moteur « questions au chrono » — Quiz Rush (§7.1) et Vrai/Faux Sprint (§7.3).
 *
 * Quiz Rush : questions strippées enchaînées, 10 s chacune, 4 options.
 * Vrai/Faux : affirmations au rythme rapide, 5 s, deux boutons (Faux=0, Vrai=1).
 *
 * Chaque réponse part au serveur PAR COUP via `submitAnswer` (RPC
 * `submit_game_answer`) — le verdict revient du serveur, jamais calculé ici.
 * Un timeout n'envoie rien : une question sans réponse n'est simplement pas
 * comptée dans `game_sessions.answers` (le score serveur ne compte que les
 * bonnes réponses enregistrées). Animations sobres, variantes motion-reduce.
 */

import { useCallback, useEffect, useRef, useState } from "react"
import { Clock, CheckCircle2, X, Hourglass } from "lucide-react"
import { cn } from "@/lib/utils"
import { SegmentedProgress } from "@/components/ui/progress"
import { useT } from "@/lib/i18n"
import type {
  AnswerVerdict,
  StrippedQuestion,
  StrippedStatement,
} from "@/lib/games/types"

interface Props {
  mode: "quiz_rush" | "vrai_faux"
  questions: StrippedQuestion[]
  statements: StrippedStatement[]
  secondsPerItem: number
  submitAnswer: (questionIndex: number, answerIndex: number) => Promise<AnswerVerdict>
  onFinish: (local: { correct: number; answered: number; total: number }) => void
}

type ItemPhase = "answering" | "pending" | "feedback"

interface Feedback {
  kind: "good" | "bad" | "late" | "saved"
  selectedIndex: number | null
  correctIndex: number | null
}

export function QuestionRun({
  mode,
  questions,
  statements,
  secondsPerItem,
  submitAnswer,
  onFinish,
}: Props) {
  const t = useT()
  const total = mode === "quiz_rush" ? questions.length : statements.length
  const feedbackMs = mode === "vrai_faux" ? 650 : 900

  const [index, setIndex] = useState(0)
  const [itemPhase, setItemPhase] = useState<ItemPhase>("answering")
  const [feedback, setFeedback] = useState<Feedback | null>(null)
  const [deadline, setDeadline] = useState(() => Date.now() + secondsPerItem * 1000)
  const [remainingMs, setRemainingMs] = useState(secondsPerItem * 1000)

  // Compteurs locaux (affichage de fin uniquement — le score fait foi serveur).
  const correctRef = useRef(0)
  const answeredRef = useRef(0)
  const finishedRef = useRef(false)

  const advance = useCallback(() => {
    if (index + 1 >= total) {
      if (!finishedRef.current) {
        finishedRef.current = true
        onFinish({ correct: correctRef.current, answered: answeredRef.current, total })
      }
      return
    }
    setIndex((i) => i + 1)
    setItemPhase("answering")
    setFeedback(null)
    setDeadline(Date.now() + secondsPerItem * 1000)
    setRemainingMs(secondsPerItem * 1000)
  }, [index, total, secondsPerItem, onFinish])

  // Chrono ancré sur une deadline (pas de dérive d'interval).
  useEffect(() => {
    if (itemPhase !== "answering") return
    const tick = setInterval(() => {
      const left = deadline - Date.now()
      setRemainingMs(Math.max(0, left))
      if (left <= 0) {
        setItemPhase("feedback")
        setFeedback({ kind: "late", selectedIndex: null, correctIndex: null })
      }
    }, 100)
    return () => clearInterval(tick)
  }, [itemPhase, deadline])

  // Fin du flash feedback → question suivante.
  useEffect(() => {
    if (itemPhase !== "feedback") return
    const timer = setTimeout(advance, feedbackMs)
    return () => clearTimeout(timer)
  }, [itemPhase, advance, feedbackMs])

  async function pick(answerIndex: number) {
    if (itemPhase !== "answering") return
    setItemPhase("pending")
    answeredRef.current += 1
    const verdict = await submitAnswer(index, answerIndex)
    if (verdict.correct === true) correctRef.current += 1
    setFeedback({
      kind: verdict.correct === true ? "good" : verdict.correct === false ? "bad" : "saved",
      selectedIndex: answerIndex,
      correctIndex: verdict.correctIndex,
    })
    setItemPhase("feedback")
  }

  if (total === 0) return null

  const secondsLeft = Math.ceil(remainingMs / 1000)
  const pct = Math.max(0, Math.min(100, (remainingMs / (secondsPerItem * 1000)) * 100))
  const low = remainingMs <= secondsPerItem * 250 // dernier quart

  const header = (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="font-mono text-sm text-mute">
          {t(
            mode === "quiz_rush" ? "teen.games.play.question" : "teen.games.play.statement",
            { current: index + 1, total },
          )}
        </p>
        <span
          className={cn(
            "flex items-center gap-1.5 rounded-full border-2 border-ink px-3 py-1 font-mono text-sm font-bold tabular-nums",
            low ? "bg-coral text-ink" : "bg-white text-ink",
          )}
        >
          <Clock className="size-4" aria-hidden="true" />
          {secondsLeft}s
        </span>
      </div>
      <SegmentedProgress steps={total} current={index} size="md" />
      {/* Barre de temps */}
      <div className="h-2 overflow-hidden rounded-full border-2 border-ink bg-paper-2">
        <div
          className={cn(
            "h-full transition-[width] duration-100 ease-linear motion-reduce:transition-none",
            low ? "bg-coral" : "bg-teal",
          )}
          style={{ width: `${pct}%` }}
          aria-hidden="true"
        />
      </div>
    </div>
  )

  const feedbackBanner = feedback && (
    <div
      role="status"
      className={cn(
        "flex items-center justify-center gap-2 rounded-2xl border-2 border-ink p-3 font-display font-extrabold",
        feedback.kind === "good" && "bg-success-soft text-ink",
        feedback.kind === "bad" && "bg-coral text-ink",
        feedback.kind === "late" && "bg-paper-2 text-mute",
        feedback.kind === "saved" && "bg-white text-ink",
      )}
    >
      {feedback.kind === "good" && (
        <>
          <CheckCircle2 className="size-5" aria-hidden="true" />
          {t("teen.games.play.good")}
        </>
      )}
      {feedback.kind === "bad" && (
        <>
          <X className="size-5" strokeWidth={3} aria-hidden="true" />
          {t("teen.games.play.bad")}
        </>
      )}
      {feedback.kind === "late" && (
        <>
          <Hourglass className="size-5" aria-hidden="true" />
          {t("teen.games.play.late")}
        </>
      )}
      {feedback.kind === "saved" && t("teen.games.play.saved")}
    </div>
  )

  /* ------------------------------ Quiz Rush ------------------------------ */

  if (mode === "quiz_rush") {
    const q = questions[index]
    return (
      <div className="space-y-5" data-testid="game-quiz-rush">
        {header}
        <h2 className="text-xl font-bold text-ink">{q.question}</h2>
        <div className="space-y-2">
          {q.options.map((option, idx) => {
            const isSelected = feedback?.selectedIndex === idx
            const isRevealedCorrect = feedback?.correctIndex === idx
            return (
              <button
                key={idx}
                type="button"
                disabled={itemPhase !== "answering"}
                onClick={() => pick(idx)}
                className={cn(
                  "w-full rounded-2xl border-2 border-ink p-4 text-left transition-all duration-150 ease-out",
                  "disabled:pointer-events-none",
                  isRevealedCorrect
                    ? "bg-lime text-on-bright"
                    : isSelected
                      ? feedback?.kind === "bad"
                        ? "bg-coral text-ink"
                        : "bg-ink text-paper"
                      : "bg-white text-ink hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-stkr-md motion-reduce:translate-x-0 motion-reduce:translate-y-0",
                )}
                data-testid={`game-option-${idx}`}
              >
                <span className="font-medium">{option}</span>
              </button>
            )
          })}
        </div>
        {feedbackBanner}
      </div>
    )
  }

  /* ---------------------------- Vrai/Faux Sprint ---------------------------- */

  const s = statements[index]
  return (
    <div className="space-y-5" data-testid="game-vrai-faux">
      {header}
      <div className="rounded-2xl border-2 border-ink bg-white p-6 shadow-stkr-sm">
        <h2 className="text-xl font-bold text-ink">{s.question}</h2>
        {s.proposition && (
          <p className="mt-3 text-sm text-mute">
            {t("teen.games.play.proposed")} :{" "}
            <strong className="text-ink">{s.proposition}</strong>
          </p>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3">
        {/* answer_index : 0 = Faux, 1 = Vrai (contrat route answer) */}
        <button
          type="button"
          disabled={itemPhase !== "answering"}
          onClick={() => pick(0)}
          className={cn(
            "rounded-2xl border-2 border-ink bg-coral p-5 font-display text-xl font-extrabold text-ink transition-all duration-150 ease-out",
            "hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-stkr-md motion-reduce:translate-x-0 motion-reduce:translate-y-0",
            "disabled:pointer-events-none disabled:opacity-60",
            feedback?.selectedIndex === 0 && "translate-x-0 translate-y-0 shadow-none ring-[3px] ring-ink/30",
          )}
          data-testid="game-false-button"
        >
          ✕ {t("teen.games.play.false")}
        </button>
        <button
          type="button"
          disabled={itemPhase !== "answering"}
          onClick={() => pick(1)}
          className={cn(
            "rounded-2xl border-2 border-ink bg-lime p-5 font-display text-xl font-extrabold text-on-bright transition-all duration-150 ease-out",
            "hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-stkr-md motion-reduce:translate-x-0 motion-reduce:translate-y-0",
            "disabled:pointer-events-none disabled:opacity-60",
            feedback?.selectedIndex === 1 && "translate-x-0 translate-y-0 shadow-none ring-[3px] ring-ink/30",
          )}
          data-testid="game-true-button"
        >
          ✓ {t("teen.games.play.true")}
        </button>
      </div>
      {feedbackBanner}
    </div>
  )
}
