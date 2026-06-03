"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, SkipForward } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { StickerCard } from "@/components/ui/sticker-card"
import { SegmentedProgress } from "@/components/ui/progress"
import { NivCoach, NivCelebration } from "@/components/brand"
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

const STYLE_LABEL: Record<Style, string> = {
  visual: "Visuel",
  auditory: "Auditif",
  kinesthetic: "Kinesthésique",
  reading: "Lecture / écriture",
}

interface LearningStyleQuizProps {
  nextHref?: string
}

export function LearningStyleQuiz({
  nextHref = "/onboarding/complete",
}: LearningStyleQuizProps) {
  const router = useRouter()
  const [answers, setAnswers] = useState<Record<string, Style>>({})
  const [submitting, setSubmitting] = useState<"confirm" | "skip" | null>(null)
  const [result, setResult] = useState<Style | null>(null)

  function pick(qid: string, style: Style) {
    setAnswers((prev) => ({ ...prev, [qid]: style }))
  }

  const allAnswered = QUESTIONS.every((q) => answers[q.id])

  // Archetype dominant calculé côté client pour la célébration uniquement —
  // le scoring canonique reste serveur (POST ci-dessous).
  function dominantStyle(): Style {
    const counts: Record<Style, number> = { visual: 0, auditory: 0, kinesthetic: 0, reading: 0 }
    for (const q of QUESTIONS) {
      const s = answers[q.id]
      if (s) counts[s] += 1
    }
    return (Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] as Style) ?? "visual"
  }

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
      if (action === "confirm") {
        // Beat de célébration (Niv proud + confettis) avant la redirection.
        setResult(dominantStyle())
        setTimeout(() => router.push(nextHref), 2600)
      } else {
        router.push(nextHref)
      }
    } catch (err) {
      console.error("Learning-style submit error:", err)
      toast.error("Erreur réseau")
      setSubmitting(null)
    }
  }

  if (result) {
    return (
      <div className="mx-auto w-full max-w-2xl">
        <NivCelebration
          tone="teal"
          title="Ton style d'apprentissage"
          value={STYLE_LABEL[result]}
          caption="Je vais adapter le contenu à ton cerveau. On finalise ton profil…"
        />
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      <div className="space-y-3 text-center">
        <p className="eyebrow tracking-[0.16em]">Étape 3 / 4 · Apprentissage</p>
        <SegmentedProgress steps={4} current={2} className="mx-auto max-w-xs" />
        <h1 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
          Comment tu <em className="font-semibold italic text-pink">apprends</em> le mieux ?
        </h1>
        <p className="text-sm text-mute sm:text-base">
          4 questions rapides pour qu'on adapte le contenu à ton cerveau.
        </p>
      </div>

      <NivCoach
        mood="calm"
        message="Réponds au feeling — y'a pas de mauvaise réponse, je veux juste te connaître."
      />

      <div className="space-y-4">
        {QUESTIONS.map((q, qi) => (
          <StickerCard key={q.id} className="p-4 sm:p-5">
            <div className="space-y-3">
              <h2 className="font-display text-base font-bold">
                <span className="mr-2 text-pink">{qi + 1}.</span>
                {q.prompt}
              </h2>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {q.choices.map((c) => {
                  const isOn = answers[q.id] === c.style
                  return (
                    <button
                      key={c.style}
                      type="button"
                      onClick={() => pick(q.id, c.style)}
                      aria-pressed={isOn}
                      className={cn(
                        "flex items-center gap-3 rounded-2xl border-2 p-3 text-left text-sm font-medium transition-all duration-150",
                        "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-pink/40",
                        isOn
                          ? "-translate-x-0.5 -translate-y-0.5 border-ink bg-ink text-paper shadow-stkr-pink motion-reduce:translate-x-0 motion-reduce:translate-y-0"
                          : "border-line bg-white text-ink hover:border-ink"
                      )}
                    >
                      <span className="shrink-0 text-xl" aria-hidden>
                        {c.emoji}
                      </span>
                      <span>{c.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          </StickerCard>
        ))}
      </div>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Button
          variant="ghost"
          size="lg"
          onClick={() => submit("skip")}
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
        <Button
          variant="pink"
          size="lg"
          onClick={() => submit("confirm")}
          disabled={!allAnswered || submitting !== null}
          className="min-w-40"
        >
          {submitting === "confirm" ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              Sauvegarde…
            </>
          ) : (
            "Terminer"
          )}
        </Button>
      </div>
    </div>
  )
}
