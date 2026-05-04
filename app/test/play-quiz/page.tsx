"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Navbar } from "@/components/navbar"
import { GlassCard } from "@/components/ui/glass-card"
import { NeonButton } from "@/components/ui/neon-button"
import { 
  Clock, 
  Zap, 
  Trophy, 
  Flame, 
  CheckCircle2, 
  XCircle, 
  ArrowRight, 
  ArrowLeft,
  Play,
  Pause,
  RotateCcw,
  Target,
  Timer,
  AlertTriangle
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { toast } from "sonner"

interface QuizQuestion {
  type?: string
  question: string
  options?: string[]
  correct: number | boolean | number[]
  explanation?: string
}

interface Quiz {
  title: string
  description: string
  subject: string
  difficulty: string
  questions: QuizQuestion[]
  time_limit_minutes: number
  passing_score: number
  xp_reward: number
}

type GameState = "ready" | "playing" | "paused" | "finished"

export default function PlayQuizPage() {
  const [quiz, setQuiz] = useState<Quiz | null>(null)
  const [gameState, setGameState] = useState<GameState>("ready")
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null)
  const [answers, setAnswers] = useState<(number | null)[]>([])
  const [timeLeft, setTimeLeft] = useState(0) // en secondes
  const [questionTimeLeft, setQuestionTimeLeft] = useState(0) // temps par question
  const [score, setScore] = useState(0)
  const [streak, setStreak] = useState(0)
  const [maxStreak, setMaxStreak] = useState(0)
  const [showResult, setShowResult] = useState(false)
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null)
  const [pausedTime, setPausedTime] = useState(0)
  const [pauseCount, setPauseCount] = useState(0)
  const [warnings, setWarnings] = useState(0) // avertissements pour triche potentielle
  const [showCountdown, setShowCountdown] = useState(false)
  const [countdown, setCountdown] = useState(3)

  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const questionTimerRef = useRef<NodeJS.Timeout | null>(null)
  const startTimeRef = useRef<number>(0)
  const lastInteractionRef = useRef<number>(Date.now())

  const normalizeQuiz = useCallback((raw: any): Quiz => {
    const normalizeOptions = (q: any): string[] | undefined => {
      const candidate =
        q?.options ??
        q?.choices ??
        q?.answers ??
        q?.propositions ??
        q?.responses ??
        q?.reponses

      if (Array.isArray(candidate)) {
        return candidate.map((item) => String(item)).filter((item) => item.trim().length > 0)
      }

      if (candidate && typeof candidate === "object") {
        return Object.values(candidate)
          .map((item) => String(item))
          .filter((item) => item.trim().length > 0)
      }

      if (typeof candidate === "string") {
        const parts = candidate
          .split(/\r?\n|;|\||\s+\d+\.\s+|\s+[A-D]\)\s+/g)
          .map((item) => item.replace(/^[A-D]\)\s*/i, "").trim())
          .filter((item) => item.length > 0)
        if (parts.length >= 2) {
          return parts
        }
      }

      if (typeof q?.correct === "boolean" || q?.type === "true_false") {
        return ["Vrai", "Faux"]
      }

      return undefined
    }

    const normalizedQuestions: QuizQuestion[] = Array.isArray(raw?.questions)
      ? raw.questions.map((q: any) => ({
          type: q?.type,
          question: String(q?.question ?? q?.text ?? q?.prompt ?? "Question"),
          options: normalizeOptions(q),
          correct: q?.correct ?? q?.answerIndex ?? q?.answer ?? 0,
          explanation: q?.explanation ?? q?.justification ?? q?.explication,
        }))
      : []

    return {
      title: String(raw?.title ?? "Quiz"),
      description: String(raw?.description ?? ""),
      subject: String(raw?.subject ?? ""),
      difficulty: String(raw?.difficulty ?? ""),
      questions: normalizedQuestions,
      time_limit_minutes: Number(raw?.time_limit_minutes ?? 5),
      passing_score: Number(raw?.passing_score ?? 60),
      xp_reward: Number(raw?.xp_reward ?? 0),
    }
  }, [])

  // Charger le quiz depuis le localStorage ou l'URL
  useEffect(() => {
    const quizData = localStorage.getItem("generatedQuiz")
    if (quizData) {
      try {
        const parsed = JSON.parse(quizData)
        const normalized = normalizeQuiz(parsed)
        setQuiz(normalized)
        setTimeLeft(normalized.time_limit_minutes * 60)
        setAnswers(new Array(normalized.questions.length).fill(null))
      } catch (e) {
        toast.error("Erreur lors du chargement du quiz")
      }
    }
  }, [normalizeQuiz])

  // Timer principal
  useEffect(() => {
    if (gameState === "playing" && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            handleTimeUp()
            return 0
          }
          return prev - 1
        })
      }, 1000)

      return () => {
        if (timerRef.current) clearInterval(timerRef.current)
      }
    }
  }, [gameState, timeLeft])

  // Timer par question (décourage la triche)
  useEffect(() => {
    if (gameState === "playing" && currentQuestion < (quiz?.questions.length || 0) && quiz) {
      // Nettoyer le timer précédent
      if (questionTimerRef.current) {
        clearInterval(questionTimerRef.current)
      }
      
      // Calculer le temps par question
      const questionTime = Math.max(30, Math.floor((quiz.time_limit_minutes * 60) / quiz.questions.length))
      setQuestionTimeLeft(questionTime)
      
      // Réinitialiser l'état de la question
      setSelectedAnswer(null)
      setShowResult(false)
      setIsCorrect(null)
      
      // Démarrer le nouveau timer
      questionTimerRef.current = setInterval(() => {
        setQuestionTimeLeft((prev) => {
          if (prev <= 1) {
            handleQuestionTimeUp()
            return 0
          }
          return prev - 1
        })
      }, 1000)

      return () => {
        if (questionTimerRef.current) {
          clearInterval(questionTimerRef.current)
        }
      }
    }
  }, [gameState, currentQuestion, quiz])

  // Détection d'inactivité (triche potentielle)
  useEffect(() => {
    if (gameState === "playing") {
      const checkInterval = setInterval(() => {
        const timeSinceLastInteraction = Date.now() - lastInteractionRef.current
        // Si pas d'interaction depuis 2 minutes, avertissement
        if (timeSinceLastInteraction > 120000) {
          setWarnings((prev) => prev + 1)
          toast.warning("⚠️ Activité suspecte détectée ! Le timer continue...")
          lastInteractionRef.current = Date.now()
        }
      }, 30000) // Vérifie toutes les 30 secondes

      return () => clearInterval(checkInterval)
    }
  }, [gameState])

  const handleTimeUp = () => {
    setGameState("finished")
    toast.error("⏰ Temps écoulé !")
    calculateFinalScore()
  }

  const handleQuestionTimeUp = () => {
    if (selectedAnswer === null) {
      // Pas de réponse, passer à la suivante
      const newAnswers = [...answers]
      newAnswers[currentQuestion] = null
      setAnswers(newAnswers)
      handleNext()
    }
  }

  const startQuiz = () => {
    if (!quiz) return
    setShowCountdown(true)
    setCountdown(3)
    
    const countdownInterval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownInterval)
          setShowCountdown(false)
          setGameState("playing")
          startTimeRef.current = Date.now()
          lastInteractionRef.current = Date.now()
          setCurrentQuestion(0)
          setScore(0)
          setStreak(0)
          setMaxStreak(0)
          setPauseCount(0)
          setWarnings(0)
          return 3
        }
        return prev - 1
      })
    }, 1000)
  }

  const pauseQuiz = () => {
    if (gameState === "playing") {
      setGameState("paused")
      setPausedTime(Date.now())
      setPauseCount((prev) => prev + 1)
      toast.info("Quiz en pause")
    } else if (gameState === "paused") {
      const pauseDuration = Date.now() - pausedTime
      // Pénalité de temps pour chaque pause (décourage les pauses fréquentes)
      setTimeLeft((prev) => Math.max(0, prev - Math.floor(pauseDuration / 1000) - 10))
      setGameState("playing")
      lastInteractionRef.current = Date.now()
      toast.info("Quiz repris")
    }
  }

  const handleAnswerSelect = (index: number) => {
    if (gameState !== "playing" || selectedAnswer !== null) return
    
    lastInteractionRef.current = Date.now()
    setSelectedAnswer(index)
    
    const question = quiz?.questions[currentQuestion]
    if (!question) return

    let correct = false
    if (typeof question.correct === "number") {
      correct = question.correct === index
    } else if (typeof question.correct === "boolean") {
      correct = question.correct === (index === 0)
    } else if (Array.isArray(question.correct)) {
      correct = question.correct.includes(index)
    }

    setIsCorrect(correct)
    setShowResult(true)

    const newAnswers = [...answers]
    newAnswers[currentQuestion] = index
    setAnswers(newAnswers)

    if (correct) {
      // Calcul du score avec bonus de temps
      const timeBonus = Math.max(0, questionTimeLeft * 2)
      const streakBonus = streak * 10
      const points = 100 + timeBonus + streakBonus
      
      setScore((prev) => prev + points)
      setStreak((prev) => {
        const newStreak = prev + 1
        setMaxStreak((prevMax) => Math.max(prevMax, newStreak))
        return newStreak
      })
      
      toast.success(`✅ Correct ! +${points} points (Streak: ${streak + 1})`)
    } else {
      setStreak(0)
      toast.error("❌ Incorrect")
    }

    // Auto-avance après 2 secondes
    setTimeout(() => {
      handleNext()
    }, 2000)
  }

  const handleNext = () => {
    if (!quiz) return
    
    if (currentQuestion < quiz.questions.length - 1) {
      // Réinitialiser l'état avant de passer à la question suivante
      setSelectedAnswer(null)
      setShowResult(false)
      setIsCorrect(null)
      lastInteractionRef.current = Date.now()
      
      // Passer à la question suivante (le useEffect se chargera de réinitialiser le timer)
      setCurrentQuestion((prev) => prev + 1)
    } else {
      // Dernière question terminée
      setGameState("finished")
      calculateFinalScore()
    }
  }

  const handlePrevious = () => {
    if (currentQuestion > 0 && quiz) {
      const prevQuestionIndex = currentQuestion - 1
      const prevAnswer = answers[prevQuestionIndex]
      
      // Réinitialiser l'état
      setSelectedAnswer(prevAnswer)
      setShowResult(false)
      setIsCorrect(null)
      lastInteractionRef.current = Date.now()
      
      // Passer à la question précédente
      setCurrentQuestion(prevQuestionIndex)
      
      // Réinitialiser le timer de la question
      const questionTime = Math.max(30, Math.floor((quiz.time_limit_minutes * 60) / quiz.questions.length))
      setQuestionTimeLeft(questionTime)
    }
  }

  const calculateFinalScore = () => {
    if (!quiz) return
    
    const correctCount = answers.filter((answer, index) => {
      const question = quiz.questions[index]
      if (answer === null) return false
      
      if (typeof question.correct === "number") {
        return question.correct === answer
      } else if (typeof question.correct === "boolean") {
        return question.correct === (answer === 0)
      } else if (Array.isArray(question.correct)) {
        return question.correct.includes(answer)
      }
      return false
    }).length

    const percentage = (correctCount / quiz.questions.length) * 100
    const passed = percentage >= quiz.passing_score
    
    // Score final avec bonus
    const finalScore = score + (correctCount * 50) + (maxStreak * 20)
    
    toast[passed ? "success" : "error"](
      passed 
        ? `🎉 Quiz terminé ! Score: ${percentage.toFixed(0)}%` 
        : `Quiz terminé. Score: ${percentage.toFixed(0)}% (Minimum: ${quiz.passing_score}%)`
    )
  }

  const resetQuiz = () => {
    if (!quiz) return
    setGameState("ready")
    setCurrentQuestion(0)
    setSelectedAnswer(null)
    setAnswers(new Array(quiz.questions.length).fill(null))
    setTimeLeft(quiz.time_limit_minutes * 60)
    setScore(0)
    setStreak(0)
    setMaxStreak(0)
    setShowResult(false)
    setIsCorrect(null)
    setPauseCount(0)
    setWarnings(0)
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  if (!quiz) {
    return (
      <div className="min-h-screen bg-background text-white">
        <Navbar />
        <div className="pt-32 px-6">
          <GlassCard className="p-8 text-center">
            <AlertTriangle className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
            <h2 className="text-2xl font-black mb-2">Aucun quiz trouvé</h2>
            <p className="text-zinc-400 mb-6">
              Générez d'abord un quiz sur la page de génération
            </p>
            <NeonButton onClick={() => window.location.href = "/test/generate-quiz"}>
              Générer un quiz
            </NeonButton>
          </GlassCard>
        </div>
      </div>
    )
  }

  // Calculs de progression (seulement si quiz existe)
  const progress = quiz ? ((currentQuestion + 1) / quiz.questions.length) * 100 : 0
  const timePercentage = quiz ? (timeLeft / (quiz.time_limit_minutes * 60)) * 100 : 0
  const questionTimePercentage = quiz && questionTimeLeft > 0 
    ? (questionTimeLeft / Math.max(30, Math.floor(quiz.time_limit_minutes * 60 / quiz.questions.length))) * 100 
    : 0

  return (
    <div className="min-h-screen bg-background text-white overflow-hidden selection:bg-purple-500/30">
      <Navbar />
      
      {/* Background Ambience */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-600/20 rounded-full blur-[120px] animate-pulse-slow" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-cyan-600/20 rounded-full blur-[120px] animate-pulse-slow delay-1000" />
      </div>

      <div className="relative z-10 pt-20">
        {/* Countdown */}
        <AnimatePresence>
          {showCountdown && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-md"
            >
              <motion.div
                key={countdown}
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: [1, 1.2, 1], opacity: 1 }}
                exit={{ scale: 2, opacity: 0 }}
                transition={{ duration: 0.5 }}
                className="text-center"
              >
                {countdown > 0 ? (
                  <motion.h1
                    className="text-9xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400"
                    animate={{ scale: [1, 1.3, 1] }}
                    transition={{ duration: 0.5 }}
                  >
                    {countdown}
                  </motion.h1>
                ) : (
                  <motion.h1
                    className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                  >
                    C'est parti ! 🚀
                  </motion.h1>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {gameState === "ready" && (
          <section className="pt-32 pb-20 px-6">
            <div className="container mx-auto max-w-4xl">
              <GlassCard intensity="high" neon="intellect" className="p-8 border-white/10">
                <div className="text-center space-y-6">
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.5 }}
                  >
                    <Trophy className="w-20 h-20 text-cyan-400 mx-auto mb-4" />
                  </motion.div>
                  
                  <h1 className="text-4xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400">
                    {quiz.title}
                  </h1>
                  
                  <p className="text-xl text-zinc-400">{quiz.description}</p>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
                    <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                      <p className="text-2xl font-black text-cyan-400">{quiz.questions.length}</p>
                      <p className="text-sm text-zinc-400">Questions</p>
                    </div>
                    <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                      <p className="text-2xl font-black text-purple-400">{quiz.time_limit_minutes} min</p>
                      <p className="text-sm text-zinc-400">Temps limite</p>
                    </div>
                    <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                      <p className="text-2xl font-black text-emerald-400">{quiz.passing_score}%</p>
                      <p className="text-sm text-zinc-400">Score requis</p>
                    </div>
                    <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                      <p className="text-2xl font-black text-yellow-400 flex items-center justify-center gap-1">
                        <Zap className="w-5 h-5" />
                        {quiz.xp_reward}
                      </p>
                      <p className="text-sm text-zinc-400">XP</p>
                    </div>
                  </div>

                  <div className="mt-8">
                    <NeonButton
                      onClick={startQuiz}
                      variant="intellect"
                      size="lg"
                      className="px-12 h-16 text-lg font-black"
                      glow
                    >
                      <Play className="w-6 h-6 mr-2" />
                      Commencer le quiz
                    </NeonButton>
                  </div>
                </div>
              </GlassCard>
            </div>
          </section>
        )}

        {(gameState === "playing" || gameState === "paused") && (
          <div className="min-h-screen flex flex-col">
            {/* Header avec timer et stats */}
            <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-md border-b border-white/10">
              <div className="container mx-auto px-6 py-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {/* Timer principal - TRÈS VISIBLE */}
                  <motion.div
                    className="md:col-span-2"
                    animate={timeLeft < 60 ? { scale: [1, 1.05, 1] } : {}}
                    transition={{ duration: 1, repeat: timeLeft < 60 ? Infinity : 0 }}
                  >
                    <GlassCard 
                      intensity="high" 
                      className={`p-4 border-2 ${
                        timeLeft < 60 
                          ? "border-red-500/50 bg-red-500/10 animate-pulse" 
                          : timeLeft < 300
                          ? "border-yellow-500/50 bg-yellow-500/10"
                          : "border-cyan-500/50 bg-cyan-500/10"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Clock className={`w-6 h-6 ${
                            timeLeft < 60 ? "text-red-400 animate-pulse" : "text-cyan-400"
                          }`} />
                          <div>
                            <p className="text-xs text-zinc-400 mb-1">Temps restant</p>
                            <p className={`text-3xl font-black ${
                              timeLeft < 60 ? "text-red-400" : "text-cyan-400"
                            }`}>
                              {formatTime(timeLeft)}
                            </p>
                          </div>
                        </div>
                        <div className="w-32 h-2 bg-white/10 rounded-full overflow-hidden">
                          <motion.div
                            className={`h-full ${
                              timeLeft < 60 ? "bg-red-500" : "bg-cyan-500"
                            }`}
                            initial={{ width: "100%" }}
                            animate={{ width: `${timePercentage}%` }}
                            transition={{ duration: 1 }}
                          />
                        </div>
                      </div>
                    </GlassCard>
                  </motion.div>

                  {/* Timer par question */}
                  <GlassCard 
                    intensity="medium" 
                    className={`p-4 border-2 ${
                      questionTimeLeft < 10 
                        ? "border-red-500/50 bg-red-500/10 animate-pulse" 
                        : "border-white/10"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Timer className={`w-4 h-4 ${
                        questionTimeLeft < 10 ? "text-red-400 animate-pulse" : "text-purple-400"
                      }`} />
                      <div className="flex-1">
                        <p className="text-xs text-zinc-400">Question</p>
                        <p className={`text-lg font-black ${
                          questionTimeLeft < 10 ? "text-red-400" : "text-purple-400"
                        }`}>
                          {formatTime(questionTimeLeft)}
                        </p>
                      </div>
                      <div className="w-16 h-1 bg-white/10 rounded-full overflow-hidden">
                        <motion.div
                          className={`h-full ${
                            questionTimeLeft < 10 ? "bg-red-500" : "bg-purple-500"
                          }`}
                          animate={{ width: `${questionTimePercentage}%` }}
                          transition={{ duration: 1 }}
                        />
                      </div>
                    </div>
                  </GlassCard>

                  {/* Score et Streak */}
                  <GlassCard intensity="medium" className="p-4 border-white/10">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-zinc-400">Score</p>
                        <p className="text-xl font-black text-emerald-400">{score}</p>
                      </div>
                      {streak > 0 && (
                        <div className="flex items-center gap-1">
                          <Flame className="w-4 h-4 text-orange-400" />
                          <span className="text-sm font-black text-orange-400">{streak}</span>
                        </div>
                      )}
                    </div>
                  </GlassCard>
                </div>

                {/* Barre de progression */}
                <div className="mt-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-zinc-400">
                      Question {currentQuestion + 1} / {quiz.questions.length}
                    </span>
                    <NeonButton
                      onClick={pauseQuiz}
                      variant="intellect"
                      size="sm"
                    >
                      {gameState === "playing" ? (
                        <Pause className="w-4 h-4" />
                      ) : (
                        <Play className="w-4 h-4" />
                      )}
                    </NeonButton>
                  </div>
                  <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-cyan-500 to-purple-500"
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Question */}
            <div className="flex-1 px-6 py-8">
              <div className="container mx-auto max-w-4xl">
                {quiz && quiz.questions[currentQuestion] && (
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={currentQuestion}
                      initial={{ opacity: 0, x: 50 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -50 }}
                      transition={{ duration: 0.3 }}
                    >
                      <GlassCard intensity="high" neon="intellect" className="p-8 border-white/10">
                        <h2 className="text-2xl md:text-3xl font-black mb-8 leading-tight">
                          {quiz.questions[currentQuestion].question}
                        </h2>

                      {quiz.questions[currentQuestion].options?.length ? (
                        <div className="space-y-3">
                          {quiz.questions[currentQuestion].options?.map((option, index) => {
                            const isSelected = selectedAnswer === index
                            const currentQ = quiz.questions[currentQuestion]
                            const isCorrectAnswer = typeof currentQ.correct === "number" 
                              ? currentQ.correct === index
                              : typeof currentQ.correct === "boolean"
                              ? currentQ.correct === (index === 0)
                              : Array.isArray(currentQ.correct)
                              ? currentQ.correct.includes(index)
                              : false

                            let bgClass = "bg-white/5 border-white/10 hover:bg-white/10"
                            if (showResult) {
                              if (isCorrectAnswer) {
                                bgClass = "bg-green-500/20 border-green-500/50"
                              } else if (isSelected && !isCorrectAnswer) {
                                bgClass = "bg-red-500/20 border-red-500/50"
                              }
                            } else if (isSelected) {
                              bgClass = "bg-cyan-500/20 border-cyan-500/50"
                            }

                            return (
                              <motion.button
                                key={index}
                                onClick={() => handleAnswerSelect(index)}
                                disabled={showResult || gameState === "paused"}
                                className={`w-full p-4 rounded-lg border text-left transition-all ${bgClass} ${
                                  showResult || gameState === "paused" ? "cursor-not-allowed" : "cursor-pointer"
                                }`}
                                whileHover={!showResult && gameState === "playing" ? { scale: 1.02 } : {}}
                                whileTap={!showResult && gameState === "playing" ? { scale: 0.98 } : {}}
                              >
                                <div className="flex items-center gap-4">
                                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-black ${
                                    isCorrectAnswer && showResult
                                      ? "bg-green-500 text-white"
                                      : isSelected && !isCorrectAnswer && showResult
                                      ? "bg-red-500 text-white"
                                      : isSelected
                                      ? "bg-cyan-500 text-white"
                                      : "bg-white/10 text-zinc-400"
                                  }`}>
                                    {String.fromCharCode(65 + index)}
                                  </div>
                                  <span className="flex-1 text-white font-medium">{option}</span>
                                  {showResult && isCorrectAnswer && (
                                    <CheckCircle2 className="w-6 h-6 text-green-400" />
                                  )}
                                  {showResult && isSelected && !isCorrectAnswer && (
                                    <XCircle className="w-6 h-6 text-red-400" />
                                  )}
                                </div>
                              </motion.button>
                            )
                          })}
                        </div>
                      ) : (
                        <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                          <p className="text-yellow-400">
                            Aucun choix détecté pour cette question. Tu peux passer à la suivante.
                          </p>
                        </div>
                      )}

                      {/* Explication */}
                      {showResult && quiz.questions[currentQuestion].explanation && (
                        <motion.div
                          initial={{ opacity: 0, y: 10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          transition={{ type: "spring", stiffness: 300, damping: 20 }}
                          className="mt-6 p-4 rounded-lg bg-cyan-500/10 border border-cyan-500/30"
                        >
                          <p className="text-sm text-cyan-400 mb-1 font-medium flex items-center gap-2">
                            <span className="text-xl">💡</span>
                            Explication
                          </p>
                          <p className="text-white">{quiz.questions[currentQuestion].explanation}</p>
                        </motion.div>
                      )}

                      {/* Feedback visuel */}
                      {showResult && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          className={`mt-4 p-4 rounded-lg border-2 ${
                            isCorrect 
                              ? "bg-green-500/20 border-green-500/50" 
                              : "bg-red-500/20 border-red-500/50"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            {isCorrect ? (
                              <>
                                <motion.div
                                  animate={{ rotate: [0, 10, -10, 0] }}
                                  transition={{ duration: 0.5 }}
                                >
                                  <CheckCircle2 className="w-8 h-8 text-green-400" />
                                </motion.div>
                                <div>
                                  <p className="text-green-400 font-black text-lg">Excellent !</p>
                                  <p className="text-green-300 text-sm">Tu as la bonne réponse !</p>
                                </div>
                              </>
                            ) : (
                              <>
                                <XCircle className="w-8 h-8 text-red-400" />
                                <div>
                                  <p className="text-red-400 font-black text-lg">Pas tout à fait...</p>
                                  <p className="text-red-300 text-sm">Continue, tu vas y arriver !</p>
                                </div>
                              </>
                            )}
                          </div>
                        </motion.div>
                      )}

                      {/* Navigation */}
                      <div className="flex items-center justify-between mt-8">
                        <NeonButton
                          onClick={handlePrevious}
                          disabled={currentQuestion === 0}
                          variant="intellect"
                          size="sm"
                        >
                          <ArrowLeft className="w-4 h-4 mr-2" />
                          Précédent
                        </NeonButton>

                        <NeonButton
                          onClick={handleNext}
                          disabled={
                            quiz.questions[currentQuestion].options?.length
                              ? !showResult && selectedAnswer === null
                              : false
                          }
                          variant="intellect"
                          size="sm"
                        >
                          Suivant
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </NeonButton>
                      </div>
                    </GlassCard>
                  </motion.div>
                </AnimatePresence>
                )}
              </div>
            </div>
          </div>
        )}

        {gameState === "finished" && (
          <section className="pt-32 pb-20 px-6">
            <div className="container mx-auto max-w-4xl">
              <GlassCard intensity="high" neon="intellect" className="p-8 border-white/10">
                <div className="text-center space-y-6">
                  <Trophy className="w-20 h-20 text-yellow-400 mx-auto" />
                  <h2 className="text-4xl font-black">Quiz terminé !</h2>
                  <p className="text-2xl font-black text-cyan-400">Score: {score}</p>
                  <NeonButton onClick={resetQuiz} variant="intellect" size="lg">
                    <RotateCcw className="w-5 h-5 mr-2" />
                    Recommencer
                  </NeonButton>
                </div>
              </GlassCard>
            </div>
          </section>
        )}
      </div>
    </div>
  )
}

