"use client"

import { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Brain,
  Timer,
  Trophy,
  Star,
  ArrowLeft,
  RotateCcw,
  Zap,
  Music,
  Headphones,
  Disc,
  Radio,
  Mic,
  Speaker,
  Guitar,
  Piano,
  Drum,
  Sparkles,
  PartyPopper,
  Crown,
  Heart,
} from "lucide-react"
import Link from "next/link"

// Icônes pour les cartes
const CARD_ICONS = [
  { icon: Music, color: "#8B5CF6" },
  { icon: Headphones, color: "#EC4899" },
  { icon: Disc, color: "#06B6D4" },
  { icon: Radio, color: "#F59E0B" },
  { icon: Mic, color: "#22C55E" },
  { icon: Speaker, color: "#EF4444" },
  { icon: Guitar, color: "#3B82F6" },
  { icon: Piano, color: "#A855F7" },
  { icon: Drum, color: "#F97316" },
  { icon: Sparkles, color: "#FBBF24" },
  { icon: PartyPopper, color: "#10B981" },
  { icon: Crown, color: "#F472B6" },
]

type Card = {
  id: number
  iconIndex: number
  isFlipped: boolean
  isMatched: boolean
}

type GameState = "menu" | "countdown" | "playing" | "gameover"
type Difficulty = "easy" | "medium" | "hard"

const DIFFICULTY_CONFIG = {
  easy: { pairs: 6, gridCols: 4, timeLimit: 60 },
  medium: { pairs: 8, gridCols: 4, timeLimit: 90 },
  hard: { pairs: 12, gridCols: 6, timeLimit: 120 },
}

export default function MemoryPage() {
  const [gameState, setGameState] = useState<GameState>("menu")
  const [difficulty, setDifficulty] = useState<Difficulty>("medium")
  const [cards, setCards] = useState<Card[]>([])
  const [flippedCards, setFlippedCards] = useState<number[]>([])
  const [matchedPairs, setMatchedPairs] = useState(0)
  const [moves, setMoves] = useState(0)
  const [timeLeft, setTimeLeft] = useState(90)
  const [score, setScore] = useState(0)
  const [combo, setCombo] = useState(0)
  const [maxCombo, setMaxCombo] = useState(0)
  const [countdown, setCountdown] = useState(3)
  const [isLocked, setIsLocked] = useState(false)

  const config = DIFFICULTY_CONFIG[difficulty]

  // Initialiser le jeu
  const initGame = useCallback(() => {
    const iconIndices = [...Array(config.pairs).keys()]
    const cardPairs = [...iconIndices, ...iconIndices]

    // Mélanger les cartes
    for (let i = cardPairs.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[cardPairs[i], cardPairs[j]] = [cardPairs[j], cardPairs[i]]
    }

    const newCards: Card[] = cardPairs.map((iconIndex, index) => ({
      id: index,
      iconIndex,
      isFlipped: false,
      isMatched: false,
    }))

    setCards(newCards)
    setFlippedCards([])
    setMatchedPairs(0)
    setMoves(0)
    setTimeLeft(config.timeLimit)
    setScore(0)
    setCombo(0)
    setMaxCombo(0)
  }, [config])

  // Countdown
  useEffect(() => {
    if (gameState === "countdown") {
      const interval = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(interval)
            setGameState("playing")
            return 3
          }
          return prev - 1
        })
      }, 1000)
      return () => clearInterval(interval)
    }
  }, [gameState])

  // Timer
  useEffect(() => {
    if (gameState === "playing" && timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft((prev) => prev - 1), 1000)
      return () => clearTimeout(timer)
    } else if (timeLeft === 0 && gameState === "playing") {
      setGameState("gameover")
    }
  }, [gameState, timeLeft])

  // Vérifier fin de jeu
  useEffect(() => {
    if (matchedPairs === config.pairs && gameState === "playing") {
      // Bonus de temps restant
      const timeBonus = timeLeft * 10
      setScore((prev) => prev + timeBonus)
      setGameState("gameover")
    }
  }, [matchedPairs, config.pairs, gameState, timeLeft])

  const startGame = () => {
    initGame()
    setGameState("countdown")
  }

  const handleCardClick = (cardId: number) => {
    if (isLocked) return
    if (flippedCards.length >= 2) return

    const card = cards.find((c) => c.id === cardId)
    if (!card || card.isFlipped || card.isMatched) return

    // Retourner la carte
    setCards((prev) =>
      prev.map((c) => (c.id === cardId ? { ...c, isFlipped: true } : c))
    )

    const newFlipped = [...flippedCards, cardId]
    setFlippedCards(newFlipped)

    // Si 2 cartes retournées
    if (newFlipped.length === 2) {
      setMoves((prev) => prev + 1)
      setIsLocked(true)

      const [firstId, secondId] = newFlipped
      const firstCard = cards.find((c) => c.id === firstId)!
      const secondCard = cards.find((c) => c.id === secondId)!

      if (firstCard.iconIndex === secondCard.iconIndex) {
        // Match!
        const newCombo = combo + 1
        setCombo(newCombo)
        setMaxCombo((prev) => Math.max(prev, newCombo))

        // Points: base + combo bonus
        const basePoints = 100
        const comboBonus = newCombo >= 2 ? Math.floor(basePoints * (newCombo - 1) * 0.5) : 0
        setScore((prev) => prev + basePoints + comboBonus)

        setCards((prev) =>
          prev.map((c) =>
            c.id === firstId || c.id === secondId
              ? { ...c, isMatched: true }
              : c
          )
        )
        setMatchedPairs((prev) => prev + 1)
        setFlippedCards([])
        setIsLocked(false)
      } else {
        // Pas de match
        setCombo(0)
        setTimeout(() => {
          setCards((prev) =>
            prev.map((c) =>
              c.id === firstId || c.id === secondId
                ? { ...c, isFlipped: false }
                : c
            )
          )
          setFlippedCards([])
          setIsLocked(false)
        }, 1000)
      }
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  const getStarRating = () => {
    const efficiency = (matchedPairs * 2) / moves
    if (efficiency >= 0.8) return 3
    if (efficiency >= 0.5) return 2
    return 1
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-900 via-zinc-900 to-zinc-950 text-white">
      {/* Header */}
      <header className="p-4 flex items-center justify-between">
        <Link
          href="/gamification-demo"
          className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Retour
        </Link>

        {gameState === "playing" && (
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-zinc-800">
              <Timer className="w-4 h-4 text-cyan-400" />
              <span className={`font-mono font-bold ${timeLeft <= 10 ? "text-red-400" : "text-white"}`}>
                {formatTime(timeLeft)}
              </span>
            </div>
            <div className="px-3 py-1 rounded-lg bg-zinc-800 text-yellow-400 font-bold">
              {score.toLocaleString()} pts
            </div>
          </div>
        )}
      </header>

      <main className="max-w-2xl mx-auto p-6">
        <AnimatePresence mode="wait">
          {/* Menu */}
          {gameState === "menu" && (
            <motion.div
              key="menu"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center py-8"
            >
              <div className="w-24 h-24 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-pink-500 to-purple-500 flex items-center justify-center">
                <Brain className="w-12 h-12 text-white" />
              </div>
              <h1 className="text-4xl font-bold mb-2">Memory Party</h1>
              <p className="text-zinc-400 mb-8">Trouve toutes les paires le plus vite possible !</p>

              {/* Difficulty Selection */}
              <div className="mb-8">
                <p className="text-sm text-zinc-500 mb-3">Choisis la difficulté:</p>
                <div className="flex gap-3 justify-center">
                  {(["easy", "medium", "hard"] as Difficulty[]).map((d) => (
                    <button
                      key={d}
                      onClick={() => setDifficulty(d)}
                      className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                        difficulty === d
                          ? d === "easy"
                            ? "bg-green-500 text-white"
                            : d === "medium"
                            ? "bg-yellow-500 text-black"
                            : "bg-red-500 text-white"
                          : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                      }`}
                    >
                      {d === "easy" ? "Facile" : d === "medium" ? "Normal" : "Difficile"}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-8 p-4 rounded-xl bg-zinc-800/50">
                <div className="text-center">
                  <p className="text-2xl font-bold text-pink-400">{config.pairs}</p>
                  <p className="text-xs text-zinc-500">Paires</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-cyan-400">{config.timeLimit}s</p>
                  <p className="text-xs text-zinc-500">Temps</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-yellow-400">{config.gridCols}</p>
                  <p className="text-xs text-zinc-500">Colonnes</p>
                </div>
              </div>

              <button
                onClick={startGame}
                className="px-8 py-4 rounded-xl bg-gradient-to-r from-pink-500 to-purple-500 text-white font-bold text-lg hover:opacity-90 transition-opacity"
              >
                Commencer
              </button>
            </motion.div>
          )}

          {/* Countdown */}
          {gameState === "countdown" && (
            <motion.div
              key="countdown"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.5 }}
              className="text-center py-32"
            >
              <motion.div
                key={countdown}
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 1.5, opacity: 0 }}
                className="text-9xl font-bold text-pink-400"
              >
                {countdown}
              </motion.div>
              <p className="text-zinc-400 mt-4">Mémorise bien les positions...</p>
            </motion.div>
          )}

          {/* Playing */}
          {gameState === "playing" && (
            <motion.div
              key="playing"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              {/* Stats */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <span className="text-sm text-zinc-400">
                    Paires: {matchedPairs}/{config.pairs}
                  </span>
                  <span className="text-sm text-zinc-400">Coups: {moves}</span>
                </div>
                {combo >= 2 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="px-2 py-1 rounded bg-orange-500/20 text-orange-400 text-xs font-medium flex items-center gap-1"
                  >
                    <Zap className="w-3 h-3" /> Combo x{combo}
                  </motion.span>
                )}
              </div>

              {/* Progress */}
              <div className="mb-6">
                <div className="h-2 rounded-full bg-zinc-800 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(matchedPairs / config.pairs) * 100}%` }}
                    className="h-full rounded-full bg-gradient-to-r from-pink-500 to-purple-500"
                  />
                </div>
              </div>

              {/* Cards Grid */}
              <div
                className="grid gap-3"
                style={{ gridTemplateColumns: `repeat(${config.gridCols}, 1fr)` }}
              >
                {cards.map((card) => {
                  const iconData = CARD_ICONS[card.iconIndex]
                  const Icon = iconData?.icon || Music

                  return (
                    <motion.button
                      key={card.id}
                      onClick={() => handleCardClick(card.id)}
                      className={`aspect-square rounded-xl relative transition-all ${
                        card.isMatched
                          ? "bg-green-500/20 border-2 border-green-500/50"
                          : card.isFlipped
                          ? "bg-zinc-800"
                          : "bg-zinc-800 hover:bg-zinc-700"
                      }`}
                      whileHover={!card.isFlipped && !card.isMatched ? { scale: 1.05 } : {}}
                      whileTap={!card.isFlipped && !card.isMatched ? { scale: 0.95 } : {}}
                      disabled={card.isMatched || isLocked}
                    >
                      <AnimatePresence>
                        {(card.isFlipped || card.isMatched) && (
                          <motion.div
                            initial={{ rotateY: 180, opacity: 0 }}
                            animate={{ rotateY: 0, opacity: 1 }}
                            exit={{ rotateY: 180, opacity: 0 }}
                            className="absolute inset-0 flex items-center justify-center"
                          >
                            <Icon
                              className="w-8 h-8"
                              style={{ color: iconData?.color || "#fff" }}
                            />
                          </motion.div>
                        )}
                      </AnimatePresence>
                      {!card.isFlipped && !card.isMatched && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-8 h-8 rounded-lg bg-zinc-700" />
                        </div>
                      )}
                    </motion.button>
                  )
                })}
              </div>
            </motion.div>
          )}

          {/* Game Over */}
          {gameState === "gameover" && (
            <motion.div
              key="gameover"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center py-8"
            >
              <div className="w-24 h-24 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center">
                <Trophy className="w-12 h-12 text-white" />
              </div>

              <h1 className="text-3xl font-bold mb-2">
                {matchedPairs === config.pairs ? "Félicitations !" : "Temps écoulé !"}
              </h1>
              <p className="text-zinc-400 mb-6">
                {matchedPairs === config.pairs
                  ? "Tu as trouvé toutes les paires !"
                  : `Tu as trouvé ${matchedPairs}/${config.pairs} paires`}
              </p>

              {/* Stars */}
              <div className="flex justify-center gap-2 mb-6">
                {[...Array(3)].map((_, i) => (
                  <motion.div
                    key={i}
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ delay: i * 0.2 }}
                  >
                    <Star
                      className={`w-10 h-10 ${
                        i < getStarRating() ? "text-yellow-400 fill-yellow-400" : "text-zinc-700"
                      }`}
                    />
                  </motion.div>
                ))}
              </div>

              {/* Score */}
              <div className="p-6 rounded-2xl bg-gradient-to-br from-pink-500/20 to-purple-500/20 border border-pink-500/30 mb-6">
                <p className="text-5xl font-bold text-white mb-2">{score.toLocaleString()}</p>
                <p className="text-zinc-400">points</p>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4 mb-8">
                <div className="p-4 rounded-xl bg-zinc-800/50">
                  <p className="text-2xl font-bold text-pink-400">{matchedPairs}</p>
                  <p className="text-xs text-zinc-500">Paires trouvées</p>
                </div>
                <div className="p-4 rounded-xl bg-zinc-800/50">
                  <p className="text-2xl font-bold text-cyan-400">{moves}</p>
                  <p className="text-xs text-zinc-500">Coups joués</p>
                </div>
                <div className="p-4 rounded-xl bg-zinc-800/50">
                  <p className="text-2xl font-bold text-orange-400">{maxCombo}</p>
                  <p className="text-xs text-zinc-500">Max combo</p>
                </div>
              </div>

              {/* XP Earned */}
              <div className="p-4 rounded-xl bg-yellow-500/20 border border-yellow-500/30 mb-6">
                <div className="flex items-center justify-center gap-2">
                  <Star className="w-5 h-5 text-yellow-400" />
                  <span className="text-lg font-bold text-yellow-400">
                    +{Math.floor(score / 10)} XP gagné
                  </span>
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={startGame}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-pink-500 to-purple-500 text-white font-bold hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                >
                  <RotateCcw className="w-5 h-5" />
                  Rejouer
                </button>
                <Link
                  href="/gamification-demo"
                  className="flex-1 py-3 rounded-xl bg-zinc-800 text-white font-bold hover:bg-zinc-700 transition-colors text-center"
                >
                  Retour
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  )
}
