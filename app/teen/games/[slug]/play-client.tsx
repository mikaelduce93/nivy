"use client"

/**
 * Shell de mini-jeu solo — SPEC-G4 §7 (boucle session → réponses → XP réel).
 *
 * Cycle : intro (règles + plafonds honnêtes §6.2-5) → création de session
 * serveur (`POST /api/teen/games/sessions`) → moteur de jeu → clôture
 * (`POST …/complete`) → écran de fin avec l'XP RÉELLEMENT crédité par le
 * serveur (jamais un chiffre client). Migrations absentes → « bientôt »,
 * aucun bouton mort.
 */

import { useState } from "react"
import Link from "next/link"
import { Zap, Play, RotateCcw } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { StickerCard } from "@/components/ui/sticker-card"
import { Niv, NivCoach, NivEmpty, DarkSurface } from "@/components/brand"
import { Confetti } from "@/components/ui/effects/confetti"
import { useT } from "@/lib/i18n"
import { fetchWithCSRF } from "@/lib/security/fetch-with-csrf"
import { XP_SESSIONS_PER_DAY, type PlayableGameSlug } from "@/lib/games/catalog"
import { getMemorySet } from "@/lib/games/memory-sets"
import type {
  AnswerVerdict,
  CompleteResult,
  StartSessionResponse,
} from "@/lib/games/types"
import { QuestionRun } from "./question-run"
import { MemoryRun } from "./memory-run"

interface Props {
  slug: PlayableGameSlug
  name: string
  emoji: string
  description: string
  baseXp: number
  secondsPerItem: number
  available: boolean
  initialCreditedToday: number
}

type Phase = "intro" | "starting" | "playing" | "completing" | "done"

type ActiveSession = Extract<StartSessionResponse, { ok: true }>

export function GamePlayClient({
  slug,
  name,
  emoji,
  description,
  baseXp,
  secondsPerItem,
  available,
  initialCreditedToday,
}: Props) {
  const t = useT()
  const [phase, setPhase] = useState<Phase>("intro")
  const [unavailable, setUnavailable] = useState(!available)
  const [startError, setStartError] = useState<string | null>(null)
  const [session, setSession] = useState<ActiveSession | null>(null)
  const [creditedToday, setCreditedToday] = useState(initialCreditedToday)
  const [localCorrect, setLocalCorrect] = useState<{ correct: number; total: number } | null>(null)
  const [result, setResult] = useState<CompleteResult | null>(null)

  const cap = XP_SESSIONS_PER_DAY
  const xpLeft = Math.max(0, cap - creditedToday)
  const training = xpLeft === 0

  /* ------------------------- Session lifecycle ------------------------- */

  async function start() {
    setPhase("starting")
    setStartError(null)
    setResult(null)
    setLocalCorrect(null)
    try {
      const res = await fetchWithCSRF("/api/teen/games/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug }),
      })
      const data = (await res.json().catch(() => null)) as StartSessionResponse | null
      if (!data || !data.ok) {
        setPhase("intro")
        if (data && !data.ok && data.reason === "unavailable") {
          // Migrations 181/182 pas (encore) en base → même état honnête
          // que la page catalogue : « bientôt », pas de bouton mort.
          setUnavailable(true)
        } else if (data && !data.ok && data.reason === "cooldown") {
          setStartError(
            data.retryMinutes
              ? t("teen.games.play.cooldown", { minutes: data.retryMinutes })
              : t("teen.games.play.cooldownNoEta"),
          )
        } else {
          setStartError(t("teen.games.play.networkError"))
        }
        return
      }
      setSession(data)
      setCreditedToday(data.xp.creditedToday)
      setPhase("playing")
    } catch {
      setPhase("intro")
      setStartError(t("teen.games.play.networkError"))
    }
  }

  async function submitAnswer(questionIndex: number, answerIndex: number): Promise<AnswerVerdict> {
    if (!session) return { ok: false, correct: null, correctIndex: null }
    try {
      const res = await fetchWithCSRF(
        `/api/teen/games/sessions/${session.sessionId}/answer`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ questionIndex, answerIndex }),
        },
      )
      const data = (await res.json().catch(() => null)) as AnswerVerdict | null
      if (!data || !data.ok) return { ok: false, correct: null, correctIndex: null }
      return data
    } catch {
      return { ok: false, correct: null, correctIndex: null }
    }
  }

  async function complete(stats?: { moves: number; durationSeconds: number }) {
    if (!session) return
    setPhase("completing")
    try {
      const res = await fetchWithCSRF(
        `/api/teen/games/sessions/${session.sessionId}/complete`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slug, ...(stats ?? {}) }),
        },
      )
      const data = (await res.json().catch(() => null)) as CompleteResult | null
      if (data && data.ok) {
        setResult(data)
        setCreditedToday(data.xp.creditedToday)
      } else {
        // Clôture refusée (session expirée…) : écran de fin honnête à 0 XP.
        setResult({
          ok: false,
          score: null,
          xpAwarded: 0,
          xp: { creditedToday, capPerDay: cap, training },
        })
      }
    } catch {
      setResult({
        ok: false,
        score: null,
        xpAwarded: 0,
        xp: { creditedToday, capPerDay: cap, training },
      })
    }
    setPhase("done")
  }

  /* --------------------------- Bientôt (infra) --------------------------- */

  if (unavailable) {
    return (
      <div className="min-h-screen pb-32 pt-6">
        <div className="mx-auto max-w-2xl space-y-6">
          <Link href="/teen/games" className="font-mono text-sm text-mute hover:text-ink">
            ← {t("teen.games.play.back")}
          </Link>
          <NivEmpty
            mood="calm"
            title={t("teen.games.play.unavailableTitle")}
            description={t("teen.games.play.unavailableDesc")}
            action={
              <Button asChild variant="outline">
                <Link href="/teen/games">{t("teen.games.play.backToGames")}</Link>
              </Button>
            }
          />
        </div>
      </div>
    )
  }

  /* ------------------------------ Écran de fin ------------------------------ */

  if (phase === "done" && result) {
    const gotXp = result.xpAwarded > 0
    const capReached = result.xp.creditedToday >= result.xp.capPerDay
    return (
      <div className="min-h-screen pb-32 pt-6">
        <div className="mx-auto max-w-2xl space-y-6">
          <Link href="/teen/games" className="font-mono text-sm text-mute hover:text-ink">
            ← {t("teen.games.play.back")}
          </Link>

          <DarkSurface tone={gotXp ? "gold" : "teal"} shadow className="p-8 text-center">
            {gotXp && <Confetti trigger palette="xp" />}
            <Niv mood={gotXp ? "hype" : "proud"} float={gotXp} size={110} className="mx-auto" />
            <p className="eyebrow mt-4 tracking-[0.16em] text-paper/60">{name}</p>
            <h1 className="mt-2 font-display text-4xl font-extrabold tracking-tight text-paper">
              {t("teen.games.play.doneTitle")}
            </h1>
            {localCorrect && (
              <p className="mt-3 text-paper/70">
                {t("teen.games.play.correctCount", {
                  correct: localCorrect.correct,
                  total: localCorrect.total,
                })}
              </p>
            )}

            <div className="mx-auto mt-6 grid max-w-md grid-cols-2 gap-4">
              <div className="rounded-2xl border-2 border-paper/20 bg-paper/5 p-4">
                <div className="font-display text-4xl font-extrabold leading-none tabular-nums text-paper">
                  {result.score ?? "—"}
                </div>
                <div className="mt-2 font-mono text-[10px] uppercase tracking-[0.12em] text-paper/60">
                  {t("teen.games.play.score")}
                </div>
              </div>
              <div className="rounded-2xl border-2 border-paper/20 bg-paper/5 p-4">
                {gotXp ? (
                  <>
                    <div className="flex items-center justify-center gap-1 font-display text-4xl font-extrabold leading-none tabular-nums text-gold">
                      <Zap className="size-6" aria-hidden="true" />+{result.xpAwarded}
                    </div>
                    <div className="mt-2 font-mono text-[10px] uppercase tracking-[0.12em] text-paper/60">
                      {t("teen.games.play.xpGained")}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="grid min-h-10 place-items-center font-display text-xl font-extrabold leading-tight text-paper">
                      0 XP
                    </div>
                    <div className="mt-2 font-mono text-[10px] uppercase tracking-[0.12em] text-paper/60">
                      {capReached
                        ? t("teen.games.play.noXpCap")
                        : t("teen.games.play.noXpTraining")}
                    </div>
                  </>
                )}
              </div>
            </div>

            <p className="mt-5 font-mono text-xs text-paper/60">
              {t("teen.games.xpLeft", {
                count: Math.max(0, result.xp.capPerDay - result.xp.creditedToday),
                cap: result.xp.capPerDay,
              })}
            </p>
          </DarkSurface>

          <div className="flex gap-3">
            <Button asChild variant="outline" className="flex-1">
              <Link href="/teen/games">{t("teen.games.play.backToGames")}</Link>
            </Button>
            <Button type="button" variant="pink" className="flex-1" onClick={start}>
              <RotateCcw className="size-4" aria-hidden="true" />
              {t("teen.games.play.replay")}
            </Button>
          </div>
        </div>
      </div>
    )
  }

  /* ------------------------------- Partie ------------------------------- */

  if ((phase === "playing" || phase === "completing") && session) {
    return (
      <div className="min-h-screen pb-32 pt-6">
        <div className="mx-auto max-w-2xl space-y-6">
          <div className="flex items-center justify-between">
            <Link href="/teen/games" className="font-mono text-sm text-mute hover:text-ink">
              ← {t("teen.games.play.back")}
            </Link>
            {session.xp.training && (
              <span className="rounded-full border-2 border-ink bg-paper-2 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-mute">
                {t("teen.games.play.noXpTraining")}
              </span>
            )}
          </div>

          {phase === "completing" ? (
            <StickerCard className="items-center gap-3 p-8 text-center">
              <Niv mood="calm" size={80} />
              <p className="font-mono text-sm text-mute">{t("teen.games.play.completing")}</p>
            </StickerCard>
          ) : slug === "memory" ? (
            <MemoryRun
              layout={session.layout ?? []}
              emojis={[...getMemorySet(session.setId).emojis]}
              onFinish={(stats) => complete(stats)}
            />
          ) : (
            <QuestionRun
              mode={slug}
              questions={session.questions ?? []}
              statements={session.statements ?? []}
              secondsPerItem={secondsPerItem}
              submitAnswer={submitAnswer}
              onFinish={(local) => {
                setLocalCorrect({ correct: local.correct, total: local.total })
                complete()
              }}
            />
          )}
        </div>
      </div>
    )
  }

  /* -------------------------------- Intro -------------------------------- */

  return (
    <div className="min-h-screen pb-32 pt-6">
      <div className="mx-auto max-w-2xl space-y-6">
        <Link href="/teen/games" className="font-mono text-sm text-mute hover:text-ink">
          ← {t("teen.games.play.back")}
        </Link>

        <header className="flex items-center gap-4">
          <span className="grid size-16 shrink-0 place-items-center rounded-2xl border-2 border-ink bg-white text-4xl shadow-stkr-sm" aria-hidden="true">
            {emoji}
          </span>
          <div>
            <p className="eyebrow tracking-[0.16em]">{t("teen.games.play.getReady")}</p>
            <h1 className="font-display text-3xl font-extrabold tracking-tight">{name}</h1>
            <p className="text-sm text-mute">{description}</p>
          </div>
        </header>

        <div className="flex flex-wrap gap-2">
          <span className="flex items-center gap-1.5 rounded-full border-2 border-ink bg-white px-3 py-1 font-mono text-xs font-bold text-gold">
            <Zap className="size-3.5" aria-hidden="true" />
            {t("teen.games.play.xpMax", { xp: baseXp })}
          </span>
          <span
            className={cn(
              "rounded-full border-2 border-ink px-3 py-1 font-mono text-xs font-bold",
              training ? "bg-paper-2 text-mute" : "bg-white text-teal",
            )}
          >
            {t("teen.games.xpLeft", { count: xpLeft, cap })}
          </span>
        </div>

        <NivCoach
          tone="paper"
          mood={training ? "calm" : "hype"}
          message={
            training
              ? t("teen.games.play.trainingBanner")
              : t(`teen.games.play.rules.${slug}`)
          }
        />

        {startError && (
          <StickerCard className="border-coral p-3 text-sm text-coral" role="alert">
            {startError}
          </StickerCard>
        )}

        <Button
          type="button"
          variant={training ? "outline" : "pink"}
          size="lg"
          className="w-full"
          disabled={phase === "starting"}
          onClick={start}
          data-testid="game-start-button"
        >
          <Play className="size-4" aria-hidden="true" />
          {phase === "starting"
            ? t("teen.games.play.starting")
            : training
              ? t("teen.games.trainCta")
              : t("teen.games.play.start")}
        </Button>
      </div>
    </div>
  )
}
