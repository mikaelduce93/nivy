"use client"

import { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Clock,
  CheckCircle2,
  XCircle,
  ChevronRight,
  ChevronLeft,
  Trophy,
  Zap,
  RotateCcw,
  Home,
  AlertCircle,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

/* ==========================================================================
   TYPES
   ========================================================================== */

interface QuizQuestion {
  question: string
  options: string[]
  correct: number
}

interface Quiz {
  id: string
  code: string
  title: string
  description: string
  subject: string
  difficulty: string
  questions: QuizQuestion[]
  time_limit_minutes: number
  passing_score: number
  xp_reward: number
}

interface QuizResult {
  question: string
  userAnswer: number
  correctAnswer: number
  isCorrect: boolean
}

interface QuizAttemptResult {
  id: string
  score: number
  passed: boolean
  correctCount: number
  totalQuestions: number
  xpEarned: number
  results: QuizResult[]
}

/* ==========================================================================
   QUIZ PLAYER COMPONENT
   ========================================================================== */

interface QuizPlayerProps {
  quiz: Quiz
  teenId: string
  onComplete: (result: QuizAttemptResult) => void
  onExit: () => void
}

export function QuizPlayer({ quiz, teenId, onComplete, onExit }: QuizPlayerProps) {
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [answers, setAnswers] = useState<(number | null)[]>(
    new Array(quiz.questions.length).fill(null)
  )
  const [timeLeft, setTimeLeft] = useState(quiz.time_limit_minutes * 60)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showConfirmExit, setShowConfirmExit] = useState(false)

  const totalQuestions = quiz.questions.length
  const answeredCount = answers.filter((a) => a !== null).length
  const progress = (answeredCount / totalQuestions) * 100

  // Timer
  useEffect(() => {
    if (timeLeft <= 0) {
      handleSubmit()
      return
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1)
    }, 1000)

    return () => clearInterval(timer)
  }, [timeLeft])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  const handleAnswerSelect = (optionIndex: number) => {
    const newAnswers = [...answers]
    newAnswers[currentQuestion] = optionIndex
    setAnswers(newAnswers)
  }

  const handleNext = () => {
    if (currentQuestion < totalQuestions - 1) {
      setCurrentQuestion((prev) => prev + 1)
    }
  }

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion((prev) => prev - 1)
    }
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)

    try {
      const response = await fetch("/api/teen/education/quizzes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teenId,
          quizId: quiz.id,
          answers: answers.map((a) => a ?? -1), // -1 for unanswered
          timeSpent: quiz.time_limit_minutes * 60 - timeLeft,
        }),
      })

      const data = await response.json()

      if (data.success) {
        onComplete(data.attempt)
      }
    } catch (error) {
      console.error("Error submitting quiz:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const currentQ = quiz.questions[currentQuestion]
  const isLastQuestion = currentQuestion === totalQuestions - 1
  const canSubmit = answeredCount === totalQuestions

  return (
    <div className="min-h-screen bg-zinc-950 p-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-white">{quiz.title}</h1>
            <p className="text-sm text-zinc-500">{quiz.subject}</p>
          </div>
          <div className="flex items-center gap-4">
            {/* Timer */}
            <motion.div
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl font-mono",
                timeLeft <= 60 ? "bg-red-500/20 text-red-400" :
                timeLeft <= 180 ? "bg-yellow-500/20 text-yellow-400" :
                "bg-zinc-800 text-white"
              )}
              animate={timeLeft <= 60 ? { scale: [1, 1.05, 1] } : {}}
              transition={{ duration: 0.5, repeat: Infinity }}
            >
              <Clock className="w-4 h-4" />
              <span>{formatTime(timeLeft)}</span>
            </motion.div>

            {/* Exit button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowConfirmExit(true)}
              className="text-zinc-400"
            >
              Quitter
            </Button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-zinc-500">
              Question {currentQuestion + 1} / {totalQuestions}
            </span>
            <span className="text-sm text-zinc-500">
              {answeredCount} repondue(s)
            </span>
          </div>
          <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-cyan-500 to-blue-500"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>

        {/* Question card */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentQuestion}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            <Card className="p-6 bg-zinc-900 border-zinc-800">
              <h2 className="text-lg font-medium text-white mb-6">
                {currentQ.question}
              </h2>

              <div className="space-y-3">
                {currentQ.options.map((option, index) => {
                  const isSelected = answers[currentQuestion] === index

                  return (
                    <motion.button
                      key={index}
                      className={cn(
                        "w-full p-4 rounded-xl text-left transition-all",
                        "border-2",
                        isSelected
                          ? "border-cyan-500 bg-cyan-500/10 text-white"
                          : "border-zinc-700 bg-zinc-800/50 text-zinc-300 hover:border-zinc-600"
                      )}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      onClick={() => handleAnswerSelect(index)}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center",
                            "border-2 transition-all",
                            isSelected
                              ? "border-cyan-500 bg-cyan-500 text-white"
                              : "border-zinc-600 text-zinc-400"
                          )}
                        >
                          {String.fromCharCode(65 + index)}
                        </div>
                        <span>{option}</span>
                      </div>
                    </motion.button>
                  )
                })}
              </div>
            </Card>
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-6">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentQuestion === 0}
            className="gap-2"
          >
            <ChevronLeft className="w-4 h-4" />
            Precedent
          </Button>

          <div className="flex gap-2">
            {quiz.questions.map((_, index) => (
              <button
                key={index}
                className={cn(
                  "w-8 h-8 rounded-full text-sm font-medium transition-all",
                  index === currentQuestion
                    ? "bg-cyan-500 text-white"
                    : answers[index] !== null
                    ? "bg-green-500/20 text-green-400"
                    : "bg-zinc-800 text-zinc-500"
                )}
                onClick={() => setCurrentQuestion(index)}
              >
                {index + 1}
              </button>
            ))}
          </div>

          {isLastQuestion ? (
            <Button
              onClick={handleSubmit}
              disabled={!canSubmit || isSubmitting}
              className="gap-2 bg-gradient-to-r from-cyan-500 to-blue-500"
            >
              {isSubmitting ? "Envoi..." : "Terminer"}
              <CheckCircle2 className="w-4 h-4" />
            </Button>
          ) : (
            <Button onClick={handleNext} className="gap-2">
              Suivant
              <ChevronRight className="w-4 h-4" />
            </Button>
          )}
        </div>

        {/* Confirm exit modal */}
        <AnimatePresence>
          {showConfirmExit && (
            <motion.div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                className="bg-zinc-900 rounded-2xl p-6 max-w-md mx-4 border border-zinc-800"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
              >
                <div className="flex items-center gap-3 mb-4">
                  <AlertCircle className="w-6 h-6 text-yellow-500" />
                  <h3 className="text-lg font-bold text-white">Quitter le quiz ?</h3>
                </div>
                <p className="text-zinc-400 mb-6">
                  Ta progression sera perdue. Es-tu sur de vouloir quitter ?
                </p>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setShowConfirmExit(false)}
                  >
                    Continuer
                  </Button>
                  <Button
                    variant="destructive"
                    className="flex-1"
                    onClick={onExit}
                  >
                    Quitter
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

/* ==========================================================================
   QUIZ RESULT COMPONENT
   ========================================================================== */

interface QuizResultProps {
  quiz: Quiz
  result: QuizAttemptResult
  onRetry: () => void
  onExit: () => void
}

export function QuizResult({ quiz, result, onRetry, onExit }: QuizResultProps) {
  const [showDetails, setShowDetails] = useState(false)

  return (
    <div className="min-h-screen bg-zinc-950 p-4">
      <div className="max-w-2xl mx-auto">
        {/* Result header */}
        <motion.div
          className="text-center mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <motion.div
            className={cn(
              "w-24 h-24 rounded-full mx-auto mb-6 flex items-center justify-center",
              result.passed
                ? "bg-gradient-to-br from-green-500 to-emerald-600"
                : "bg-gradient-to-br from-red-500 to-orange-600"
            )}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", delay: 0.2 }}
          >
            {result.passed ? (
              <Trophy className="w-12 h-12 text-white" />
            ) : (
              <XCircle className="w-12 h-12 text-white" />
            )}
          </motion.div>

          <h1 className="text-3xl font-black text-white mb-2">
            {result.passed ? "Bravo !" : "Dommage !"}
          </h1>
          <p className="text-zinc-400">
            {result.passed
              ? "Tu as reussi ce quiz !"
              : "Continue a t'entrainer, tu vas y arriver !"}
          </p>
        </motion.div>

        {/* Score card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="p-6 bg-zinc-900 border-zinc-800 mb-6">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className={cn(
                  "text-4xl font-black mb-1",
                  result.passed ? "text-green-400" : "text-red-400"
                )}>
                  {result.score}%
                </div>
                <div className="text-sm text-zinc-500">Score</div>
              </div>
              <div>
                <div className="text-4xl font-black text-white mb-1">
                  {result.correctCount}/{result.totalQuestions}
                </div>
                <div className="text-sm text-zinc-500">Bonnes reponses</div>
              </div>
              <div>
                <div className="text-4xl font-black text-cyan-400 mb-1">
                  +{result.xpEarned}
                </div>
                <div className="text-sm text-zinc-500">XP gagnes</div>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Actions */}
        <motion.div
          className="flex gap-4 mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Button
            variant="outline"
            className="flex-1 gap-2"
            onClick={() => setShowDetails(!showDetails)}
          >
            {showDetails ? "Masquer" : "Voir"} les details
          </Button>
          {!result.passed && (
            <Button
              className="flex-1 gap-2 bg-gradient-to-r from-cyan-500 to-blue-500"
              onClick={onRetry}
            >
              <RotateCcw className="w-4 h-4" />
              Reessayer
            </Button>
          )}
          <Button variant="ghost" className="gap-2" onClick={onExit}>
            <Home className="w-4 h-4" />
            Accueil
          </Button>
        </motion.div>

        {/* Details */}
        <AnimatePresence>
          {showDetails && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-4"
            >
              {result.results.map((r, index) => (
                <Card
                  key={index}
                  className={cn(
                    "p-4 border",
                    r.isCorrect
                      ? "bg-green-500/5 border-green-500/20"
                      : "bg-red-500/5 border-red-500/20"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      "w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5",
                      r.isCorrect ? "bg-green-500" : "bg-red-500"
                    )}>
                      {r.isCorrect ? (
                        <CheckCircle2 className="w-4 h-4 text-white" />
                      ) : (
                        <XCircle className="w-4 h-4 text-white" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-white font-medium mb-2">
                        {index + 1}. {r.question}
                      </p>
                      {!r.isCorrect && (
                        <div className="text-sm">
                          <p className="text-red-400">
                            Ta reponse: {quiz.questions[index].options[r.userAnswer] || "Non repondu"}
                          </p>
                          <p className="text-green-400">
                            Bonne reponse: {quiz.questions[index].options[r.correctAnswer]}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

/* ==========================================================================
   QUIZ CARD COMPONENT (for listing)
   ========================================================================== */

interface QuizCardProps {
  quiz: Quiz & {
    attempts_count?: number
    best_score?: number | null
    passed?: boolean
    last_attempt?: string | null
  }
  onClick: () => void
}

export function QuizCard({ quiz, onClick }: QuizCardProps) {
  const difficultyColors = {
    easy: "text-green-400 bg-green-500/10",
    normal: "text-yellow-400 bg-yellow-500/10",
    hard: "text-orange-400 bg-orange-500/10",
    expert: "text-red-400 bg-red-500/10",
  }

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="cursor-pointer"
    >
      <Card className="p-4 bg-zinc-900 border-zinc-800 hover:border-zinc-700 transition-colors">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="font-bold text-white">{quiz.title}</h3>
            <p className="text-sm text-zinc-500">{quiz.description}</p>
          </div>
          {quiz.passed && (
            <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span className={cn(
            "px-2 py-1 rounded-full text-xs font-medium",
            difficultyColors[quiz.difficulty as keyof typeof difficultyColors] || difficultyColors.normal
          )}>
            {quiz.difficulty}
          </span>
          <span className="px-2 py-1 rounded-full text-xs font-medium bg-zinc-800 text-zinc-400">
            {quiz.questions.length} questions
          </span>
          <span className="px-2 py-1 rounded-full text-xs font-medium bg-zinc-800 text-zinc-400">
            <Clock className="w-3 h-3 inline mr-1" />
            {quiz.time_limit_minutes} min
          </span>
          <span className="px-2 py-1 rounded-full text-xs font-medium bg-cyan-500/10 text-cyan-400">
            <Zap className="w-3 h-3 inline mr-1" />
            +{quiz.xp_reward} XP
          </span>
        </div>

        {quiz.best_score !== null && (
          <div className="mt-3 pt-3 border-t border-zinc-800 text-sm">
            <span className="text-zinc-500">Meilleur score: </span>
            <span className={quiz.passed ? "text-green-400" : "text-yellow-400"}>
              {quiz.best_score}%
            </span>
            <span className="text-zinc-600 ml-2">
              ({quiz.attempts_count} tentative{(quiz.attempts_count || 0) > 1 ? "s" : ""})
            </span>
          </div>
        )}
      </Card>
    </motion.div>
  )
}
