/**
 * TEENS PARTY MOROCCO - Quiz Challenge Component
 * ===============================================
 *
 * Composant de quiz interactif.
 */

"use client"

import { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Brain,
  Clock,
  Check,
  X,
  ChevronRight,
  Zap,
  Trophy,
  Star,
  Loader2,
} from "lucide-react"
import confetti from "canvas-confetti"
import {
  type QuizQuestion,
  type QuizAnswer,
  QUIZ_DIFFICULTY_CONFIG,
  QUIZ_CATEGORY_CONFIG,
  getQuizResultMessage,
} from "../../features/special-challenges"

/* ==========================================================================
   TYPES
   ========================================================================== */

interface QuizChallengeProps {
  questions: QuizQuestion[]
  onComplete: (answers: QuizAnswer[], totalTime: number) => Promise<void>
  onCancel: () => void
  timeLimit?: number // Temps total en secondes (optionnel)
}

interface QuizResultProps {
  score: number
  correctCount: number
  totalQuestions: number
  totalTime: number
  xpEarned: number
  onClose: () => void
}

/* ==========================================================================
   MAIN QUIZ COMPONENT
   ========================================================================== */

export function QuizChallenge({
  questions,
  onComplete,
  onCancel,
  timeLimit,
}: QuizChallengeProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<QuizAnswer[]>([])
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null)
  const [isAnswerRevealed, setIsAnswerRevealed] = useState(false)
  const [questionStartTime, setQuestionStartTime] = useState(Date.now())
  const [totalStartTime] = useState(Date.now())
  const [timeRemaining, setTimeRemaining] = useState(
    questions[0]?.time_limit || 30
  )
  const [isSubmitting, setIsSubmitting] = useState(false)

  const currentQuestion = questions[currentIndex]
  const isLastQuestion = currentIndex === questions.length - 1

  // Timer for current question
  useEffect(() => {
    if (isAnswerRevealed) return

    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          // Temps écoulé, passer à la suite
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
      // Pas de réponse, enregistrer comme faux
      const timeTaken = Date.now() - questionStartTime
      setAnswers((prev) => [
        ...prev,
        {
          question_id: currentQuestion.question_id,
          answer_index: -1, // Pas de réponse
          time_taken_ms: timeTaken,
        },
      ])
      setIsAnswerRevealed(true)

      // Passer à la question suivante après un délai
      setTimeout(() => {
        if (isLastQuestion) {
          handleQuizComplete()
        } else {
          goToNextQuestion()
        }
      }, 2000)
    }
  }, [selectedAnswer, currentQuestion, questionStartTime, isLastQuestion])

  const handleSelectAnswer = (index: number) => {
    if (isAnswerRevealed) return

    setSelectedAnswer(index)
    setIsAnswerRevealed(true)

    const timeTaken = Date.now() - questionStartTime

    setAnswers((prev) => [
      ...prev,
      {
        question_id: currentQuestion.question_id,
        answer_index: index,
        time_taken_ms: timeTaken,
      },
    ])

    // Attendre avant de passer à la suite
    setTimeout(() => {
      if (isLastQuestion) {
        handleQuizComplete()
      } else {
        goToNextQuestion()
      }
    }, 1500)
  }

  const goToNextQuestion = () => {
    setCurrentIndex((prev) => prev + 1)
    setSelectedAnswer(null)
    setIsAnswerRevealed(false)
    setQuestionStartTime(Date.now())
    setTimeRemaining(questions[currentIndex + 1]?.time_limit || 30)
  }

  const handleQuizComplete = async () => {
    setIsSubmitting(true)
    const totalTime = Date.now() - totalStartTime
    await onComplete(answers, totalTime)
    setIsSubmitting(false)
  }

  if (isSubmitting) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="w-12 h-12 text-cyan-400 animate-spin mb-4" />
        <p className="text-white font-medium">Calcul de ton score...</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-green-400" />
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
          className="h-full bg-gradient-to-r from-cyan-500 to-purple-500"
          initial={{ width: 0 }}
          animate={{
            width: `${((currentIndex + 1) / questions.length) * 100}%`,
          }}
        />
      </div>

      {/* Question */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentQuestion.question_id}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="space-y-4"
        >
          {/* Question Info */}
          <div className="flex items-center gap-2">
            <span
              className={`text-xs px-2 py-0.5 rounded-full ${
                QUIZ_CATEGORY_CONFIG[currentQuestion.category].color
              } bg-white/10`}
            >
              {QUIZ_CATEGORY_CONFIG[currentQuestion.category].label}
            </span>
            <span
              className={`text-xs px-2 py-0.5 rounded-full ${
                QUIZ_DIFFICULTY_CONFIG[currentQuestion.difficulty].color
              } bg-white/10`}
            >
              {QUIZ_DIFFICULTY_CONFIG[currentQuestion.difficulty].label}
            </span>
            <span className="text-xs text-yellow-400">
              +{currentQuestion.points} pts
            </span>
          </div>

          {/* Question Text */}
          <div className="p-4 rounded-xl bg-zinc-800/50 border border-zinc-700">
            {currentQuestion.image_url && (
              <img
                src={currentQuestion.image_url}
                alt="Question"
                className="w-full h-48 object-cover rounded-lg mb-4"
              />
            )}
            <h3 className="text-lg font-bold text-white">
              {currentQuestion.question}
            </h3>
          </div>

          {/* Options */}
          <div className="space-y-2">
            {currentQuestion.options.map((option, index) => {
              const isSelected = selectedAnswer === index
              const isCorrect = false // On ne connaît pas la bonne réponse côté client

              let optionClass =
                "w-full p-4 rounded-xl border text-left transition-all"

              if (isAnswerRevealed) {
                if (isSelected) {
                  optionClass +=
                    " border-cyan-500 bg-cyan-500/20 text-cyan-400"
                } else {
                  optionClass += " border-zinc-700 bg-zinc-800/30 text-zinc-500"
                }
              } else {
                optionClass +=
                  " border-zinc-700 bg-zinc-800/50 text-white hover:border-zinc-600 hover:bg-zinc-800"
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
                        isSelected
                          ? "bg-cyan-500 text-black"
                          : "bg-zinc-700 text-zinc-400"
                      }`}
                    >
                      {String.fromCharCode(65 + index)}
                    </span>
                    <span className="flex-1">{option.text}</span>
                    {isAnswerRevealed && isSelected && (
                      <div className="w-6 h-6 rounded-full bg-cyan-500/20 flex items-center justify-center">
                        <Check className="w-4 h-4 text-cyan-400" />
                      </div>
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

export function QuizResult({
  score,
  correctCount,
  totalQuestions,
  totalTime,
  xpEarned,
  onClose,
}: QuizResultProps) {
  const percentage = Math.round((correctCount / totalQuestions) * 100)
  const resultMessage = getQuizResultMessage(correctCount, totalQuestions)

  // Confetti pour les bons résultats
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
      <p className="text-6xl mb-4">{resultMessage.emoji}</p>

      {/* Title */}
      <h2 className="text-2xl font-bold text-white mb-2">
        {resultMessage.title}
      </h2>
      <p className="text-zinc-400 mb-6">{resultMessage.subtitle}</p>

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
            stroke="url(#gradient)"
            strokeWidth="8"
            strokeLinecap="round"
            initial={{ strokeDasharray: "0 352" }}
            animate={{
              strokeDasharray: `${(percentage / 100) * 352} 352`,
            }}
            transition={{ duration: 1, ease: "easeOut" }}
          />
          <defs>
            <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#06b6d4" />
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
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="p-3 rounded-xl bg-zinc-800/50">
          <Trophy className="w-5 h-5 text-yellow-400 mx-auto mb-1" />
          <p className="text-xl font-bold text-white">{score}</p>
          <p className="text-xs text-zinc-400">Points</p>
        </div>
        <div className="p-3 rounded-xl bg-zinc-800/50">
          <Clock className="w-5 h-5 text-cyan-400 mx-auto mb-1" />
          <p className="text-xl font-bold text-white">
            {Math.round(totalTime / 1000)}s
          </p>
          <p className="text-xs text-zinc-400">Temps</p>
        </div>
        <div className="p-3 rounded-xl bg-zinc-800/50">
          <Zap className="w-5 h-5 text-yellow-400 mx-auto mb-1" />
          <p className="text-xl font-bold text-yellow-400">+{xpEarned}</p>
          <p className="text-xs text-zinc-400">XP</p>
        </div>
      </div>

      {/* Close Button */}
      <button
        onClick={onClose}
        className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-500 text-white font-semibold"
      >
        Continuer
      </button>
    </motion.div>
  )
}

/* ==========================================================================
   QUIZ INTRO
   ========================================================================== */

interface QuizIntroProps {
  title: string
  description?: string
  questionCount: number
  timePerQuestion: number
  xpReward: number
  onStart: () => void
  onCancel: () => void
}

export function QuizIntro({
  title,
  description,
  questionCount,
  timePerQuestion,
  xpReward,
  onStart,
  onCancel,
}: QuizIntroProps) {
  return (
    <div className="text-center py-8">
      <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex items-center justify-center">
        <Brain className="w-10 h-10 text-green-400" />
      </div>

      <h2 className="text-2xl font-bold text-white mb-2">{title}</h2>
      {description && (
        <p className="text-zinc-400 mb-6">{description}</p>
      )}

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
        <h3 className="font-medium text-white mb-2">Règles</h3>
        <ul className="space-y-1 text-sm text-zinc-400">
          <li>• Réponds le plus vite possible pour plus de points</li>
          <li>• Chaque bonne réponse rapporte des points</li>
          <li>• Le temps est limité pour chaque question</li>
        </ul>
      </div>

      {/* Buttons */}
      <div className="space-y-2">
        <button
          onClick={onStart}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 text-white font-bold hover:opacity-90 transition-opacity"
        >
          Commencer le Quiz
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
