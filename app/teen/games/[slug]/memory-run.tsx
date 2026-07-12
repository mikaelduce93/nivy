"use client"

/**
 * Moteur Memory — SPEC-G4 §7.2 (variante v1 simplifiée).
 *
 * Grille 4×4, 8 paires d'emojis (sets en dur dans `lib/games/memory-sets.ts`,
 * zéro DB, zéro modération — §5.2). Le layout vient du seed SERVEUR (session).
 *
 * ⚠️ EXCEPTION M1 EXPLICITE (spec §7.2, red-team #16) : contrairement à Quiz
 * Rush / Vrai-Faux (correction serveur par coup), la validation Memory est une
 * PLAUSIBILITÉ serveur sur les `moves`/`durationSeconds` que CE client envoie
 * à la clôture (coups ≥ minimum théorique, durée ≥ 10 s). C'est la seule
 * surface G4 où le client influence son crédit — bornée à ≤ 15 XP/session et
 * 3 sessions/jour, idempotente. Si l'enjeu XP montait, basculer sur la
 * variante `flip(i)` serveur.
 */

import { useEffect, useRef, useState } from "react"
import { Clock } from "lucide-react"
import { cn } from "@/lib/utils"
import { useT } from "@/lib/i18n"

// canon-allow: plateau memory 4×4 — 4 colonnes voulues à toutes les tailles (cartes ~72px sur 375px)
const BOARD_GRID = "grid grid-cols-4 gap-2 sm:gap-3"

interface Props {
  /** 16 identifiants de paire (0..7), ordre du plateau (seed serveur). */
  layout: number[]
  /** 8 emojis du set (index = identifiant de paire). */
  emojis: string[]
  onFinish: (stats: { moves: number; durationSeconds: number }) => void
}

export function MemoryRun({ layout, emojis, onFinish }: Props) {
  const t = useT()
  const [revealed, setRevealed] = useState<number[]>([])
  const [matched, setMatched] = useState<ReadonlySet<number>>(new Set())
  const [moves, setMoves] = useState(0)
  const [elapsed, setElapsed] = useState(0)
  const startedAtRef = useRef<number | null>(null)
  const lockRef = useRef(false)
  const finishedRef = useRef(false)

  const totalPairs = layout.length / 2
  const foundPairs = matched.size / 2

  // Chrono d'affichage (démarre au premier coup).
  useEffect(() => {
    if (startedAtRef.current === null || finishedRef.current) return
    const tick = setInterval(() => {
      if (startedAtRef.current !== null) {
        setElapsed(Math.floor((Date.now() - startedAtRef.current) / 1000))
      }
    }, 1000)
    return () => clearInterval(tick)
  }, [moves])

  function flip(cardIndex: number) {
    if (lockRef.current || finishedRef.current) return
    if (revealed.includes(cardIndex) || matched.has(cardIndex)) return
    if (startedAtRef.current === null) startedAtRef.current = Date.now()

    if (revealed.length === 0) {
      setRevealed([cardIndex])
      return
    }

    const [first] = revealed
    const next = [first, cardIndex]
    setRevealed(next)
    setMoves((m) => m + 1)

    if (layout[first] === layout[cardIndex]) {
      const newMatched = new Set(matched)
      newMatched.add(first)
      newMatched.add(cardIndex)
      setMatched(newMatched)
      setRevealed([])
      if (newMatched.size === layout.length && !finishedRef.current) {
        finishedRef.current = true
        const durationSeconds = startedAtRef.current
          ? Math.round((Date.now() - startedAtRef.current) / 1000)
          : 0
        onFinish({ moves: moves + 1, durationSeconds })
      }
    } else {
      lockRef.current = true
      setTimeout(() => {
        lockRef.current = false
        setRevealed([])
      }, 700)
    }
  }

  if (layout.length === 0) return null

  return (
    <div className="space-y-5" data-testid="game-memory">
      {/* Stats de partie */}
      <div className="flex items-center justify-between font-mono text-sm">
        <span className="text-mute">
          {t("teen.games.play.pairs")}{" "}
          <strong className="tabular-nums text-ink">
            {foundPairs}/{totalPairs}
          </strong>
        </span>
        <span className="text-mute">
          {t("teen.games.play.moves")}{" "}
          <strong className="tabular-nums text-ink">{moves}</strong>
        </span>
        <span className="flex items-center gap-1.5 text-mute">
          <Clock className="size-4" aria-hidden="true" />
          <strong className="tabular-nums text-ink">{elapsed}s</strong>
        </span>
      </div>

      {/* Plateau */}
      <div className={BOARD_GRID}>
        {layout.map((pairId, cardIndex) => {
          const isMatched = matched.has(cardIndex)
          const isRevealed = isMatched || revealed.includes(cardIndex)
          return (
            <button
              key={cardIndex}
              type="button"
              onClick={() => flip(cardIndex)}
              disabled={isRevealed}
              aria-label={
                isRevealed
                  ? emojis[pairId] ?? "?"
                  : t("teen.games.play.hiddenCard")
              }
              className={cn(
                "grid aspect-square place-items-center rounded-2xl border-2 border-ink text-3xl sm:text-4xl",
                "transition-all duration-200 ease-out motion-reduce:transition-none",
                isMatched
                  ? "bg-success-soft"
                  : isRevealed
                    ? "bg-white shadow-stkr-sm"
                    : "bg-ink text-paper hover:-translate-y-0.5 hover:shadow-stkr-md motion-reduce:translate-y-0",
              )}
              data-testid={`memory-card-${cardIndex}`}
            >
              {isRevealed ? (
                <span aria-hidden="true">{emojis[pairId] ?? "?"}</span>
              ) : (
                <span aria-hidden="true" className="font-display text-xl font-extrabold text-paper/60">
                  ?
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
