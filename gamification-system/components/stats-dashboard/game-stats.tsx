/**
 * TEENS PARTY MOROCCO - Game Stats Component
 * ==========================================
 *
 * Statistiques détaillées des mini-jeux.
 */

"use client"

import { motion } from "framer-motion"
import {
  Gamepad2,
  Music,
  Grid,
  TrendingUp,
  Trophy,
  Target,
  Zap,
  Clock,
  CheckCircle,
  XCircle,
  Percent,
  Award,
  Star,
  Brain,
} from "lucide-react"
import {
  type LifetimeStats,
  formatLargeNumber,
  formatTimeSpent,
} from "../../features/stats-dashboard"

/* ==========================================================================
   GAME STATS OVERVIEW
   ========================================================================== */

interface GameStatsOverviewProps {
  stats: LifetimeStats
}

export function GameStatsOverview({ stats }: GameStatsOverviewProps) {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="p-4 rounded-2xl bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/30">
        <div className="flex items-center gap-2 mb-4">
          <Gamepad2 className="w-6 h-6 text-green-400" />
          <h3 className="text-lg font-bold text-white">Mini-jeux</h3>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-3xl font-bold text-white">
              {stats.total_games_played}
            </p>
            <p className="text-xs text-zinc-400">Parties</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-green-400">
              {stats.total_game_wins}
            </p>
            <p className="text-xs text-zinc-400">Victoires</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-yellow-400">
              {stats.game_win_rate}%
            </p>
            <p className="text-xs text-zinc-400">Win Rate</p>
          </div>
        </div>
      </div>

      {/* Stats détaillées par type de jeu */}
      <div className="grid gap-3">
        {/* Quiz Musical */}
        <GameTypeCard
          icon={<Music className="w-5 h-5" />}
          name="Quiz Musical"
          color="text-purple-400"
          bgColor="bg-purple-500/10"
          stats={{
            bestScore: stats.highest_quiz_score,
            label: "Meilleur score",
          }}
        />

        {/* Memory */}
        <GameTypeCard
          icon={<Grid className="w-5 h-5" />}
          name="Memory"
          color="text-cyan-400"
          bgColor="bg-cyan-500/10"
          stats={{
            bestScore: stats.best_memory_time_seconds || 0,
            label: "Meilleur temps",
            unit: "s",
            lowerIsBetter: true,
          }}
        />

        {/* Prédictions */}
        <GameTypeCard
          icon={<TrendingUp className="w-5 h-5" />}
          name="Prédictions"
          color="text-green-400"
          bgColor="bg-green-500/10"
          stats={{
            bestScore: stats.predictions_correct,
            total: stats.predictions_total,
            accuracy: stats.prediction_accuracy,
            label: "Correctes",
          }}
        />
      </div>

      {/* Jeu favori */}
      {stats.favorite_game && (
        <div className="p-4 rounded-xl bg-zinc-800/50 border border-zinc-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Star className="w-5 h-5 text-yellow-400" />
              <span className="text-zinc-400">Jeu favori</span>
            </div>
            <span className="font-bold text-white capitalize">
              {stats.favorite_game.replace("_", " ")}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

/* ==========================================================================
   GAME TYPE CARD
   ========================================================================== */

interface GameTypeCardProps {
  icon: React.ReactNode
  name: string
  color: string
  bgColor: string
  stats: {
    bestScore: number
    total?: number
    accuracy?: number
    label: string
    unit?: string
    lowerIsBetter?: boolean
  }
}

function GameTypeCard({
  icon,
  name,
  color,
  bgColor,
  stats,
}: GameTypeCardProps) {
  return (
    <div className={`p-4 rounded-xl ${bgColor} border border-white/5`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-lg flex items-center justify-center ${bgColor}`}
          >
            <span className={color}>{icon}</span>
          </div>
          <div>
            <p className="font-medium text-white">{name}</p>
            <p className="text-xs text-zinc-500">{stats.label}</p>
          </div>
        </div>

        <div className="text-right">
          <p className="text-xl font-bold text-white">
            {stats.bestScore}
            {stats.unit}
          </p>
          {stats.total !== undefined && (
            <p className="text-xs text-zinc-500">sur {stats.total}</p>
          )}
          {stats.accuracy !== undefined && (
            <p className="text-xs text-green-400">{stats.accuracy}% précision</p>
          )}
        </div>
      </div>
    </div>
  )
}

/* ==========================================================================
   PREDICTION STATS CARD
   ========================================================================== */

interface PredictionStatsCardProps {
  correct: number
  total: number
  accuracy: number
}

export function PredictionStatsCard({
  correct,
  total,
  accuracy,
}: PredictionStatsCardProps) {
  return (
    <div className="p-4 rounded-2xl bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/30">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="w-5 h-5 text-green-400" />
        <h3 className="font-bold text-white">Tes prédictions</h3>
      </div>

      {/* Accuracy gauge */}
      <div className="relative w-32 h-32 mx-auto mb-4">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          {/* Background circle */}
          <circle
            cx="50"
            cy="50"
            r="40"
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            className="text-zinc-700"
          />
          {/* Progress circle */}
          <motion.circle
            cx="50"
            cy="50"
            r="40"
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            strokeLinecap="round"
            className="text-green-500"
            initial={{ strokeDasharray: "0 251.2" }}
            animate={{
              strokeDasharray: `${(accuracy / 100) * 251.2} 251.2`,
            }}
            transition={{ duration: 1, ease: "easeOut" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-white">{accuracy}%</span>
          <span className="text-xs text-zinc-400">précision</span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 text-center">
        <div>
          <div className="flex items-center justify-center gap-1 text-green-400">
            <CheckCircle className="w-4 h-4" />
            <span className="text-xl font-bold">{correct}</span>
          </div>
          <p className="text-xs text-zinc-500">Correctes</p>
        </div>
        <div>
          <div className="flex items-center justify-center gap-1 text-zinc-400">
            <Target className="w-4 h-4" />
            <span className="text-xl font-bold">{total}</span>
          </div>
          <p className="text-xs text-zinc-500">Total</p>
        </div>
      </div>
    </div>
  )
}

/* ==========================================================================
   QUIZ PERFORMANCE CARD
   ========================================================================== */

interface QuizPerformanceCardProps {
  highestScore: number
  averageScore?: number
  totalQuizzes?: number
  bestStreak?: number
}

export function QuizPerformanceCard({
  highestScore,
  averageScore = 0,
  totalQuizzes = 0,
  bestStreak = 0,
}: QuizPerformanceCardProps) {
  return (
    <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-500/10 to-violet-500/10 border border-purple-500/30">
      <div className="flex items-center gap-2 mb-4">
        <Music className="w-5 h-5 text-purple-400" />
        <h3 className="font-bold text-white">Quiz Musical</h3>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="text-center p-3 rounded-xl bg-purple-500/10">
          <Trophy className="w-5 h-5 text-yellow-400 mx-auto mb-1" />
          <p className="text-2xl font-bold text-white">{highestScore}</p>
          <p className="text-xs text-zinc-400">Meilleur score</p>
        </div>
        <div className="text-center p-3 rounded-xl bg-purple-500/10">
          <Brain className="w-5 h-5 text-purple-400 mx-auto mb-1" />
          <p className="text-2xl font-bold text-white">{averageScore}</p>
          <p className="text-xs text-zinc-400">Score moyen</p>
        </div>
        <div className="text-center p-3 rounded-xl bg-purple-500/10">
          <Target className="w-5 h-5 text-cyan-400 mx-auto mb-1" />
          <p className="text-2xl font-bold text-white">{totalQuizzes}</p>
          <p className="text-xs text-zinc-400">Quiz joués</p>
        </div>
        <div className="text-center p-3 rounded-xl bg-purple-500/10">
          <Zap className="w-5 h-5 text-orange-400 mx-auto mb-1" />
          <p className="text-2xl font-bold text-white">{bestStreak}</p>
          <p className="text-xs text-zinc-400">Meilleure série</p>
        </div>
      </div>
    </div>
  )
}

/* ==========================================================================
   MEMORY STATS CARD
   ========================================================================== */

interface MemoryStatsCardProps {
  bestTime?: number
  totalGames?: number
  averageTime?: number
  perfectGames?: number
}

export function MemoryStatsCard({
  bestTime = 0,
  totalGames = 0,
  averageTime = 0,
  perfectGames = 0,
}: MemoryStatsCardProps) {
  return (
    <div className="p-4 rounded-2xl bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/30">
      <div className="flex items-center gap-2 mb-4">
        <Grid className="w-5 h-5 text-cyan-400" />
        <h3 className="font-bold text-white">Memory</h3>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="text-center p-3 rounded-xl bg-cyan-500/10">
          <Clock className="w-5 h-5 text-cyan-400 mx-auto mb-1" />
          <p className="text-2xl font-bold text-white">
            {bestTime > 0 ? formatTimeSpent(bestTime) : "—"}
          </p>
          <p className="text-xs text-zinc-400">Meilleur temps</p>
        </div>
        <div className="text-center p-3 rounded-xl bg-cyan-500/10">
          <Target className="w-5 h-5 text-blue-400 mx-auto mb-1" />
          <p className="text-2xl font-bold text-white">{totalGames}</p>
          <p className="text-xs text-zinc-400">Parties</p>
        </div>
        <div className="text-center p-3 rounded-xl bg-cyan-500/10">
          <Clock className="w-5 h-5 text-purple-400 mx-auto mb-1" />
          <p className="text-2xl font-bold text-white">
            {averageTime > 0 ? formatTimeSpent(averageTime) : "—"}
          </p>
          <p className="text-xs text-zinc-400">Temps moyen</p>
        </div>
        <div className="text-center p-3 rounded-xl bg-cyan-500/10">
          <Star className="w-5 h-5 text-yellow-400 mx-auto mb-1" />
          <p className="text-2xl font-bold text-white">{perfectGames}</p>
          <p className="text-xs text-zinc-400">Sans erreur</p>
        </div>
      </div>
    </div>
  )
}

/* ==========================================================================
   GAME HISTORY LIST
   ========================================================================== */

interface GameHistoryItem {
  id: string
  game_type: string
  score: number
  won: boolean
  played_at: string
  xp_earned: number
}

interface GameHistoryListProps {
  games: GameHistoryItem[]
}

export function GameHistoryList({ games }: GameHistoryListProps) {
  const gameIcons: Record<string, React.ReactNode> = {
    music_quiz: <Music className="w-4 h-4" />,
    memory: <Grid className="w-4 h-4" />,
    predictions: <TrendingUp className="w-4 h-4" />,
    daily_quiz: <Brain className="w-4 h-4" />,
  }

  const gameColors: Record<string, string> = {
    music_quiz: "text-purple-400 bg-purple-500/10",
    memory: "text-cyan-400 bg-cyan-500/10",
    predictions: "text-green-400 bg-green-500/10",
    daily_quiz: "text-yellow-400 bg-yellow-500/10",
  }

  if (games.length === 0) {
    return (
      <div className="p-4 rounded-xl bg-zinc-800/50 border border-zinc-700 text-center">
        <Gamepad2 className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
        <p className="text-sm text-zinc-400">Aucune partie récente</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium text-zinc-400">Historique récent</h4>
      {games.map((game) => (
        <div
          key={game.id}
          className="flex items-center gap-3 p-3 rounded-xl bg-zinc-800/30 border border-zinc-700"
        >
          {/* Icon */}
          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              gameColors[game.game_type] || "text-zinc-400 bg-zinc-700"
            }`}
          >
            {gameIcons[game.game_type] || <Gamepad2 className="w-4 h-4" />}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <p className="text-sm text-white capitalize">
              {game.game_type.replace("_", " ")}
            </p>
            <p className="text-xs text-zinc-500">
              {new Date(game.played_at).toLocaleDateString("fr-FR", {
                day: "numeric",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>

          {/* Score & Result */}
          <div className="text-right">
            <p className="font-bold text-white">{game.score}</p>
            <div className="flex items-center gap-1">
              {game.won ? (
                <CheckCircle className="w-3 h-3 text-green-400" />
              ) : (
                <XCircle className="w-3 h-3 text-red-400" />
              )}
              <span className="text-xs text-yellow-400">+{game.xp_earned}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

/* ==========================================================================
   WIN RATE GAUGE
   ========================================================================== */

interface WinRateGaugeProps {
  winRate: number
  wins: number
  total: number
}

export function WinRateGauge({ winRate, wins, total }: WinRateGaugeProps) {
  return (
    <div className="p-4 rounded-xl bg-zinc-800/50 border border-zinc-700">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-zinc-400">Win Rate</span>
        <span className="text-lg font-bold text-white">{winRate}%</span>
      </div>

      {/* Progress bar */}
      <div className="h-3 bg-zinc-700 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${winRate}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
          className={`h-full rounded-full ${
            winRate >= 70
              ? "bg-green-500"
              : winRate >= 50
              ? "bg-yellow-500"
              : "bg-red-500"
          }`}
        />
      </div>

      <p className="text-xs text-zinc-500 mt-2 text-center">
        {wins} victoires sur {total} parties
      </p>
    </div>
  )
}
