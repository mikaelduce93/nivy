/**
 * TEENS PARTY MOROCCO - Music Quiz Component
 * ===========================================
 *
 * Composant de quiz musical interactif.
 */

"use client"

import { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Music,
  Clock,
  Check,
  X,
  ChevronRight,
  Zap,
  Trophy,
  Star,
  Loader2,
  Volume2,
  VolumeX,
  Play,
  Pause,
} from "lucide-react"
import confetti from "canvas-confetti"
import {
  type MusicQuizQuestion,
  type QuizGameState,
  DIFFICULTY_CONFIG,
  calculateTimeBonus,
  getResultMessage,
} from "../../features/mini-games"

/* ==========================================================================
   QUIZ GAME COMPONENT
   ========================================================================== */

interface MusicQuizGameProps {
  questions: MusicQuizQuestion[]
  onComplete: (answers: QuizGameState["answers"], totalScore: number) => Promise<void>
  onCancel: () => void
  timePerQuestion?: number
}

export function MusicQuizGame({
  questions,
  onComplete,
  onCancel,
  timePerQuestion = 15,
}: MusicQuizGameProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null)
  const [isAnswerRevealed, setIsAnswerRevealed] = useState(false)
  const [answers, setAnswers] = useState<QuizGameState["answers"]>([])
  const [totalScore, setTotalScore] = useState(0)
  const [timeRemaining, setTimeRemaining] = useState(timePerQuestion)
  const [questionStartTime, setQuestionStartTime] = useState(Date.now())
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)

  const currentQuestion = questions[currentIndex]
  const isLastQuestion = currentIndex === questions.length - 1
  const difficultyConfig = DIFFICULTY_CONFIG[currentQuestion?.difficulty || "medium"]

  // Timer
  useEffect(() => {
    if (isAnswerRevealed || !currentQuestion) return

    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          handleTimeUp()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [currentIndex, isAnswerRevealed])

  const handleTimeUp = useCallback(() => {
    if (selectedAnswer === null) {
      // Pas de réponse
      const timeTaken = Date.now() - questionStartTime
      const newAnswer = {
        questionId: currentQuestion.id,
        answerIndex: -1,
        isCorrect: false,
        timeMs: timeTaken,
      }
      setAnswers((prev) => [...prev, newAnswer])
      setIsAnswerRevealed(true)

      setTimeout(() => {
        if (isLastQuestion) {
          handleQuizComplete([...answers, newAnswer])
        } else {
          goToNextQuestion()
        }
      }, 2000)
    }
  }, [selectedAnswer, currentQuestion, questionStartTime, isLastQuestion, answers])

  const handleSelectAnswer = (index: number) => {
    if (isAnswerRevealed) return

    setSelectedAnswer(index)
    setIsAnswerRevealed(true)

    const timeTaken = Date.now() - questionStartTime
    const correctAnswerIndex = currentQuestion.options?.indexOf(
      currentQuestion.correct_answer
    )
    const isCorrect = index === correctAnswerIndex

    let points = 0
    if (isCorrect) {
      points = calculateTimeBonus(
        timeTaken,
        timePerQuestion * 1000,
        currentQuestion.points
      )
      points = Math.round(points * difficultyConfig.multiplier)

      // Mini celebration
      confetti({
        particleCount: 30,
        spread: 40,
        origin: { y: 0.7 },
      })
    }

    setTotalScore((prev) => prev + points)

    const newAnswer = {
      questionId: currentQuestion.id,
      answerIndex: index,
      isCorrect,
      timeMs: timeTaken,
    }
    setAnswers((prev) => [...prev, newAnswer])

    setTimeout(() => {
      if (isLastQuestion) {
        handleQuizComplete([...answers, newAnswer])
      } else {
        goToNextQuestion()
      }
    }, 1500)
  }

  const goToNextQuestion = () => {
    setCurrentIndex((prev) => prev + 1)
    setSelectedAnswer(null)
    setIsAnswerRevealed(false)
    setTimeRemaining(timePerQuestion)
    setQuestionStartTime(Date.now())
    setIsPlaying(false)
  }

  const handleQuizComplete = async (finalAnswers: QuizGameState["answers"]) => {
    setIsSubmitting(true)
    await onComplete(finalAnswers, totalScore)
    setIsSubmitting(false)
  }

  if (isSubmitting) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="w-12 h-12 text-pink-400 animate-spin mb-4" />
        <p className="text-white font-medium">Calcul de ton score...</p>
      </div>
    )
  }

  const correctAnswerIndex = currentQuestion?.options?.indexOf(
    currentQuestion?.correct_answer
  )

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Music className="w-5 h-5 text-pink-400" />
          <span className="font-bold text-white">
            Question {currentIndex + 1}/{questions.length}
          </span>
        </div>

        {/* Timer */}
        <div
          className={`flex items-center gap-1 px-3 py-1 rounded-full ${
            timeRemaining <= 5
              ? "bg-red-500 text-white animate-pulse"
              : timeRemaining <= 10
              ? "bg-yellow-500 text-black"
              : "bg-zinc-700 text-white"
          }`}
        >
          <Clock className="w-4 h-4" />
          <span className="font-bold">{timeRemaining}s</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-pink-500 to-purple-500"
          initial={{ width: 0 }}
          animate={{
            width: `${((currentIndex + 1) / questions.length) * 100}%`,
          }}
        />
      </div>

      {/* Score */}
      <div className="flex items-center justify-center gap-2">
        <Zap className="w-5 h-5 text-yellow-400" />
        <span className="text-xl font-bold text-yellow-400">
          {totalScore.toLocaleString()} pts
        </span>
      </div>

      {/* Question */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentQuestion.id}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="space-y-4"
        >
          {/* Question Info */}
          <div className="flex items-center gap-2">
            <span
              className={`text-xs px-2 py-0.5 rounded-full bg-white/10 ${difficultyConfig.color}`}
            >
              {difficultyConfig.label}
            </span>
            {currentQuestion.genre && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-zinc-400">
                {currentQuestion.genre}
              </span>
            )}
            <span className="text-xs text-yellow-400 ml-auto">
              +{currentQuestion.points} pts
            </span>
          </div>

          {/* Album Art & Audio */}
          {currentQuestion.album_art_url && (
            <div className="relative rounded-xl overflow-hidden">
              <img
                src={currentQuestion.album_art_url}
                alt="Album"
                className="w-full h-48 object-cover"
              />
              {currentQuestion.audio_preview_url && (
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="absolute bottom-3 right-3 p-3 rounded-full bg-pink-500 text-white"
                >
                  {isPlaying ? (
                    <Pause className="w-6 h-6" />
                  ) : (
                    <Play className="w-6 h-6" />
                  )}
                </button>
              )}
            </div>
          )}

          {/* Question Text */}
          <div className="p-4 rounded-xl bg-zinc-800/50 border border-zinc-700">
            <h3 className="text-lg font-bold text-white">
              {currentQuestion.question_type === "guess_artist"
                ? "Qui chante cette chanson ?"
                : currentQuestion.question_type === "guess_year"
                ? "En quelle année cette chanson est-elle sortie ?"
                : currentQuestion.question_type === "lyrics"
                ? "Complète les paroles"
                : "Quel est le titre de cette chanson ?"}
            </h3>
            {currentQuestion.question_type !== "guess_artist" && (
              <p className="text-zinc-400 mt-1">
                {currentQuestion.question_type === "guess_song"
                  ? `Par ${currentQuestion.artist}`
                  : `"${currentQuestion.song_title}" - ${currentQuestion.artist}`}
              </p>
            )}
          </div>

          {/* Options */}
          <div className="space-y-2">
            {currentQuestion.options?.map((option, index) => {
              const isSelected = selectedAnswer === index
              const isCorrect = index === correctAnswerIndex

              let optionClass =
                "w-full p-4 rounded-xl border text-left transition-all"

              if (isAnswerRevealed) {
                if (isCorrect) {
                  optionClass += " border-green-500 bg-green-500/20 text-green-400"
                } else if (isSelected && !isCorrect) {
                  optionClass += " border-red-500 bg-red-500/20 text-red-400"
                } else {
                  optionClass += " border-zinc-700 bg-zinc-800/30 text-zinc-500"
                }
              } else {
                optionClass +=
                  " border-zinc-700 bg-zinc-800/50 text-white hover:border-pink-500 hover:bg-pink-500/10"
              }

              return (
                <motion.button
                  key={index}
                  onClick={() => handleSelectAnswer(index)}
                  disabled={isAnswerRevealed}
                  whileHover={!isAnswerRevealed ? { scale: 1.01 } : {}}
                  whileTap={!isAnswerRevealed ? { scale: 0.99 } : {}}
                  className={optionClass}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                        isAnswerRevealed && isCorrect
                          ? "bg-green-500 text-white"
                          : isAnswerRevealed && isSelected
                          ? "bg-red-500 text-white"
                          : "bg-zinc-700 text-zinc-400"
                      }`}
                    >
                      {String.fromCharCode(65 + index)}
                    </span>
                    <span className="flex-1">{option}</span>
                    {isAnswerRevealed && isCorrect && (
                      <Check className="w-5 h-5 text-green-400" />
                    )}
                    {isAnswerRevealed && isSelected && !isCorrect && (
                      <X className="w-5 h-5 text-red-400" />
                    )}
                  </div>
                </motion.button>
              )
            })}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Cancel Button */}
      <button
        onClick={onCancel}
        className="w-full py-2 text-zinc-400 hover:text-white text-sm"
      >
        Abandonner le quiz
      </button>
    </div>
  )
}

/* ==========================================================================
   QUIZ RESULT
   ========================================================================== */

interface QuizResultProps {
  score: number
  maxScore: number
  correctCount: number
  totalQuestions: number
  xpEarned: number
  onClose: () => void
  onPlayAgain?: () => void
}

export function QuizResult({
  score,
  maxScore,
  correctCount,
  totalQuestions,
  xpEarned,
  onClose,
  onPlayAgain,
}: QuizResultProps) {
  const percentage = Math.round((correctCount / totalQuestions) * 100)
  const result = getResultMessage(score, maxScore)

  useEffect(() => {
    if (percentage >= 60) {
      confetti({
        particleCount: percentage >= 80 ? 150 : 80,
        spread: 70,
        origin: { y: 0.6 },
      })
    }
  }, [percentage])

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="text-center py-8"
    >
      {/* Emoji */}
      <p className="text-6xl mb-4">{result.emoji}</p>

      {/* Title */}
      <h2 className="text-2xl font-bold text-white mb-2">{result.title}</h2>
      <p className="text-zinc-400 mb-6">{result.subtitle}</p>

      {/* Score Circle */}
      <div className="relative w-32 h-32 mx-auto mb-6">
        <svg className="w-full h-full -rotate-90">
          <circle
            cx="64"
            cy="64"
            r="56"
            fill="none"
            stroke="#27272a"
            strokeWidth="8"
          />
          <motion.circle
            cx="64"
            cy="64"
            r="56"
            fill="none"
            stroke="url(#quizGradient)"
            strokeWidth="8"
            strokeLinecap="round"
            initial={{ strokeDasharray: "0 352" }}
            animate={{
              strokeDasharray: `${(percentage / 100) * 352} 352`,
            }}
            transition={{ duration: 1, ease: "easeOut" }}
          />
          <defs>
            <linearGradient id="quizGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ec4899" />
              <stop offset="100%" stopColor="#8b5cf6" />
            </linearGradient>
          </defs>
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold text-white">{percentage}%</span>
          <span className="text-xs text-zinc-400">
            {correctCount}/{totalQuestions}
          </span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="p-3 rounded-xl bg-zinc-800/50">
          <Trophy className="w-5 h-5 text-yellow-400 mx-auto mb-1" />
          <p className="text-xl font-bold text-white">{score.toLocaleString()}</p>
          <p className="text-xs text-zinc-400">Points</p>
        </div>
        <div className="p-3 rounded-xl bg-zinc-800/50">
          <Zap className="w-5 h-5 text-yellow-400 mx-auto mb-1" />
          <p className="text-xl font-bold text-yellow-400">+{xpEarned}</p>
          <p className="text-xs text-zinc-400">XP</p>
        </div>
      </div>

      {/* Buttons */}
      <div className="space-y-2">
        {onPlayAgain && (
          <button
            onClick={onPlayAgain}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-pink-500 to-purple-500 text-white font-semibold"
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
   QUIZ INTRO
   ========================================================================== */

interface QuizIntroProps {
  questionCount: number
  timePerQuestion: number
  xpReward: number
  onStart: () => void
  onCancel: () => void
}

export function QuizIntro({
  questionCount,
  timePerQuestion,
  xpReward,
  onStart,
  onCancel,
}: QuizIntroProps) {
  return (
    <div className="text-center py-8">
      <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-pink-500/20 to-purple-500/20 flex items-center justify-center">
        <Music className="w-10 h-10 text-pink-400" />
      </div>

      <h2 className="text-2xl font-bold text-white mb-2">Quiz Musical</h2>
      <p className="text-zinc-400 mb-6">
        Teste tes connaissances musicales !
      </p>

      {/* Info Cards */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        <div className="p-3 rounded-xl bg-zinc-800/50 border border-zinc-700">
          <p className="text-2xl font-bold text-white">{questionCount}</p>
          <p className="text-xs text-zinc-400">Questions</p>
        </div>
        <div className="p-3 rounded-xl bg-zinc-800/50 border border-zinc-700">
          <p className="text-2xl font-bold text-white">{timePerQuestion}s</p>
          <p className="text-xs text-zinc-400">Par question</p>
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
          <li>• Écoute l'extrait ou lis la question</li>
          <li>• Réponds le plus vite possible pour plus de points</li>
          <li>• Chaque bonne réponse rapporte des points</li>
        </ul>
      </div>

      {/* Buttons */}
      <div className="space-y-2">
        <button
          onClick={onStart}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-pink-500 to-purple-500 text-white font-bold hover:opacity-90 transition-opacity"
        >
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
