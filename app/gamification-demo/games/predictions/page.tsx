'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft,
  Sparkles,
  Target,
  Trophy,
  Star,
  Users,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  Zap,
  Award,
  Calendar
} from 'lucide-react'
import Link from 'next/link'

// Types
type PredictionCategory = 'attendance' | 'music' | 'vibe' | 'special'

interface PredictionOption {
  id: string
  label: string
  odds: number // Multiplicateur de points
  emoji: string
}

interface Prediction {
  id: string
  category: PredictionCategory
  question: string
  options: PredictionOption[]
  eventName: string
  eventDate: string
  closesAt: string // Date limite pour prédire
  correctAnswerId?: string // Défini après résolution
  points: number
}

interface UserPrediction {
  predictionId: string
  selectedOptionId: string
  timestamp: Date
}

// Mock data - Prédictions pour événements à venir
const mockPredictions: Prediction[] = [
  {
    id: 'pred_1',
    category: 'attendance',
    question: 'Combien de personnes seront présentes à la soirée ?',
    eventName: 'Neon Night Party',
    eventDate: '2025-01-05',
    closesAt: '2025-01-05T18:00:00',
    points: 100,
    options: [
      { id: 'a1', label: 'Moins de 200', odds: 2.5, emoji: '👥' },
      { id: 'a2', label: '200-350', odds: 1.5, emoji: '👥👥' },
      { id: 'a3', label: '350-500', odds: 1.8, emoji: '👥👥👥' },
      { id: 'a4', label: 'Plus de 500', odds: 3.0, emoji: '🔥' },
    ]
  },
  {
    id: 'pred_2',
    category: 'music',
    question: 'Quel genre musical dominera la soirée ?',
    eventName: 'Neon Night Party',
    eventDate: '2025-01-05',
    closesAt: '2025-01-05T18:00:00',
    points: 75,
    options: [
      { id: 'b1', label: 'Afrobeat', odds: 1.8, emoji: '🥁' },
      { id: 'b2', label: 'House/EDM', odds: 2.0, emoji: '🎧' },
      { id: 'b3', label: 'Hip-Hop/Rap', odds: 1.6, emoji: '🎤' },
      { id: 'b4', label: 'Mix varié', odds: 1.4, emoji: '🎵' },
    ]
  },
  {
    id: 'pred_3',
    category: 'vibe',
    question: 'Quel sera le moment fort de la soirée ?',
    eventName: 'Neon Night Party',
    eventDate: '2025-01-05',
    closesAt: '2025-01-05T18:00:00',
    points: 100,
    options: [
      { id: 'c1', label: 'Le DJ set principal', odds: 1.5, emoji: '🎧' },
      { id: 'c2', label: 'Le countdown minuit', odds: 2.2, emoji: '⏰' },
      { id: 'c3', label: 'Le show lumière', odds: 2.0, emoji: '✨' },
      { id: 'c4', label: 'L\'invité surprise', odds: 3.5, emoji: '🌟' },
    ]
  },
  {
    id: 'pred_4',
    category: 'special',
    question: 'Y aura-t-il un invité surprise ?',
    eventName: 'Neon Night Party',
    eventDate: '2025-01-05',
    closesAt: '2025-01-05T18:00:00',
    points: 150,
    options: [
      { id: 'd1', label: 'Oui, un DJ célèbre', odds: 4.0, emoji: '🎧' },
      { id: 'd2', label: 'Oui, un artiste local', odds: 2.5, emoji: '🎤' },
      { id: 'd3', label: 'Non', odds: 1.3, emoji: '❌' },
    ]
  },
  {
    id: 'pred_5',
    category: 'attendance',
    question: 'À quelle heure le pic d\'affluence sera atteint ?',
    eventName: 'Sunday Chill',
    eventDate: '2025-01-12',
    closesAt: '2025-01-12T14:00:00',
    points: 75,
    options: [
      { id: 'e1', label: '17h-18h', odds: 2.2, emoji: '☀️' },
      { id: 'e2', label: '18h-19h', odds: 1.5, emoji: '🌅' },
      { id: 'e3', label: '19h-20h', odds: 1.8, emoji: '🌙' },
      { id: 'e4', label: 'Après 20h', odds: 2.5, emoji: '🌃' },
    ]
  },
]

// Historique des prédictions passées (avec résultats)
const pastPredictions: (Prediction & { correctAnswerId: string })[] = [
  {
    id: 'past_1',
    category: 'attendance',
    question: 'Combien de personnes à la soirée Halloween ?',
    eventName: 'Halloween Bash',
    eventDate: '2024-10-31',
    closesAt: '2024-10-31T18:00:00',
    points: 100,
    correctAnswerId: 'ph2',
    options: [
      { id: 'ph1', label: 'Moins de 300', odds: 2.0, emoji: '👥' },
      { id: 'ph2', label: '300-450', odds: 1.6, emoji: '👥👥' },
      { id: 'ph3', label: 'Plus de 450', odds: 2.2, emoji: '🔥' },
    ]
  }
]

// Game state type
type GameState = 'menu' | 'predictions' | 'history' | 'leaderboard'

const categoryInfo: Record<PredictionCategory, { name: string; icon: any; color: string }> = {
  attendance: { name: 'Affluence', icon: Users, color: 'from-blue-500 to-cyan-500' },
  music: { name: 'Musique', icon: Sparkles, color: 'from-purple-500 to-pink-500' },
  vibe: { name: 'Ambiance', icon: Star, color: 'from-yellow-500 to-orange-500' },
  special: { name: 'Spécial', icon: Trophy, color: 'from-emerald-500 to-teal-500' },
}

export default function PredictionsGame() {
  const [gameState, setGameState] = useState<GameState>('menu')
  const [userPredictions, setUserPredictions] = useState<UserPrediction[]>([])
  const [selectedPrediction, setSelectedPrediction] = useState<Prediction | null>(null)
  const [totalPoints, setTotalPoints] = useState(0)
  const [streak, setStreak] = useState(3) // Prédictions correctes consécutives

  // Calculer les prédictions gagnées
  const wonPredictions = pastPredictions.filter(p => {
    const userPred = userPredictions.find(up => up.predictionId === p.id)
    return userPred && userPred.selectedOptionId === p.correctAnswerId
  })

  // Faire une prédiction
  const makePrediction = (predictionId: string, optionId: string) => {
    const prediction = mockPredictions.find(p => p.id === predictionId)
    if (!prediction) return

    const option = prediction.options.find(o => o.id === optionId)
    if (!option) return

    setUserPredictions(prev => {
      // Remplacer si déjà prédit
      const filtered = prev.filter(p => p.predictionId !== predictionId)
      return [...filtered, {
        predictionId,
        selectedOptionId: optionId,
        timestamp: new Date()
      }]
    })

    setSelectedPrediction(null)
  }

  // Points potentiels
  const getPotentialPoints = (prediction: Prediction, optionId: string): number => {
    const option = prediction.options.find(o => o.id === optionId)
    if (!option) return 0
    return Math.floor(prediction.points * option.odds)
  }

  // Rendu du menu
  const renderMenu = () => (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center justify-center min-h-[80vh] p-6"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', bounce: 0.5 }}
        className="text-8xl mb-8"
      >
        🔮
      </motion.div>

      <h1 className="text-4xl font-black text-white mb-4 text-center">
        <span className="bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 bg-clip-text text-transparent">
          Prédictions
        </span>
      </h1>

      <p className="text-gray-400 text-center mb-8 max-w-md">
        Prédis ce qui va se passer lors des prochaines soirées et gagne des points !
        Plus ta prédiction est risquée, plus tu peux gagner.
      </p>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8 w-full max-w-md">
        <div className="bg-white/5 rounded-xl p-4 text-center border border-white/10">
          <div className="text-2xl font-bold text-white">{totalPoints}</div>
          <div className="text-xs text-gray-400">Points</div>
        </div>
        <div className="bg-white/5 rounded-xl p-4 text-center border border-white/10">
          <div className="text-2xl font-bold text-green-400">{wonPredictions.length}</div>
          <div className="text-xs text-gray-400">Gagnées</div>
        </div>
        <div className="bg-white/5 rounded-xl p-4 text-center border border-white/10">
          <div className="text-2xl font-bold text-orange-400">{streak}</div>
          <div className="text-xs text-gray-400">Streak</div>
        </div>
      </div>

      {/* Boutons du menu */}
      <div className="flex flex-col gap-4 w-full max-w-sm">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setGameState('predictions')}
          className="relative overflow-hidden bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold py-4 px-8 rounded-xl flex items-center justify-center gap-3 shadow-lg"
        >
          <Target className="w-6 h-6" />
          Faire des prédictions
          {mockPredictions.length > 0 && (
            <span className="absolute top-2 right-2 bg-white text-purple-600 text-xs font-bold px-2 py-1 rounded-full">
              {mockPredictions.length} dispo
            </span>
          )}
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setGameState('history')}
          className="bg-white/10 text-white font-bold py-4 px-8 rounded-xl flex items-center justify-center gap-3 border border-white/20"
        >
          <Clock className="w-6 h-6" />
          Historique
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setGameState('leaderboard')}
          className="bg-white/10 text-white font-bold py-4 px-8 rounded-xl flex items-center justify-center gap-3 border border-white/20"
        >
          <TrendingUp className="w-6 h-6" />
          Classement
        </motion.button>
      </div>
    </motion.div>
  )

  // Rendu des prédictions disponibles
  const renderPredictions = () => (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="p-4 pb-24"
    >
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => setGameState('menu')}
          className="p-2 rounded-lg bg-white/10 text-white"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="text-2xl font-bold text-white">Prédictions</h2>
      </div>

      {/* Grouper par événement */}
      {Array.from(new Set(mockPredictions.map(p => p.eventName))).map(eventName => (
        <div key={eventName} className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-5 h-5 text-purple-400" />
            <h3 className="text-lg font-semibold text-white">{eventName}</h3>
          </div>

          <div className="space-y-4">
            {mockPredictions
              .filter(p => p.eventName === eventName)
              .map(prediction => {
                const userPred = userPredictions.find(up => up.predictionId === prediction.id)
                const selectedOption = userPred
                  ? prediction.options.find(o => o.id === userPred.selectedOptionId)
                  : null
                const categoryData = categoryInfo[prediction.category]
                const CategoryIcon = categoryData.icon

                return (
                  <motion.div
                    key={prediction.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    whileHover={{ scale: 1.01 }}
                    onClick={() => setSelectedPrediction(prediction)}
                    className={`
                      relative overflow-hidden rounded-2xl p-4 cursor-pointer border
                      ${userPred
                        ? 'bg-gradient-to-br from-green-900/30 to-emerald-900/30 border-green-500/30'
                        : 'bg-white/5 border-white/10 hover:border-white/20'
                      }
                    `}
                  >
                    {/* Badge catégorie */}
                    <div className="flex items-center justify-between mb-3">
                      <div className={`flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r ${categoryData.color} bg-opacity-20`}>
                        <CategoryIcon className="w-4 h-4 text-white" />
                        <span className="text-xs font-medium text-white">{categoryData.name}</span>
                      </div>
                      <div className="flex items-center gap-1 text-yellow-400">
                        <Star className="w-4 h-4" />
                        <span className="text-sm font-bold">{prediction.points} pts</span>
                      </div>
                    </div>

                    {/* Question */}
                    <h4 className="text-white font-medium mb-3">{prediction.question}</h4>

                    {/* Prédiction de l'utilisateur ou prompt */}
                    {userPred && selectedOption ? (
                      <div className="flex items-center gap-2 text-green-400">
                        <CheckCircle className="w-5 h-5" />
                        <span className="font-medium">{selectedOption.emoji} {selectedOption.label}</span>
                        <span className="text-xs text-green-400/70">
                          (x{selectedOption.odds} = {getPotentialPoints(prediction, selectedOption.id)} pts)
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-gray-400">
                        <Target className="w-5 h-5" />
                        <span>Touche pour prédire</span>
                      </div>
                    )}

                    {/* Indicateur déjà prédit */}
                    {userPred && (
                      <div className="absolute top-2 right-2">
                        <CheckCircle className="w-6 h-6 text-green-400" />
                      </div>
                    )}
                  </motion.div>
                )
              })}
          </div>
        </div>
      ))}

      {/* Modal de prédiction */}
      <AnimatePresence>
        {selectedPrediction && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 backdrop-blur-sm"
            onClick={() => setSelectedPrediction(null)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25 }}
              className="w-full max-w-lg bg-gray-900 rounded-t-3xl p-6 pb-8"
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex justify-center mb-4">
                <div className="w-12 h-1.5 bg-gray-700 rounded-full" />
              </div>

              <h3 className="text-xl font-bold text-white mb-2">{selectedPrediction.question}</h3>
              <p className="text-gray-400 text-sm mb-6">
                {selectedPrediction.eventName} - {new Date(selectedPrediction.eventDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}
              </p>

              {/* Options */}
              <div className="space-y-3">
                {selectedPrediction.options.map(option => {
                  const userPred = userPredictions.find(up => up.predictionId === selectedPrediction.id)
                  const isSelected = userPred?.selectedOptionId === option.id
                  const potentialPoints = getPotentialPoints(selectedPrediction, option.id)

                  return (
                    <motion.button
                      key={option.id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => makePrediction(selectedPrediction.id, option.id)}
                      className={`
                        w-full p-4 rounded-xl flex items-center justify-between border-2 transition-colors
                        ${isSelected
                          ? 'bg-purple-600/30 border-purple-500 text-white'
                          : 'bg-white/5 border-transparent text-gray-300 hover:border-white/20'
                        }
                      `}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{option.emoji}</span>
                        <span className="font-medium">{option.label}</span>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className={`text-sm font-bold ${option.odds >= 2.5 ? 'text-orange-400' : option.odds >= 2 ? 'text-yellow-400' : 'text-green-400'}`}>
                          x{option.odds}
                        </span>
                        <span className="text-xs text-gray-500">
                          {potentialPoints} pts
                        </span>
                      </div>
                    </motion.button>
                  )
                })}
              </div>

              {/* Info odds */}
              <div className="mt-6 p-3 bg-white/5 rounded-xl">
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <Zap className="w-4 h-4 text-yellow-400" />
                  <span>Plus les cotes sont élevées, plus tu gagnes de points !</span>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )

  // Rendu de l'historique
  const renderHistory = () => (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="p-4 pb-24"
    >
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => setGameState('menu')}
          className="p-2 rounded-lg bg-white/10 text-white"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="text-2xl font-bold text-white">Historique</h2>
      </div>

      {/* Prédictions en attente */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-yellow-400" />
          En attente de résultats
        </h3>

        <div className="space-y-3">
          {userPredictions.length > 0 ? (
            userPredictions.map(userPred => {
              const prediction = mockPredictions.find(p => p.id === userPred.predictionId)
              if (!prediction) return null

              const selectedOption = prediction.options.find(o => o.id === userPred.selectedOptionId)
              if (!selectedOption) return null

              return (
                <div
                  key={userPred.predictionId}
                  className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-yellow-400">{prediction.eventName}</span>
                    <span className="text-xs text-gray-400">
                      {new Date(prediction.eventDate).toLocaleDateString('fr-FR')}
                    </span>
                  </div>
                  <p className="text-white font-medium mb-2">{prediction.question}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300">
                      {selectedOption.emoji} {selectedOption.label}
                    </span>
                    <span className="text-yellow-400 font-bold">
                      {getPotentialPoints(prediction, selectedOption.id)} pts potentiels
                    </span>
                  </div>
                </div>
              )
            })
          ) : (
            <div className="text-center py-8 text-gray-500">
              Aucune prédiction en attente
            </div>
          )}
        </div>
      </div>

      {/* Prédictions passées */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-green-400" />
          Résultats passés
        </h3>

        <div className="space-y-3">
          {pastPredictions.map(prediction => {
            // Simuler une prédiction de l'utilisateur pour la démo
            const userPredicted = true
            const userWon = true // Simulation

            return (
              <div
                key={prediction.id}
                className={`
                  rounded-xl p-4 border
                  ${userWon
                    ? 'bg-green-500/10 border-green-500/30'
                    : 'bg-red-500/10 border-red-500/30'
                  }
                `}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-400">{prediction.eventName}</span>
                  <div className={`flex items-center gap-1 ${userWon ? 'text-green-400' : 'text-red-400'}`}>
                    {userWon ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                    <span className="text-sm font-bold">
                      {userWon ? '+150 pts' : '0 pts'}
                    </span>
                  </div>
                </div>
                <p className="text-white font-medium mb-2">{prediction.question}</p>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-400">Réponse correcte:</span>
                  <span className="text-green-400 font-medium">
                    {prediction.options.find(o => o.id === prediction.correctAnswerId)?.label}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </motion.div>
  )

  // Rendu du classement
  const renderLeaderboard = () => {
    const leaderboardData = [
      { rank: 1, username: 'DJ_Master', avatar: '🎧', points: 2450, accuracy: 78 },
      { rank: 2, username: 'PartyQueen', avatar: '👑', points: 2180, accuracy: 72 },
      { rank: 3, username: 'NightOwl', avatar: '🦉', points: 1920, accuracy: 68 },
      { rank: 4, username: 'Toi', avatar: '⭐', points: totalPoints || 1500, accuracy: 65, isUser: true },
      { rank: 5, username: 'VibeChecker', avatar: '✨', points: 1340, accuracy: 61 },
      { rank: 6, username: 'BassDropper', avatar: '🔊', points: 1180, accuracy: 58 },
      { rank: 7, username: 'FloorFiller', avatar: '💃', points: 980, accuracy: 55 },
    ]

    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="p-4 pb-24"
      >
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => setGameState('menu')}
            className="p-2 rounded-lg bg-white/10 text-white"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="text-2xl font-bold text-white">Classement</h2>
        </div>

        {/* Top 3 */}
        <div className="flex justify-center items-end gap-4 mb-8">
          {/* 2ème place */}
          <div className="flex flex-col items-center">
            <div className="text-4xl mb-2">{leaderboardData[1].avatar}</div>
            <div className="bg-gray-500 text-white font-bold py-2 px-4 rounded-t-xl">
              2
            </div>
            <div className="bg-gray-700 rounded-b-xl p-2 text-center w-24">
              <div className="text-white text-xs truncate">{leaderboardData[1].username}</div>
              <div className="text-gray-400 text-xs">{leaderboardData[1].points} pts</div>
            </div>
          </div>

          {/* 1ère place */}
          <div className="flex flex-col items-center -mt-4">
            <div className="text-5xl mb-2">{leaderboardData[0].avatar}</div>
            <div className="bg-yellow-500 text-black font-bold py-3 px-5 rounded-t-xl">
              1
            </div>
            <div className="bg-yellow-600 rounded-b-xl p-2 text-center w-28">
              <div className="text-white text-sm truncate">{leaderboardData[0].username}</div>
              <div className="text-yellow-200 text-xs">{leaderboardData[0].points} pts</div>
            </div>
          </div>

          {/* 3ème place */}
          <div className="flex flex-col items-center">
            <div className="text-4xl mb-2">{leaderboardData[2].avatar}</div>
            <div className="bg-orange-700 text-white font-bold py-2 px-4 rounded-t-xl">
              3
            </div>
            <div className="bg-orange-900 rounded-b-xl p-2 text-center w-24">
              <div className="text-white text-xs truncate">{leaderboardData[2].username}</div>
              <div className="text-gray-400 text-xs">{leaderboardData[2].points} pts</div>
            </div>
          </div>
        </div>

        {/* Rest of leaderboard */}
        <div className="space-y-2">
          {leaderboardData.slice(3).map(player => (
            <motion.div
              key={player.rank}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: player.rank * 0.1 }}
              className={`
                flex items-center gap-4 p-4 rounded-xl
                ${player.isUser
                  ? 'bg-purple-500/20 border border-purple-500/50'
                  : 'bg-white/5'
                }
              `}
            >
              <div className="text-gray-400 font-bold w-6">{player.rank}</div>
              <div className="text-2xl">{player.avatar}</div>
              <div className="flex-1">
                <div className={`font-medium ${player.isUser ? 'text-purple-400' : 'text-white'}`}>
                  {player.username}
                </div>
                <div className="text-xs text-gray-500">{player.accuracy}% de réussite</div>
              </div>
              <div className="text-right">
                <div className="text-white font-bold">{player.points}</div>
                <div className="text-xs text-gray-500">points</div>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-purple-900/20 to-gray-900">
      {/* Header fixe */}
      <div className="sticky top-0 z-40 bg-gray-900/80 backdrop-blur-lg border-b border-white/10">
        <div className="flex items-center justify-between p-4">
          <Link href="/gamification-demo" className="flex items-center gap-2 text-white">
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium">Retour</span>
          </Link>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-purple-500/20 px-3 py-1.5 rounded-full">
              <Award className="w-4 h-4 text-purple-400" />
              <span className="text-sm font-bold text-white">{totalPoints} pts</span>
            </div>
          </div>
        </div>
      </div>

      {/* Contenu */}
      {gameState === 'menu' && renderMenu()}
      {gameState === 'predictions' && renderPredictions()}
      {gameState === 'history' && renderHistory()}
      {gameState === 'leaderboard' && renderLeaderboard()}
    </div>
  )
}
