/**
 * TEENS PARTY MOROCCO - Stats Overview Component
 * ===============================================
 *
 * Vue d'ensemble des statistiques utilisateur.
 */

"use client"

import { motion } from "framer-motion"
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Zap,
  Calendar,
  Target,
  Gamepad2,
  Award,
  Users,
  Clock,
  Trophy,
  Flame,
  Crown,
  Star,
} from "lucide-react"
import {
  type LifetimeStats,
  type DashboardStats,
  type StatComparison,
  formatLargeNumber,
  formatTimeSpent,
  calculateLevelFromXp,
  getRankText,
  getEncouragementMessage,
} from "../../features/stats-dashboard"

/* ==========================================================================
   STATS OVERVIEW
   ========================================================================== */

interface StatsOverviewProps {
  stats: DashboardStats
  comparison?: StatComparison[] | null
}

export function StatsOverview({ stats, comparison }: StatsOverviewProps) {
  const lifetime = stats.lifetime
  const levelInfo = lifetime
    ? calculateLevelFromXp(lifetime.total_xp)
    : { level: 1, currentXp: 0, xpForNextLevel: 150, progress: 0 }

  const encouragement = lifetime ? getEncouragementMessage(lifetime) : null

  return (
    <div className="space-y-6">
      {/* Header avec niveau et rang */}
      <div className="p-6 rounded-2xl bg-gradient-to-br from-cyan-500/20 via-blue-500/20 to-purple-500/20 border border-white/10">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-white">
              Niveau {levelInfo.level}
            </h2>
            <p className="text-zinc-400">
              {stats.rank
                ? getRankText(stats.rank.global_rank, stats.rank.total_users)
                : "Non classé"}
            </p>
          </div>
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-cyan-500 to-purple-500 flex items-center justify-center">
            <span className="text-3xl font-bold text-white">
              {levelInfo.level}
            </span>
          </div>
        </div>

        {/* Barre de progression XP */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-zinc-400">
              {formatLargeNumber(levelInfo.currentXp)} XP
            </span>
            <span className="text-zinc-400">
              {formatLargeNumber(levelInfo.xpForNextLevel)} XP
            </span>
          </div>
          <div className="h-3 bg-zinc-800 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${levelInfo.progress}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
              className="h-full bg-gradient-to-r from-cyan-500 to-purple-500 rounded-full"
            />
          </div>
          <p className="text-xs text-zinc-500 text-center">
            {levelInfo.xpForNextLevel - levelInfo.currentXp} XP jusqu'au niveau{" "}
            {levelInfo.level + 1}
          </p>
        </div>
      </div>

      {/* Encouragement */}
      {encouragement && (
        <div className="p-4 rounded-xl bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/30">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{encouragement.emoji}</span>
            <div>
              <p className="font-bold text-white">{encouragement.title}</p>
              <p className="text-sm text-zinc-400">{encouragement.message}</p>
            </div>
          </div>
        </div>
      )}

      {/* Stats principales en grid */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          icon={<Zap className="w-5 h-5" />}
          label="XP Total"
          value={formatLargeNumber(lifetime?.total_xp || 0)}
          color="text-yellow-400"
          bgColor="bg-yellow-500/10"
        />
        <StatCard
          icon={<Calendar className="w-5 h-5" />}
          label="Événements"
          value={lifetime?.total_events_attended || 0}
          color="text-purple-400"
          bgColor="bg-purple-500/10"
        />
        <StatCard
          icon={<Target className="w-5 h-5" />}
          label="Défis"
          value={lifetime?.total_challenges_completed || 0}
          color="text-cyan-400"
          bgColor="bg-cyan-500/10"
        />
        <StatCard
          icon={<Gamepad2 className="w-5 h-5" />}
          label="Parties"
          value={lifetime?.total_games_played || 0}
          color="text-green-400"
          bgColor="bg-green-500/10"
        />
        <StatCard
          icon={<Award className="w-5 h-5" />}
          label="Badges"
          value={lifetime?.total_badges_earned || 0}
          color="text-orange-400"
          bgColor="bg-orange-500/10"
        />
        <StatCard
          icon={<Users className="w-5 h-5" />}
          label="Amis"
          value={lifetime?.total_friends || 0}
          color="text-pink-400"
          bgColor="bg-pink-500/10"
        />
      </div>

      {/* Streaks */}
      {lifetime && (
        <div className="grid grid-cols-2 gap-3">
          <StreakCard
            icon={<Flame className="w-5 h-5" />}
            label="Série actuelle"
            value={lifetime.current_login_streak}
            record={lifetime.longest_login_streak}
            color="text-orange-400"
          />
          <StreakCard
            icon={<Calendar className="w-5 h-5" />}
            label="Série événements"
            value={lifetime.current_event_streak}
            record={lifetime.longest_event_streak}
            color="text-purple-400"
          />
        </div>
      )}

      {/* Percentile */}
      {stats.rank && stats.rank.percentile > 0 && (
        <div className="p-4 rounded-xl bg-zinc-800/50 border border-zinc-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Crown className="w-5 h-5 text-yellow-400" />
              <span className="text-zinc-400">Tu fais mieux que</span>
            </div>
            <span className="text-2xl font-bold text-yellow-400">
              {stats.rank.percentile}%
            </span>
          </div>
          <p className="text-xs text-zinc-500 mt-1">des autres membres</p>
        </div>
      )}
    </div>
  )
}

/* ==========================================================================
   STAT CARD
   ========================================================================== */

interface StatCardProps {
  icon: React.ReactNode
  label: string
  value: number | string
  color: string
  bgColor: string
  trend?: "up" | "down" | "stable"
  trendValue?: number
}

export function StatCard({
  icon,
  label,
  value,
  color,
  bgColor,
  trend,
  trendValue,
}: StatCardProps) {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className={`p-4 rounded-xl ${bgColor} border border-white/5`}
    >
      <div className="flex items-center gap-2 mb-2">
        <span className={color}>{icon}</span>
        <span className="text-xs text-zinc-400">{label}</span>
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
      {trend && trendValue !== undefined && (
        <div
          className={`flex items-center gap-1 text-xs mt-1 ${
            trend === "up"
              ? "text-green-400"
              : trend === "down"
              ? "text-red-400"
              : "text-zinc-500"
          }`}
        >
          {trend === "up" ? (
            <TrendingUp className="w-3 h-3" />
          ) : trend === "down" ? (
            <TrendingDown className="w-3 h-3" />
          ) : (
            <Minus className="w-3 h-3" />
          )}
          <span>
            {trend === "up" ? "+" : ""}
            {trendValue}%
          </span>
        </div>
      )}
    </motion.div>
  )
}

/* ==========================================================================
   STREAK CARD
   ========================================================================== */

interface StreakCardProps {
  icon: React.ReactNode
  label: string
  value: number
  record: number
  color: string
}

function StreakCard({ icon, label, value, record, color }: StreakCardProps) {
  const isAtRecord = value >= record && record > 0

  return (
    <div className="p-4 rounded-xl bg-zinc-800/50 border border-zinc-700">
      <div className="flex items-center gap-2 mb-2">
        <span className={color}>{icon}</span>
        <span className="text-xs text-zinc-400">{label}</span>
      </div>
      <div className="flex items-end justify-between">
        <div>
          <p className="text-2xl font-bold text-white">{value}</p>
          <p className="text-xs text-zinc-500">jours</p>
        </div>
        {record > 0 && (
          <div className="text-right">
            <div className="flex items-center gap-1">
              {isAtRecord && <Star className="w-3 h-3 text-yellow-400" />}
              <span className="text-xs text-zinc-500">Record: {record}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/* ==========================================================================
   COMPARISON CARD
   ========================================================================== */

interface ComparisonCardProps {
  label: string
  userValue: number
  averageValue: number
  icon: React.ReactNode
  color: string
}

export function ComparisonCard({
  label,
  userValue,
  averageValue,
  icon,
  color,
}: ComparisonCardProps) {
  const percentAbove =
    averageValue === 0
      ? userValue > 0
        ? 100
        : 0
      : Math.round(((userValue - averageValue) / averageValue) * 100)

  const isAbove = percentAbove > 0

  return (
    <div className="p-4 rounded-xl bg-zinc-800/50 border border-zinc-700">
      <div className="flex items-center gap-2 mb-3">
        <span className={color}>{icon}</span>
        <span className="text-sm text-zinc-400">{label}</span>
      </div>

      <div className="flex items-end justify-between mb-2">
        <div>
          <p className="text-xl font-bold text-white">
            {formatLargeNumber(userValue)}
          </p>
          <p className="text-xs text-zinc-500">
            Moyenne: {formatLargeNumber(averageValue)}
          </p>
        </div>
        <div
          className={`px-2 py-1 rounded-full text-xs font-bold ${
            isAbove
              ? "bg-green-500/20 text-green-400"
              : "bg-red-500/20 text-red-400"
          }`}
        >
          {isAbove ? "+" : ""}
          {percentAbove}%
        </div>
      </div>

      {/* Barre de comparaison */}
      <div className="h-2 bg-zinc-700 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${
            isAbove ? "bg-green-500" : "bg-red-500"
          }`}
          style={{
            width: `${Math.min(100, (userValue / Math.max(averageValue, 1)) * 50)}%`,
          }}
        />
      </div>
    </div>
  )
}

/* ==========================================================================
   QUICK STATS ROW
   ========================================================================== */

interface QuickStatsRowProps {
  stats: LifetimeStats
}

export function QuickStatsRow({ stats }: QuickStatsRowProps) {
  const items = [
    { label: "XP", value: formatLargeNumber(stats.total_xp), color: "text-yellow-400" },
    { label: "Events", value: stats.total_events_attended, color: "text-purple-400" },
    { label: "Badges", value: stats.total_badges_earned, color: "text-orange-400" },
    { label: "Amis", value: stats.total_friends, color: "text-pink-400" },
  ]

  return (
    <div className="flex items-center justify-around p-3 rounded-xl bg-zinc-800/50 border border-zinc-700">
      {items.map((item, idx) => (
        <div key={item.label} className="text-center">
          <p className={`text-lg font-bold ${item.color}`}>{item.value}</p>
          <p className="text-xs text-zinc-500">{item.label}</p>
        </div>
      ))}
    </div>
  )
}

/* ==========================================================================
   TIME STATS
   ========================================================================== */

interface TimeStatsProps {
  stats: LifetimeStats
}

export function TimeStats({ stats }: TimeStatsProps) {
  return (
    <div className="p-4 rounded-xl bg-gradient-to-br from-blue-500/10 to-indigo-500/10 border border-blue-500/30">
      <div className="flex items-center gap-2 mb-4">
        <Clock className="w-5 h-5 text-blue-400" />
        <h3 className="font-bold text-white">Temps aux événements</h3>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-2xl font-bold text-white">
            {Math.round(stats.total_event_hours || 0)}h
          </p>
          <p className="text-xs text-zinc-400">Temps total</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-white">
            {stats.average_stay_duration_minutes
              ? formatTimeSpent(stats.average_stay_duration_minutes)
              : "0min"}
          </p>
          <p className="text-xs text-zinc-400">Durée moyenne</p>
        </div>
      </div>

      {stats.earliest_arrival_time && (
        <div className="mt-4 pt-4 border-t border-blue-500/20 grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-zinc-400">Plus tôt arrivé</p>
            <p className="text-white font-medium">{stats.earliest_arrival_time}</p>
          </div>
          <div>
            <p className="text-zinc-400">Plus tard parti</p>
            <p className="text-white font-medium">
              {stats.latest_departure_time || "-"}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
