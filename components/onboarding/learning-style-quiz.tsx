"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { Brain, Loader2, SkipForward } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"

type Style = "visual" | "auditory" | "kinesthetic" | "reading"

interface QuizQuestion {
  id: string
  prompt: string
  choices: { style: Style; label: string; emoji: string }[]
}

const QUESTIONS: QuizQuestion[] = [
  {
    id: "q1",
    prompt: "Je préfère apprendre par...",
    choices: [
      { style: "visual", label: "Schémas et vidéos", emoji: "📊" },
      { style: "auditory", label: "Podcasts et discussions", emoji: "🎧" },
      { style: "kinesthetic", label: "La pratique, en faisant", emoji: "🛠️" },
      { style: "reading", label: "Lire un livre ou un article", emoji: "📖" },
    ],
  },
  {
    id: "q2",
    prompt: "Quand je dois retenir une info, je...",
    choices: [
      { style: "visual", label: "La visualise dans ma tête", emoji: "🧠" },
      { style: "auditory", label: "La répète à voix haute", emoji: "🗣️" },
      { style: "kinesthetic", label: "L'écris à la main", emoji: "✍️" },
      { style: "reading", label: "La relis plusieurs fois", emoji: "📚" },
    ],
  },
  {
    id: "q3",
    prompt: "Mon weekend idéal c'est...",
    choices: [
      { style: "visual", label: "Visiter un musée ou une expo", emoji: "🖼️" },
      { style: "auditory", label: "Un concert ou une session musique", emoji: "🎵" },
      { style: "kinesthetic", label: "Du sport ou une rando", emoji: "🏃" },
      { style: "reading", label: "Un bon bouquin au calme", emoji: "📕" },
    ],
  },
  {
    id: "q4",
    prompt: "Pour comprendre un nouveau truc, le plus efficace c'est...",
    choices: [
      { style: "visual", label: "Une infographie claire", emoji: "📈" },
      { style: "auditory", label: "Que quelqu'un me l'explique", emoji: "💬" },
      { style: "kinesthetic", label: "Tester par moi-même", emoji: "🎯" },
      { style: "reading", label: "Une doc bien écrite", emoji: "📝" },
    ],
  },
]

interface LearningStyleQuizProps {
  nextHref?: string
}

export function LearningStyleQuiz({
  nextHref = "/onboarding/complete",
}: LearningStyleQuizProps) {
  const router = useRouter()
  const [answers, setAnswers] = useState<Record<string, Style>>({})
  const [submitting, setSubmitting] = useState<"confirm" | "skip" | null>(null)

  function pick(qid: string, style: Style) {
    setAnswers((prev) => ({ ...prev, [qid]: style }))
  }

  const allAnswered = QUESTIONS.every((q) => answers[q.id])

  async function submit(action: "confirm" | "skip") {
    setSubmitting(action)
    try {
      const payload =
        action === "skip"
          ? { answers: [] }
          : { answers: QUESTIONS.map((q) => answers[q.id]).filter(Boolean) }

      const res = await fetch("/api/teen/onboarding/learning-style", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json?.success) {
        toast.error(json?.error ?? "Erreur lors de l'enregistrement")
        setSubmitting(null)
        return
      }
      router.push(nextHref)
    } catch (err) {
      console.error("Learning-style submit error:", err)
      toast.error("Erreur réseau")
      setSubmitting(null)
    }
  }

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold">
          <Brain className="w-3.5 h-3.5" />
          Étape Style d'apprentissage
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
          Comment tu apprends le mieux ?
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          4 questions rapides pour qu'on adapte le contenu à ton cerveau.
        </p>
      </div>

      <div className="space-y-4">
        {QUESTIONS.map((q, qi) => (
          <Card key={q.id} className="p-4 sm:p-5">
            <div className="space-y-3">
              <h2 className="text-base font-semibold">
                <span className="text-primary mr-2">{qi + 1}.</span>
                {q.prompt}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {q.choices.map((c) => {
                  const isOn = answers[q.id] === c.style
                  return (
                    <motion.button
                      key={c.style}
                      type="button"
                      whileTap={{ scale: 0.97 }}
                      onClick={() => pick(q.id, c.style)}
                      aria-pressed={isOn}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-2xl border text-left text-sm font-medium",
                        "transition-all duration-150",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
                        isOn
                          ? "bg-primary/10 border-primary text-foreground shadow-sm"
                          : "bg-background hover:bg-muted border-border"
                      )}
                    >
                      <span className="text-xl shrink-0" aria-hidden>
                        {c.emoji}
                      </span>
                      <span>{c.label}</span>
                    </motion.button>
                  )
                })}
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3">
        <Button
          variant="ghost"
          size="lg"
          onClick={() => submit("skip")}
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
        <Button
          size="lg"
          onClick={() => submit("confirm")}
          disabled={!allAnswered || submitting !== null}
          className="min-w-40"
        >
          {submitting === "confirm" ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Sauvegarde…
            </>
          ) : (
            <>Terminer</>
          )}
        </Button>
      </div>
    </div>
  )
}
