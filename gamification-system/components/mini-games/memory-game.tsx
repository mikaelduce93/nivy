/**
 * TEENS PARTY MOROCCO - Memory Game Component
 * ============================================
 *
 * Jeu de Memory interactif.
 */

"use client"

import { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Grid,
  Clock,
  RotateCcw,
  Zap,
  Trophy,
  Star,
  Loader2,
  Play,
} from "lucide-react"
import confetti from "canvas-confetti"
import {
  type MemoryCard,
  type MemoryGameState,
  generateMemoryDeck,
  calculateMemoryScore,
  formatGameTime,
  getResultMessage,
} from "../../features/mini-games"

/* ==========================================================================
   TYPES
   ========================================================================== */

interface MemoryCardWithState extends MemoryCard {
  isFlipped: boolean
  isMatched: boolean
  position: number
}

/* ==========================================================================
   MEMORY GAME COMPONENT
   ========================================================================== */

interface MemoryGameProps {
  cards: MemoryCard[]
  pairsCount?: number
  onComplete: (score: number, moves: number, timeSeconds: number) => Promise<void>
  onCancel: () => void
  timeLimit?: number
}

export function MemoryGame({
  cards,
  pairsCount = 8,
  onComplete,
  onCancel,
  timeLimit = 120,
}: MemoryGameProps) {
  const [gameCards, setGameCards] = useState<MemoryCardWithState[]>([])
  const [flippedCards, setFlippedCards] = useState<number[]>([])
  const [matchedPairs, setMatchedPairs] = useState<string[]>([])
  const [moves, setMoves] = useState(0)
  const [timeElapsed, setTimeElapsed] = useState(0)
  const [isGameStarted, setIsGameStarted] = useState(false)
  const [isGameComplete, setIsGameComplete] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLocked, setIsLocked] = useState(false)

  // Initialize game
  useEffect(() => {
    const deck = generateMemoryDeck(cards, pairsCount)
    setGameCards(deck)
  }, [cards, pairsCount])

  // Timer
  useEffect(() => {
    if (!isGameStarted || isGameComplete) return

    const interval = setInterval(() => {
      setTimeElapsed((prev) => {
        if (timeLimit && prev >= timeLimit) {
          handleGameComplete()
          return prev
        }
        return prev + 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [isGameStarted, isGameComplete, timeLimit])

  // Check for match
  useEffect(() => {
    if (flippedCards.length !== 2) return

    setIsLocked(true)
    const [first, second] = flippedCards
    const firstCard = gameCards[first]
    const secondCard = gameCards[second]

    if (firstCard.pair_id === secondCard.pair_id) {
      // Match found
      setMatchedPairs((prev) => [...prev, firstCard.pair_id])
      setGameCards((prev) =>
        prev.map((card, index) =>
          index === first || index === second
            ? { ...card, isMatched: true }
            : card
        )
      )

      confetti({
        particleCount: 20,
        spread: 30,
        origin: { y: 0.7 },
      })

      setFlippedCards([])
      setIsLocked(false)
    } else {
      // No match
      setTimeout(() => {
        setGameCards((prev) =>
          prev.map((card, index) =>
            index === first || index === second
              ? { ...card, isFlipped: false }
              : card
          )
        )
        setFlippedCards([])
        setIsLocked(false)
      }, 1000)
    }

    setMoves((prev) => prev + 1)
  }, [flippedCards, gameCards])

  // Check for game complete
  useEffect(() => {
    if (matchedPairs.length === pairsCount && isGameStarted) {
      handleGameComplete()
    }
  }, [matchedPairs, pairsCount, isGameStarted])

  const handleCardClick = (index: number) => {
    if (isLocked) return
    if (flippedCards.includes(index)) return
    if (gameCards[index].isMatched) return
    if (flippedCards.length >= 2) return

    if (!isGameStarted) {
      setIsGameStarted(true)
    }

    setGameCards((prev) =>
      prev.map((card, i) =>
        i === index ? { ...card, isFlipped: true } : card
      )
    )
    setFlippedCards((prev) => [...prev, index])
  }

  const handleGameComplete = async () => {
    setIsGameComplete(true)
    setIsSubmitting(true)

    const score = calculateMemoryScore(moves, pairsCount, timeElapsed)
    await onComplete(score, moves, timeElapsed)

    setIsSubmitting(false)
  }

  const handleRestart = () => {
    const deck = generateMemoryDeck(cards, pairsCount)
    setGameCards(deck)
    setFlippedCards([])
    setMatchedPairs([])
    setMoves(0)
    setTimeElapsed(0)
    setIsGameStarted(false)
    setIsGameComplete(false)
    setIsLocked(false)
  }

  const timeRemaining = timeLimit ? timeLimit - timeElapsed : timeElapsed

  if (isSubmitting) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="w-12 h-12 text-purple-400 animate-spin mb-4" />
        <p className="text-white font-medium">Calcul de ton score...</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Grid className="w-5 h-5 text-purple-400" />
          <span className="font-bold text-white">Memory</span>
        </div>

        {/* Timer */}
        <div
          className={`flex items-center gap-1 px-3 py-1 rounded-full ${
            timeLimit && timeRemaining <= 10
              ? "bg-red-500 text-white animate-pulse"
              : "bg-zinc-700 text-white"
          }`}
        >
          <Clock className="w-4 h-4" />
          <span className="font-bold">
            {formatGameTime(timeLimit ? timeRemaining : timeElapsed)}
          </span>
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center justify-center gap-6">
        <div className="text-center">
          <p className="text-2xl font-bold text-white">{moves}</p>
          <p className="text-xs text-zinc-400">Coups</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-purple-400">
            {matchedPairs.length}/{pairsCount}
          </p>
          <p className="text-xs text-zinc-400">Paires</p>
        </div>
      </div>

      {/* Game Grid */}
      <div
        className={`grid gap-2 ${
          pairsCount <= 6
            ? "grid-cols-3"
            : pairsCount <= 8
            ? "grid-cols-4"
            : "grid-cols-5"
        }`}
      >
        {gameCards.map((card, index) => (
          <MemoryCardComponent
            key={`${card.id}-${index}`}
            card={card}
            onClick={() => handleCardClick(index)}
            disabled={isLocked || card.isMatched}
          />
        ))}
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={onCancel}
          className="flex-1 py-2 rounded-xl bg-zinc-800 text-zinc-400 hover:text-white text-sm"
        >
          Quitter
        </button>
        <button
          onClick={handleRestart}
          className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-zinc-700 text-white hover:bg-zinc-600"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

/* ==========================================================================
   MEMORY CARD COMPONENT
   ========================================================================== */

interface MemoryCardComponentProps {
  card: MemoryCardWithState
  onClick: () => void
  disabled: boolean
}

function MemoryCardComponent({
  card,
  onClick,
  disabled,
}: MemoryCardComponentProps) {
  return (
    <motion.button
      whileHover={!disabled && !card.isFlipped ? { scale: 1.05 } : {}}
      whileTap={!disabled && !card.isFlipped ? { scale: 0.95 } : {}}
      onClick={onClick}
      disabled={disabled || card.isFlipped}
      className={`relative aspect-square rounded-xl transition-all ${
        card.isMatched
          ? "opacity-50"
          : card.isFlipped
          ? "bg-purple-500"
          : "bg-zinc-800 hover:bg-zinc-700"
      }`}
    >
      <AnimatePresence mode="wait">
        {card.isFlipped || card.isMatched ? (
          <motion.div
            key="front"
            initial={{ rotateY: 90 }}
            animate={{ rotateY: 0 }}
            exit={{ rotateY: 90 }}
            className="absolute inset-0 flex items-center justify-center"
          >
            {card.image_url.startsWith("/") ? (
              <img
                src={card.image_url}
                alt={card.label || ""}
                className="w-full h-full object-cover rounded-xl"
              />
            ) : (
              <span className="text-3xl">{card.image_url}</span>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="back"
            initial={{ rotateY: 90 }}
            animate={{ rotateY: 0 }}
            exit={{ rotateY: 90 }}
            className="absolute inset-0 flex items-center justify-center"
          >
            <span className="text-2xl">❓</span>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.button>
  )
}

/* ==========================================================================
   MEMORY RESULT
   ========================================================================== */

interface MemoryResultProps {
  score: number
  moves: number
  timeSeconds: number
  perfectMoves: number
  xpEarned: number
  onClose: () => void
  onPlayAgain?: () => void
}

export function MemoryResult({
  score,
  moves,
  timeSeconds,
  perfectMoves,
  xpEarned,
  onClose,
  onPlayAgain,
}: MemoryResultProps) {
  const efficiency = Math.round((perfectMoves / moves) * 100)
  const stars = efficiency >= 100 ? 3 : efficiency >= 70 ? 2 : efficiency >= 50 ? 1 : 0

  useEffect(() => {
    if (stars >= 2) {
      confetti({
        particleCount: stars === 3 ? 150 : 80,
        spread: 70,
        origin: { y: 0.6 },
      })
    }
  }, [stars])

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="text-center py-8"
    >
      {/* Stars */}
      <div className="flex items-center justify-center gap-2 mb-4">
        {[1, 2, 3].map((star) => (
          <motion.div
            key={star}
            initial={{ scale: 0, rotate: -180 }}
            animate={{
              scale: star <= stars ? 1 : 0.5,
              rotate: 0,
            }}
            transition={{ delay: star * 0.2 }}
          >
            <Star
              className={`w-10 h-10 ${
                star <= stars
                  ? "text-yellow-400 fill-yellow-400"
                  : "text-zinc-600"
              }`}
            />
          </motion.div>
        ))}
      </div>

      {/* Title */}
      <h2 className="text-2xl font-bold text-white mb-2">
        {stars === 3
          ? "Parfait !"
          : stars === 2
          ? "Excellent !"
          : stars === 1
          ? "Bien joué !"
          : "Terminé !"}
      </h2>
      <p className="text-zinc-400 mb-6">
        {stars === 3
          ? "Performance parfaite !"
          : stars === 2
          ? "Très bonne mémoire !"
          : stars === 1
          ? "Continue à t'entraîner"
          : "Tu peux faire mieux"}
      </p>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="p-3 rounded-xl bg-zinc-800/50">
          <Trophy className="w-5 h-5 text-yellow-400 mx-auto mb-1" />
          <p className="text-xl font-bold text-white">{score.toLocaleString()}</p>
          <p className="text-xs text-zinc-400">Points</p>
        </div>
        <div className="p-3 rounded-xl bg-zinc-800/50">
          <Grid className="w-5 h-5 text-purple-400 mx-auto mb-1" />
          <p className="text-xl font-bold text-white">{moves}</p>
          <p className="text-xs text-zinc-400">Coups</p>
        </div>
        <div className="p-3 rounded-xl bg-zinc-800/50">
          <Clock className="w-5 h-5 text-cyan-400 mx-auto mb-1" />
          <p className="text-xl font-bold text-white">
            {formatGameTime(timeSeconds)}
          </p>
          <p className="text-xs text-zinc-400">Temps</p>
        </div>
      </div>

      {/* XP Earned */}
      <div className="flex items-center justify-center gap-2 text-yellow-400 font-bold text-lg mb-6">
        <Zap className="w-6 h-6" />
        +{xpEarned} XP
      </div>

      {/* Buttons */}
      <div className="space-y-2">
        {onPlayAgain && (
          <button
            onClick={onPlayAgain}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold"
          >
            Rejouer
          </button>
        )}
        <button
          onClick={onClose}
          className="w-full py-3 rounded-xl bg-zinc-800 text-zinc-400 font-semibold hover:bg-zinc-700"
        >
          Fermer
        </button>
      </div>
    </motion.div>
  )
}

/* ==========================================================================
   MEMORY INTRO
   ========================================================================== */

interface MemoryIntroProps {
  pairsCount: number
  timeLimit?: number
  xpReward: number
  onStart: () => void
  onCancel: () => void
}

export function MemoryIntro({
  pairsCount,
  timeLimit,
  xpReward,
  onStart,
  onCancel,
}: MemoryIntroProps) {
  return (
    <div className="text-center py-8">
      <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center">
        <Grid className="w-10 h-10 text-purple-400" />
      </div>

      <h2 className="text-2xl font-bold text-white mb-2">Memory</h2>
      <p className="text-zinc-400 mb-6">Trouve toutes les paires !</p>

      {/* Info Cards */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        <div className="p-3 rounded-xl bg-zinc-800/50 border border-zinc-700">
          <p className="text-2xl font-bold text-white">{pairsCount}</p>
          <p className="text-xs text-zinc-400">Paires</p>
        </div>
        <div className="p-3 rounded-xl bg-zinc-800/50 border border-zinc-700">
          <p className="text-2xl font-bold text-white">
            {timeLimit ? formatGameTime(timeLimit) : "∞"}
          </p>
          <p className="text-xs text-zinc-400">Temps</p>
        </div>
        <div className="p-3 rounded-xl bg-zinc-800/50 border border-zinc-700">
          <p className="text-2xl font-bold text-yellow-400">+{xpReward}</p>
          <p className="text-xs text-zinc-400">XP max</p>
        </div>
      </div>

      {/* Rules */}
      <div className="text-left p-4 rounded-xl bg-zinc-800/30 border border-zinc-700 mb-6">
        <h3 className="font-medium text-white mb-2">Comment jouer</h3>
        <ul className="space-y-1 text-sm text-zinc-400">
          <li>• Clique sur une carte pour la retourner</li>
          <li>• Trouve les paires de cartes identiques</li>
          <li>• Moins de coups = plus de points</li>
        </ul>
      </div>

      {/* Buttons */}
      <div className="space-y-2">
        <button
          onClick={onStart}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
        >
          <Play className="w-5 h-5" />
          Commencer
        </button>
        <button
          onClick={onCancel}
          className="w-full py-3 rounded-xl bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
        >
          Annuler
        </button>
      </div>
    </div>
  )
}
