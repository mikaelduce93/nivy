"use client"

import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Music,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Timer,
  Trophy,
  Star,
  ArrowLeft,
  CheckCircle,
  XCircle,
  Zap,
  Heart,
} from "lucide-react"
import Link from "next/link"

// Questions du quiz musical
const QUESTIONS = [
  {
    id: 1,
    songTitle: "Blinding Lights",
    artist: "The Weeknd",
    year: 2020,
    genre: "Synthwave/Pop",
    audioUrl: "/audio/blinding-lights.mp3", // placeholder
    options: ["The Weeknd", "Dua Lipa", "Post Malone", "Bruno Mars"],
    correctAnswer: 0,
    difficulty: "easy",
    points: 100,
  },
  {
    id: 2,
    songTitle: "Bad Guy",
    artist: "Billie Eilish",
    year: 2019,
    genre: "Electropop",
    audioUrl: "/audio/bad-guy.mp3",
    options: ["Ariana Grande", "Billie Eilish", "Doja Cat", "Olivia Rodrigo"],
    correctAnswer: 1,
    difficulty: "easy",
    points: 100,
  },
  {
    id: 3,
    songTitle: "Starboy",
    artist: "The Weeknd ft. Daft Punk",
    year: 2016,
    genre: "R&B/Electro",
    audioUrl: "/audio/starboy.mp3",
    options: ["Drake", "The Weeknd", "Travis Scott", "Kendrick Lamar"],
    correctAnswer: 1,
    difficulty: "medium",
    points: 150,
  },
  {
    id: 4,
    songTitle: "Shape of You",
    artist: "Ed Sheeran",
    year: 2017,
    genre: "Pop",
    audioUrl: "/audio/shape-of-you.mp3",
    options: ["Ed Sheeran", "Justin Bieber", "Shawn Mendes", "Charlie Puth"],
    correctAnswer: 0,
    difficulty: "easy",
    points: 100,
  },
  {
    id: 5,
    songTitle: "Uptown Funk",
    artist: "Mark Ronson ft. Bruno Mars",
    year: 2014,
    genre: "Funk/Pop",
    audioUrl: "/audio/uptown-funk.mp3",
    options: ["Pharrell Williams", "Bruno Mars", "Jason Derulo", "Chris Brown"],
    correctAnswer: 1,
    difficulty: "easy",
    points: 100,
  },
  {
    id: 6,
    songTitle: "Sicko Mode",
    artist: "Travis Scott",
    year: 2018,
    genre: "Hip-Hop/Trap",
    audioUrl: "/audio/sicko-mode.mp3",
    options: ["Drake", "Kanye West", "Travis Scott", "Future"],
    correctAnswer: 2,
    difficulty: "medium",
    points: 150,
  },
  {
    id: 7,
    songTitle: "Old Town Road",
    artist: "Lil Nas X",
    year: 2019,
    genre: "Country Rap",
    audioUrl: "/audio/old-town-road.mp3",
    options: ["Post Malone", "Lil Nas X", "DaBaby", "Jack Harlow"],
    correctAnswer: 1,
    difficulty: "easy",
    points: 100,
  },
  {
    id: 8,
    songTitle: "Levitating",
    artist: "Dua Lipa",
    year: 2020,
    genre: "Disco/Pop",
    audioUrl: "/audio/levitating.mp3",
    options: ["Dua Lipa", "Ava Max", "Bebe Rexha", "Rita Ora"],
    correctAnswer: 0,
    difficulty: "medium",
    points: 150,
  },
  {
    id: 9,
    songTitle: "God's Plan",
    artist: "Drake",
    year: 2018,
    genre: "Hip-Hop",
    audioUrl: "/audio/gods-plan.mp3",
    options: ["J. Cole", "Kendrick Lamar", "Drake", "Post Malone"],
    correctAnswer: 2,
    difficulty: "easy",
    points: 100,
  },
  {
    id: 10,
    songTitle: "Bohemian Rhapsody",
    artist: "Queen",
    year: 1975,
    genre: "Rock",
    audioUrl: "/audio/bohemian-rhapsody.mp3",
    options: ["Led Zeppelin", "Queen", "Pink Floyd", "The Beatles"],
    correctAnswer: 1,
    difficulty: "hard",
    points: 200,
  },
]

type GameState = "menu" | "countdown" | "playing" | "result" | "gameover"

export default function QuizMusicalPage() {
  const [gameState, setGameState] = useState<GameState>("menu")
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [score, setScore] = useState(0)
  const [streak, setStreak] = useState(0)
  const [maxStreak, setMaxStreak] = useState(0)
  const [timeLeft, setTimeLeft] = useState(15)
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null)
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null)
  const [lives, setLives] = useState(3)
  const [countdown, setCountdown] = useState(3)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [showHint, setShowHint] = useState(false)
  const [usedHint, setUsedHint] = useState(false)
  const [correctAnswers, setCorrectAnswers] = useState(0)
  const [wrongAnswers, setWrongAnswers] = useState(0)

  const timerRef = useRef<NodeJS.Timeout | null>(null)

  const question = QUESTIONS[currentQuestion]

  // Countdown avant le jeu
  useEffect(() => {
    if (gameState === "countdown") {
      const interval = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(interval)
            setGameState("playing")
            setIsPlaying(true)
            return 3
          }
          return prev - 1
        })
      }, 1000)
      return () => clearInterval(interval)
    }
  }, [gameState])

  // Timer pour chaque question
  useEffect(() => {
    if (gameState === "playing" && timeLeft > 0 && selectedAnswer === null) {
      timerRef.current = setTimeout(() => {
        setTimeLeft((prev) => prev - 1)
      }, 1000)
    } else if (timeLeft === 0 && selectedAnswer === null) {
      handleTimeout()
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [gameState, timeLeft, selectedAnswer])

  const startGame = () => {
    setGameState("countdown")
    setCurrentQuestion(0)
    setScore(0)
    setStreak(0)
    setMaxStreak(0)
    setLives(3)
    setCorrectAnswers(0)
    setWrongAnswers(0)
  }

  const handleAnswer = (answerIndex: number) => {
    if (selectedAnswer !== null) return

    setSelectedAnswer(answerIndex)
    setIsPlaying(false)
    const correct = answerIndex === question.correctAnswer

    if (correct) {
      const timeBonus = Math.floor(timeLeft * 5)
      const streakBonus = streak >= 3 ? Math.floor(question.points * 0.5) : 0
      const hintPenalty = usedHint ? Math.floor(question.points * 0.3) : 0
      const totalPoints = question.points + timeBonus + streakBonus - hintPenalty

      setScore((prev) => prev + totalPoints)
      setStreak((prev) => prev + 1)
      setMaxStreak((prev) => Math.max(prev, streak + 1))
      setCorrectAnswers((prev) => prev + 1)
      setIsCorrect(true)
    } else {
      setStreak(0)
      setLives((prev) => prev - 1)
      setWrongAnswers((prev) => prev + 1)
      setIsCorrect(false)
    }

    setGameState("result")
  }

  const handleTimeout = () => {
    setStreak(0)
    setLives((prev) => prev - 1)
    setWrongAnswers((prev) => prev + 1)
    setIsCorrect(false)
    setGameState("result")
  }

  const nextQuestion = () => {
    if (lives <= 0) {
      setGameState("gameover")
      return
    }

    if (currentQuestion + 1 >= QUESTIONS.length) {
      setGameState("gameover")
      return
    }

    setCurrentQuestion((prev) => prev + 1)
    setSelectedAnswer(null)
    setIsCorrect(null)
    setTimeLeft(15)
    setUsedHint(false)
    setShowHint(false)
    setGameState("playing")
    setIsPlaying(true)
  }

  const useHint = () => {
    if (usedHint) return
    setUsedHint(true)
    setShowHint(true)
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "easy":
        return "text-green-400"
      case "medium":
        return "text-yellow-400"
      case "hard":
        return "text-red-400"
      default:
        return "text-zinc-400"
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-zinc-900 to-zinc-950 text-white">
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
            <div className="flex items-center gap-1">
              {[...Array(3)].map((_, i) => (
                <Heart
                  key={i}
                  className={`w-5 h-5 ${i < lives ? "text-red-500 fill-red-500" : "text-zinc-700"}`}
                />
              ))}
            </div>
            <div className="px-3 py-1 rounded-lg bg-zinc-800 text-yellow-400 font-bold">
              {score.toLocaleString()} pts
            </div>
          </div>
        )}

        <button
          onClick={() => setIsMuted(!isMuted)}
          className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition-colors"
        >
          {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
        </button>
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
              className="text-center py-12"
            >
              <div className="w-24 h-24 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <Music className="w-12 h-12 text-white" />
              </div>
              <h1 className="text-4xl font-bold mb-2">Quiz Musical</h1>
              <p className="text-zinc-400 mb-8">Devine l'artiste en quelques secondes !</p>

              <div className="grid grid-cols-3 gap-4 mb-8 p-4 rounded-xl bg-zinc-800/50">
                <div className="text-center">
                  <p className="text-2xl font-bold text-purple-400">10</p>
                  <p className="text-xs text-zinc-500">Questions</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-yellow-400">15s</p>
                  <p className="text-xs text-zinc-500">Par question</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-red-400">3</p>
                  <p className="text-xs text-zinc-500">Vies</p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-zinc-800/50 mb-8 text-left">
                <h3 className="font-bold mb-2">Comment jouer:</h3>
                <ul className="text-sm text-zinc-400 space-y-1">
                  <li>• Écoute l'extrait musical</li>
                  <li>• Devine qui est l'artiste</li>
                  <li>• Plus tu réponds vite, plus tu gagnes de points</li>
                  <li>• Les combos augmentent ton score</li>
                </ul>
              </div>

              <button
                onClick={startGame}
                className="px-8 py-4 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold text-lg hover:opacity-90 transition-opacity"
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
                className="text-9xl font-bold text-purple-400"
              >
                {countdown}
              </motion.div>
              <p className="text-zinc-400 mt-4">Prépare-toi...</p>
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
              {/* Progress */}
              <div className="flex items-center justify-between mb-6">
                <span className="text-sm text-zinc-400">
                  Question {currentQuestion + 1}/{QUESTIONS.length}
                </span>
                <div className="flex items-center gap-2">
                  {streak >= 3 && (
                    <span className="px-2 py-1 rounded bg-orange-500/20 text-orange-400 text-xs font-medium flex items-center gap-1">
                      <Zap className="w-3 h-3" /> x{streak}
                    </span>
                  )}
                  <span className={`text-sm font-medium ${getDifficultyColor(question.difficulty)}`}>
                    {question.difficulty.toUpperCase()}
                  </span>
                </div>
              </div>

              {/* Timer */}
              <div className="mb-6">
                <div className="h-2 rounded-full bg-zinc-800 overflow-hidden">
                  <motion.div
                    initial={{ width: "100%" }}
                    animate={{ width: `${(timeLeft / 15) * 100}%` }}
                    className={`h-full rounded-full ${
                      timeLeft > 10 ? "bg-green-500" : timeLeft > 5 ? "bg-yellow-500" : "bg-red-500"
                    }`}
                  />
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-xs text-zinc-500">Temps restant</span>
                  <span className={`text-sm font-bold ${timeLeft <= 5 ? "text-red-400" : "text-white"}`}>
                    {timeLeft}s
                  </span>
                </div>
              </div>

              {/* Audio Player Placeholder */}
              <div className="p-6 rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 mb-6">
                <div className="flex items-center justify-center gap-4">
                  <button
                    onClick={() => setIsPlaying(!isPlaying)}
                    className="w-16 h-16 rounded-full bg-purple-500 flex items-center justify-center hover:bg-purple-400 transition-colors"
                  >
                    {isPlaying ? (
                      <Pause className="w-8 h-8 text-white" />
                    ) : (
                      <Play className="w-8 h-8 text-white ml-1" />
                    )}
                  </button>
                </div>
                <p className="text-center text-sm text-zinc-400 mt-4">
                  {isPlaying ? "♪ En lecture..." : "Appuie pour écouter"}
                </p>

                {/* Hint */}
                {showHint && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-4 p-3 rounded-lg bg-yellow-500/20 text-center"
                  >
                    <p className="text-sm text-yellow-400">
                      Indice: {question.genre} • {question.year}
                    </p>
                  </motion.div>
                )}
              </div>

              {/* Question */}
              <h2 className="text-xl font-bold text-center mb-6">Qui chante cette chanson ?</h2>

              {/* Options */}
              <div className="grid grid-cols-2 gap-3">
                {question.options.map((option, index) => (
                  <button
                    key={index}
                    onClick={() => handleAnswer(index)}
                    disabled={selectedAnswer !== null}
                    className={`p-4 rounded-xl border-2 text-left font-medium transition-all ${
                      showHint && index === question.correctAnswer
                        ? "border-yellow-500/50 bg-yellow-500/10"
                        : "border-zinc-700 bg-zinc-800/50 hover:border-purple-500 hover:bg-purple-500/10"
                    }`}
                  >
                    <span className="text-zinc-500 mr-2">{String.fromCharCode(65 + index)}.</span>
                    {option}
                  </button>
                ))}
              </div>

              {/* Hint Button */}
              {!usedHint && (
                <button
                  onClick={useHint}
                  className="w-full mt-4 py-2 rounded-lg bg-zinc-800 text-zinc-400 text-sm hover:bg-zinc-700 transition-colors"
                >
                  Utiliser un indice (-30% points)
                </button>
              )}
            </motion.div>
          )}

          {/* Result */}
          {gameState === "result" && (
            <motion.div
              key="result"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.1 }}
              className="text-center py-8"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", bounce: 0.5 }}
                className={`w-24 h-24 mx-auto mb-6 rounded-full flex items-center justify-center ${
                  isCorrect ? "bg-green-500" : "bg-red-500"
                }`}
              >
                {isCorrect ? (
                  <CheckCircle className="w-12 h-12 text-white" />
                ) : (
                  <XCircle className="w-12 h-12 text-white" />
                )}
              </motion.div>

              <h2 className="text-2xl font-bold mb-2">
                {isCorrect ? "Bravo !" : "Dommage !"}
              </h2>

              <p className="text-zinc-400 mb-6">
                La bonne réponse était: <span className="text-white font-medium">{question.artist}</span>
              </p>

              <div className="p-4 rounded-xl bg-zinc-800/50 mb-6">
                <p className="text-sm text-zinc-500 mb-1">"{question.songTitle}"</p>
                <p className="text-zinc-400">{question.genre} • {question.year}</p>
              </div>

              {isCorrect && (
                <div className="flex justify-center gap-4 mb-6">
                  <div className="text-center">
                    <p className="text-xl font-bold text-yellow-400">+{question.points}</p>
                    <p className="text-xs text-zinc-500">Base</p>
                  </div>
                  {timeLeft > 0 && (
                    <div className="text-center">
                      <p className="text-xl font-bold text-cyan-400">+{Math.floor(timeLeft * 5)}</p>
                      <p className="text-xs text-zinc-500">Temps</p>
                    </div>
                  )}
                  {streak >= 3 && (
                    <div className="text-center">
                      <p className="text-xl font-bold text-orange-400">+{Math.floor(question.points * 0.5)}</p>
                      <p className="text-xs text-zinc-500">Combo x{streak}</p>
                    </div>
                  )}
                </div>
              )}

              <button
                onClick={nextQuestion}
                className="px-8 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold hover:opacity-90 transition-opacity"
              >
                {lives <= 0 || currentQuestion + 1 >= QUESTIONS.length ? "Voir résultat" : "Question suivante"}
              </button>
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

              <h1 className="text-3xl font-bold mb-2">Partie terminée !</h1>
              <p className="text-zinc-400 mb-8">Voici ton score final</p>

              <div className="p-6 rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 mb-6">
                <p className="text-5xl font-bold text-white mb-2">{score.toLocaleString()}</p>
                <p className="text-zinc-400">points</p>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-8">
                <div className="p-4 rounded-xl bg-zinc-800/50">
                  <p className="text-2xl font-bold text-green-400">{correctAnswers}</p>
                  <p className="text-xs text-zinc-500">Bonnes réponses</p>
                </div>
                <div className="p-4 rounded-xl bg-zinc-800/50">
                  <p className="text-2xl font-bold text-red-400">{wrongAnswers}</p>
                  <p className="text-xs text-zinc-500">Erreurs</p>
                </div>
                <div className="p-4 rounded-xl bg-zinc-800/50">
                  <p className="text-2xl font-bold text-orange-400">{maxStreak}</p>
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
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold hover:opacity-90 transition-opacity"
                >
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
