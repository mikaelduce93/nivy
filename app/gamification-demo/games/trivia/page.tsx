'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft,
  Timer,
  Trophy,
  Star,
  Zap,
  Award,
  CheckCircle,
  XCircle,
  Brain,
  Sparkles,
  PartyPopper,
  Crown,
  Target
} from 'lucide-react'
import Link from 'next/link'

// Types
type QuestionCategory = 'tpm' | 'maroc' | 'music' | 'culture' | 'fun'

interface TriviaQuestion {
  id: string
  category: QuestionCategory
  question: string
  options: string[]
  correctIndex: number
  difficulty: 'easy' | 'medium' | 'hard'
  points: number
  timeLimit: number // en secondes
  funFact?: string
}

type GameState = 'menu' | 'countdown' | 'playing' | 'answer' | 'result'

// Questions Trivia
const triviaQuestions: TriviaQuestion[] = [
  // Questions TPM (Teens Party Morocco)
  {
    id: 'tpm_1',
    category: 'tpm',
    question: 'En quelle année Teens Party Morocco a été créé ?',
    options: ['2019', '2020', '2021', '2022'],
    correctIndex: 1,
    difficulty: 'easy',
    points: 100,
    timeLimit: 15,
    funFact: 'TPM a été fondé pendant la pandémie pour offrir des moments de joie aux ados !'
  },
  {
    id: 'tpm_2',
    category: 'tpm',
    question: 'Quelle est la capacité maximale d\'une soirée TPM classique ?',
    options: ['200 personnes', '350 personnes', '500 personnes', '750 personnes'],
    correctIndex: 2,
    difficulty: 'medium',
    points: 150,
    timeLimit: 12
  },
  {
    id: 'tpm_3',
    category: 'tpm',
    question: 'Quel était le thème de la première grande soirée TPM ?',
    options: ['Neon Night', 'White Party', 'Beach Vibes', 'Back to School'],
    correctIndex: 0,
    difficulty: 'hard',
    points: 200,
    timeLimit: 10,
    funFact: 'Cette soirée Neon a rassemblé plus de 300 personnes !'
  },

  // Questions Maroc
  {
    id: 'maroc_1',
    category: 'maroc',
    question: 'Quelle est la capitale du Maroc ?',
    options: ['Casablanca', 'Marrakech', 'Rabat', 'Fès'],
    correctIndex: 2,
    difficulty: 'easy',
    points: 100,
    timeLimit: 15
  },
  {
    id: 'maroc_2',
    category: 'maroc',
    question: 'Quel plat marocain est traditionnellement servi le vendredi ?',
    options: ['Tajine', 'Couscous', 'Pastilla', 'Harira'],
    correctIndex: 1,
    difficulty: 'easy',
    points: 100,
    timeLimit: 15
  },
  {
    id: 'maroc_3',
    category: 'maroc',
    question: 'Combien de villes impériales compte le Maroc ?',
    options: ['2', '3', '4', '5'],
    correctIndex: 2,
    difficulty: 'medium',
    points: 150,
    timeLimit: 12,
    funFact: 'Les 4 villes impériales sont Rabat, Fès, Marrakech et Meknès !'
  },

  // Questions Musique
  {
    id: 'music_1',
    category: 'music',
    question: 'Qui a chanté "Blinding Lights" ?',
    options: ['Drake', 'The Weeknd', 'Post Malone', 'Travis Scott'],
    correctIndex: 1,
    difficulty: 'easy',
    points: 100,
    timeLimit: 15
  },
  {
    id: 'music_2',
    category: 'music',
    question: 'Quel artiste marocain a collaboré avec Maluma ?',
    options: ['Saad Lamjarred', 'RedOne', 'DJ Snake', 'French Montana'],
    correctIndex: 0,
    difficulty: 'medium',
    points: 150,
    timeLimit: 12
  },
  {
    id: 'music_3',
    category: 'music',
    question: 'En quelle année Spotify a été lancé ?',
    options: ['2006', '2008', '2010', '2012'],
    correctIndex: 1,
    difficulty: 'hard',
    points: 200,
    timeLimit: 10
  },

  // Questions Culture générale
  {
    id: 'culture_1',
    category: 'culture',
    question: 'Quel réseau social a le logo d\'un fantôme ?',
    options: ['TikTok', 'Snapchat', 'Instagram', 'Twitter'],
    correctIndex: 1,
    difficulty: 'easy',
    points: 100,
    timeLimit: 15
  },
  {
    id: 'culture_2',
    category: 'culture',
    question: 'Combien de joueurs dans une équipe de football sur le terrain ?',
    options: ['9', '10', '11', '12'],
    correctIndex: 2,
    difficulty: 'easy',
    points: 100,
    timeLimit: 15
  },
  {
    id: 'culture_3',
    category: 'culture',
    question: 'Quel élément chimique a pour symbole "Au" ?',
    options: ['Argent', 'Aluminium', 'Or', 'Cuivre'],
    correctIndex: 2,
    difficulty: 'medium',
    points: 150,
    timeLimit: 12
  },

  // Questions Fun
  {
    id: 'fun_1',
    category: 'fun',
    question: 'Quel emoji est le plus utilisé dans le monde ?',
    options: ['❤️', '😂', '🔥', '👍'],
    correctIndex: 1,
    difficulty: 'medium',
    points: 150,
    timeLimit: 12
  },
  {
    id: 'fun_2',
    category: 'fun',
    question: 'Combien de temps dure en moyenne un rêve ?',
    options: ['5-10 minutes', '15-20 minutes', '30-45 minutes', '1-2 heures'],
    correctIndex: 0,
    difficulty: 'hard',
    points: 200,
    timeLimit: 10
  },
]

const categoryInfo: Record<QuestionCategory, { name: string; emoji: string; color: string }> = {
  tpm: { name: 'TPM', emoji: '🎉', color: 'from-purple-500 to-pink-500' },
  maroc: { name: 'Maroc', emoji: '🇲🇦', color: 'from-red-500 to-green-500' },
  music: { name: 'Musique', emoji: '🎵', color: 'from-cyan-500 to-blue-500' },
  culture: { name: 'Culture', emoji: '📚', color: 'from-yellow-500 to-orange-500' },
  fun: { name: 'Fun', emoji: '🤪', color: 'from-pink-500 to-purple-500' },
}

export default function TriviaGame() {
  const [gameState, setGameState] = useState<GameState>('menu')
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [score, setScore] = useState(0)
  const [combo, setCombo] = useState(0)
  const [maxCombo, setMaxCombo] = useState(0)
  const [timeLeft, setTimeLeft] = useState(15)
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null)
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null)
  const [questionsOrder, setQuestionsOrder] = useState<TriviaQuestion[]>([])
  const [countdown, setCountdown] = useState(3)
  const [correctAnswers, setCorrectAnswers] = useState(0)
  const [usedFiftyFifty, setUsedFiftyFifty] = useState(false)
  const [eliminatedOptions, setEliminatedOptions] = useState<number[]>([])
  const [showFunFact, setShowFunFact] = useState(false)

  const TOTAL_QUESTIONS = 10

  const currentQuestion = questionsOrder[currentQuestionIndex]

  // Mélanger les questions
  const shuffleQuestions = useCallback(() => {
    const shuffled = [...triviaQuestions]
      .sort(() => Math.random() - 0.5)
      .slice(0, TOTAL_QUESTIONS)
    setQuestionsOrder(shuffled)
  }, [])

  // Démarrer le jeu
  const startGame = () => {
    shuffleQuestions()
    setScore(0)
    setCombo(0)
    setMaxCombo(0)
    setCorrectAnswers(0)
    setCurrentQuestionIndex(0)
    setUsedFiftyFifty(false)
    setEliminatedOptions([])
    setGameState('countdown')
    setCountdown(3)
  }

  // Countdown avant jeu
  useEffect(() => {
    if (gameState === 'countdown' && countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    } else if (gameState === 'countdown' && countdown === 0) {
      setGameState('playing')
      setTimeLeft(currentQuestion?.timeLimit || 15)
    }
  }, [gameState, countdown, currentQuestion])

  // Timer pour chaque question
  useEffect(() => {
    if (gameState === 'playing' && timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000)
      return () => clearTimeout(timer)
    } else if (gameState === 'playing' && timeLeft === 0) {
      handleTimeout()
    }
  }, [gameState, timeLeft])

  // Gérer le timeout
  const handleTimeout = () => {
    setSelectedAnswer(-1) // Pas de réponse
    setIsCorrect(false)
    setCombo(0)
    setGameState('answer')
    setTimeout(() => {
      nextQuestion()
    }, 2500)
  }

  // Sélectionner une réponse
  const selectAnswer = (index: number) => {
    if (selectedAnswer !== null || gameState !== 'playing') return

    setSelectedAnswer(index)
    const correct = index === currentQuestion.correctIndex
    setIsCorrect(correct)

    if (correct) {
      // Calcul du score avec bonus combo et temps
      const timeBonus = Math.floor(timeLeft * 5)
      const comboMultiplier = 1 + (combo * 0.1)
      const basePoints = currentQuestion.points
      const totalPoints = Math.floor((basePoints + timeBonus) * comboMultiplier)

      setScore(prev => prev + totalPoints)
      setCombo(prev => prev + 1)
      setCorrectAnswers(prev => prev + 1)
      if (combo + 1 > maxCombo) setMaxCombo(combo + 1)
    } else {
      setCombo(0)
    }

    setGameState('answer')

    // Afficher fun fact si disponible
    if (currentQuestion.funFact) {
      setTimeout(() => setShowFunFact(true), 500)
    }

    setTimeout(() => {
      setShowFunFact(false)
      nextQuestion()
    }, currentQuestion.funFact ? 4000 : 2500)
  }

  // Question suivante
  const nextQuestion = () => {
    if (currentQuestionIndex < questionsOrder.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1)
      setSelectedAnswer(null)
      setIsCorrect(null)
      setEliminatedOptions([])
      setTimeLeft(questionsOrder[currentQuestionIndex + 1]?.timeLimit || 15)
      setGameState('playing')
    } else {
      setGameState('result')
    }
  }

  // Joker 50/50
  const useFiftyFifty = () => {
    if (usedFiftyFifty || selectedAnswer !== null) return

    const correctIndex = currentQuestion.correctIndex
    const wrongIndices = [0, 1, 2, 3].filter(i => i !== correctIndex)
    const toEliminate = wrongIndices.sort(() => Math.random() - 0.5).slice(0, 2)

    setEliminatedOptions(toEliminate)
    setUsedFiftyFifty(true)
  }

  // Rendu du menu
  const renderMenu = () => (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center justify-center min-h-[80vh] p-6"
    >
      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', bounce: 0.5 }}
        className="text-8xl mb-8"
      >
        🧠
      </motion.div>

      <h1 className="text-4xl font-black text-white mb-4 text-center">
        <span className="bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 bg-clip-text text-transparent">
          Trivia TPM
        </span>
      </h1>

      <p className="text-gray-400 text-center mb-8 max-w-md">
        Teste tes connaissances sur TPM, le Maroc, la musique et plus encore !
        Réponds vite pour maximiser tes points.
      </p>

      {/* Catégories */}
      <div className="grid grid-cols-5 gap-2 mb-8">
        {Object.entries(categoryInfo).map(([key, info]) => (
          <div
            key={key}
            className={`flex flex-col items-center p-3 rounded-xl bg-gradient-to-br ${info.color} bg-opacity-20`}
          >
            <span className="text-2xl">{info.emoji}</span>
            <span className="text-xs text-white mt-1">{info.name}</span>
          </div>
        ))}
      </div>

      {/* Règles */}
      <div className="bg-white/5 rounded-xl p-4 mb-8 w-full max-w-md border border-white/10">
        <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
          <Target className="w-5 h-5 text-cyan-400" />
          Comment jouer
        </h3>
        <ul className="space-y-2 text-sm text-gray-400">
          <li className="flex items-center gap-2">
            <span className="text-cyan-400">•</span>
            10 questions de différentes catégories
          </li>
          <li className="flex items-center gap-2">
            <span className="text-cyan-400">•</span>
            Réponds avant la fin du temps
          </li>
          <li className="flex items-center gap-2">
            <span className="text-cyan-400">•</span>
            Plus tu es rapide, plus tu gagnes de points
          </li>
          <li className="flex items-center gap-2">
            <span className="text-cyan-400">•</span>
            Enchaîne les bonnes réponses pour un combo !
          </li>
        </ul>
      </div>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={startGame}
        className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold py-4 px-12 rounded-xl flex items-center gap-3 shadow-lg"
      >
        <Brain className="w-6 h-6" />
        Commencer
      </motion.button>
    </motion.div>
  )

  // Rendu du countdown
  const renderCountdown = () => (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center justify-center min-h-[80vh]"
    >
      <motion.div
        key={countdown}
        initial={{ scale: 2, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0, opacity: 0 }}
        className="text-9xl font-black text-white"
      >
        {countdown === 0 ? '🚀' : countdown}
      </motion.div>
      <p className="text-gray-400 mt-4 text-xl">
        {countdown === 0 ? 'C\'est parti !' : 'Prépare-toi...'}
      </p>
    </motion.div>
  )

  // Rendu du jeu
  const renderPlaying = () => {
    if (!currentQuestion) return null

    const categoryData = categoryInfo[currentQuestion.category]
    const progress = ((currentQuestionIndex + 1) / questionsOrder.length) * 100

    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="p-4 pb-24"
      >
        {/* Header avec stats */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-gray-400 text-sm">
              {currentQuestionIndex + 1}/{questionsOrder.length}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {combo > 1 && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="flex items-center gap-1 bg-orange-500/20 px-3 py-1 rounded-full"
              >
                <Zap className="w-4 h-4 text-orange-400" />
                <span className="text-sm font-bold text-orange-400">x{combo}</span>
              </motion.div>
            )}

            <div className="flex items-center gap-1 bg-yellow-500/20 px-3 py-1 rounded-full">
              <Star className="w-4 h-4 text-yellow-400" />
              <span className="text-sm font-bold text-white">{score}</span>
            </div>
          </div>
        </div>

        {/* Barre de progression */}
        <div className="h-1 bg-white/10 rounded-full mb-6 overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-cyan-500 to-blue-500"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
          />
        </div>

        {/* Timer */}
        <div className="flex justify-center mb-6">
          <motion.div
            animate={{
              scale: timeLeft <= 5 ? [1, 1.1, 1] : 1,
              color: timeLeft <= 5 ? '#ef4444' : '#ffffff'
            }}
            transition={{ repeat: timeLeft <= 5 ? Infinity : 0, duration: 0.5 }}
            className={`
              w-20 h-20 rounded-full flex items-center justify-center
              ${timeLeft <= 5 ? 'bg-red-500/20 border-2 border-red-500' : 'bg-white/10 border-2 border-white/20'}
            `}
          >
            <span className="text-3xl font-black">{timeLeft}</span>
          </motion.div>
        </div>

        {/* Catégorie */}
        <div className="flex justify-center mb-4">
          <div className={`flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r ${categoryData.color} bg-opacity-20`}>
            <span className="text-xl">{categoryData.emoji}</span>
            <span className="text-white font-medium">{categoryData.name}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full ${
              currentQuestion.difficulty === 'easy' ? 'bg-green-500/30 text-green-400' :
              currentQuestion.difficulty === 'medium' ? 'bg-yellow-500/30 text-yellow-400' :
              'bg-red-500/30 text-red-400'
            }`}>
              {currentQuestion.difficulty === 'easy' ? 'Facile' :
               currentQuestion.difficulty === 'medium' ? 'Moyen' : 'Difficile'}
            </span>
          </div>
        </div>

        {/* Question */}
        <motion.div
          key={currentQuestion.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/10 rounded-2xl p-6 mb-6 border border-white/10"
        >
          <h2 className="text-xl font-bold text-white text-center">
            {currentQuestion.question}
          </h2>
        </motion.div>

        {/* Options */}
        <div className="grid grid-cols-1 gap-3 mb-6">
          {currentQuestion.options.map((option, index) => {
            const isEliminated = eliminatedOptions.includes(index)
            const isSelected = selectedAnswer === index
            const isCorrectOption = index === currentQuestion.correctIndex
            const showResult = gameState === 'answer'

            return (
              <motion.button
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{
                  opacity: isEliminated ? 0.3 : 1,
                  x: 0,
                  scale: isSelected ? 0.98 : 1
                }}
                transition={{ delay: index * 0.1 }}
                disabled={isEliminated || selectedAnswer !== null}
                onClick={() => selectAnswer(index)}
                className={`
                  relative p-4 rounded-xl text-left font-medium transition-colors border-2
                  ${isEliminated
                    ? 'bg-white/5 border-transparent text-gray-600 line-through cursor-not-allowed'
                    : showResult
                      ? isCorrectOption
                        ? 'bg-green-500/20 border-green-500 text-green-400'
                        : isSelected
                          ? 'bg-red-500/20 border-red-500 text-red-400'
                          : 'bg-white/5 border-transparent text-gray-400'
                      : 'bg-white/10 border-white/20 text-white hover:border-cyan-400/50 hover:bg-cyan-500/10'
                  }
                `}
              >
                <div className="flex items-center gap-3">
                  <span className={`
                    w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold
                    ${showResult && isCorrectOption
                      ? 'bg-green-500 text-white'
                      : showResult && isSelected && !isCorrectOption
                        ? 'bg-red-500 text-white'
                        : 'bg-white/10 text-white'
                    }
                  `}>
                    {String.fromCharCode(65 + index)}
                  </span>
                  <span className="flex-1">{option}</span>
                  {showResult && isCorrectOption && (
                    <CheckCircle className="w-6 h-6 text-green-400" />
                  )}
                  {showResult && isSelected && !isCorrectOption && (
                    <XCircle className="w-6 h-6 text-red-400" />
                  )}
                </div>
              </motion.button>
            )
          })}
        </div>

        {/* Fun fact */}
        <AnimatePresence>
          {showFunFact && currentQuestion.funFact && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-purple-500/20 border border-purple-500/50 rounded-xl p-4 mb-6"
            >
              <div className="flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="text-purple-400 text-sm font-medium mb-1">Le savais-tu ?</div>
                  <div className="text-white text-sm">{currentQuestion.funFact}</div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Joker 50/50 */}
        {gameState === 'playing' && !usedFiftyFifty && (
          <div className="flex justify-center">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={useFiftyFifty}
              className="flex items-center gap-2 bg-purple-500/20 border border-purple-500/50 text-purple-400 px-4 py-2 rounded-lg text-sm font-medium"
            >
              <Target className="w-4 h-4" />
              50/50 (1 seul)
            </motion.button>
          </div>
        )}
      </motion.div>
    )
  }

  // Rendu des résultats
  const renderResult = () => {
    const percentage = Math.floor((correctAnswers / questionsOrder.length) * 100)
    const xpEarned = Math.floor(score * 0.5) + (correctAnswers * 25)
    const rating = percentage >= 80 ? 3 : percentage >= 50 ? 2 : 1

    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col items-center justify-center min-h-[80vh] p-6"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', bounce: 0.5 }}
          className="text-8xl mb-6"
        >
          {percentage >= 80 ? '🏆' : percentage >= 50 ? '🎉' : '📚'}
        </motion.div>

        <h2 className="text-3xl font-black text-white mb-2">
          {percentage >= 80 ? 'Excellent !' : percentage >= 50 ? 'Bien joué !' : 'Continue !'}
        </h2>

        <p className="text-gray-400 mb-8">
          {percentage >= 80 ? 'Tu es un vrai expert !' :
           percentage >= 50 ? 'Tu t\'améliores !' : 'La prochaine fois sera meilleure !'}
        </p>

        {/* Étoiles */}
        <div className="flex gap-2 mb-8">
          {[1, 2, 3].map(star => (
            <motion.div
              key={star}
              initial={{ scale: 0, rotate: -180 }}
              animate={{
                scale: star <= rating ? 1 : 0.5,
                rotate: 0,
                opacity: star <= rating ? 1 : 0.3
              }}
              transition={{ delay: star * 0.2 }}
            >
              <Star
                className={`w-12 h-12 ${star <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-600'}`}
              />
            </motion.div>
          ))}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 w-full max-w-sm mb-8">
          <div className="bg-white/5 rounded-xl p-4 text-center border border-white/10">
            <div className="text-3xl font-black text-yellow-400">{score}</div>
            <div className="text-xs text-gray-400">Points</div>
          </div>
          <div className="bg-white/5 rounded-xl p-4 text-center border border-white/10">
            <div className="text-3xl font-black text-green-400">
              {correctAnswers}/{questionsOrder.length}
            </div>
            <div className="text-xs text-gray-400">Bonnes réponses</div>
          </div>
          <div className="bg-white/5 rounded-xl p-4 text-center border border-white/10">
            <div className="text-3xl font-black text-orange-400">x{maxCombo}</div>
            <div className="text-xs text-gray-400">Combo max</div>
          </div>
          <div className="bg-white/5 rounded-xl p-4 text-center border border-white/10">
            <div className="text-3xl font-black text-purple-400">+{xpEarned}</div>
            <div className="text-xs text-gray-400">XP gagnés</div>
          </div>
        </div>

        {/* Boutons */}
        <div className="flex flex-col gap-3 w-full max-w-sm">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={startGame}
            className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold py-4 px-8 rounded-xl flex items-center justify-center gap-2"
          >
            <Brain className="w-5 h-5" />
            Rejouer
          </motion.button>

          <Link href="/gamification-demo">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full bg-white/10 text-white font-bold py-4 px-8 rounded-xl flex items-center justify-center gap-2 border border-white/20"
            >
              <ArrowLeft className="w-5 h-5" />
              Retour aux jeux
            </motion.button>
          </Link>
        </div>
      </motion.div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-cyan-900/20 to-gray-900">
      {/* Header fixe */}
      <div className="sticky top-0 z-40 bg-gray-900/80 backdrop-blur-lg border-b border-white/10">
        <div className="flex items-center justify-between p-4">
          <Link href="/gamification-demo" className="flex items-center gap-2 text-white">
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium">Retour</span>
          </Link>
          {gameState === 'playing' && (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 bg-yellow-500/20 px-3 py-1.5 rounded-full">
                <Star className="w-4 h-4 text-yellow-400" />
                <span className="text-sm font-bold text-white">{score}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Contenu */}
      {gameState === 'menu' && renderMenu()}
      {gameState === 'countdown' && renderCountdown()}
      {(gameState === 'playing' || gameState === 'answer') && renderPlaying()}
      {gameState === 'result' && renderResult()}
    </div>
  )
}
