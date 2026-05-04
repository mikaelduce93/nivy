/**
 * TEENS PARTY MOROCCO - Event Stats Card Component
 * =================================================
 *
 * Carte de statistiques événementielles de l'utilisateur.
 */

"use client"

import { motion } from "framer-motion"
import {
  Calendar,
  Clock,
  Trophy,
  Star,
  Sunrise,
  Moon,
  Zap,
  TrendingUp,
  Award,
  MapPin,
  Heart,
} from "lucide-react"
import {
  type UserEventStats,
  formatDuration,
  generateEventSummary,
} from "../../features/event-challenges"

/* ==========================================================================
   MAIN STATS CARD
   ========================================================================== */

interface EventStatsCardProps {
  stats: UserEventStats
  className?: string
}

export function EventStatsCard({ stats, className = "" }: EventStatsCardProps) {
  const summary = generateEventSummary(stats)

  return (
    <div className={`p-4 rounded-2xl bg-zinc-900 border border-zinc-800 ${className}`}>
      <h3 className="font-bold text-white mb-4 flex items-center gap-2">
        <Trophy className="w-5 h-5 text-yellow-400" />
        Tes stats événements
      </h3>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <StatItem
          icon={<Calendar className="w-5 h-5" />}
          label="Événements"
          value={stats.total_events}
          color="cyan"
        />
        <StatItem
          icon={<MapPin className="w-5 h-5" />}
          label="Check-ins"
          value={stats.total_check_ins}
          color="green"
        />
        <StatItem
          icon={<Clock className="w-5 h-5" />}
          label="Temps total"
          value={formatDuration(stats.total_duration_minutes)}
          color="purple"
        />
        <StatItem
          icon={<Trophy className="w-5 h-5" />}
          label="Défis complétés"
          value={stats.challenges_completed}
          color="yellow"
        />
      </div>

      {/* Achievements */}
      <div className="flex items-center gap-4 mb-4">
        {stats.early_bird_count > 0 && (
          <div className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-yellow-500/10 text-yellow-400 text-sm">
            <Sunrise className="w-4 h-4" />
            <span>{stats.early_bird_count}x Early Bird</span>
          </div>
        )}
        {stats.stay_late_count > 0 && (
          <div className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-purple-500/10 text-purple-400 text-sm">
            <Moon className="w-4 h-4" />
            <span>{stats.stay_late_count}x Night Owl</span>
          </div>
        )}
      </div>

      {/* XP Total */}
      <div className="p-3 rounded-xl bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-yellow-400" />
            <span className="text-sm text-zinc-400">XP événements</span>
          </div>
          <span className="text-2xl font-bold text-yellow-400">
            {stats.total_xp_from_events.toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  )
}

/* ==========================================================================
   STAT ITEM
   ========================================================================== */

interface StatItemProps {
  icon: React.ReactNode
  label: string
  value: string | number
  color: "cyan" | "green" | "purple" | "yellow" | "pink"
}

function StatItem({ icon, label, value, color }: StatItemProps) {
  const colorClasses = {
    cyan: "text-cyan-400 bg-cyan-500/10",
    green: "text-green-400 bg-green-500/10",
    purple: "text-purple-400 bg-purple-500/10",
    yellow: "text-yellow-400 bg-yellow-500/10",
    pink: "text-pink-400 bg-pink-500/10",
  }

  return (
    <div className="p-3 rounded-xl bg-zinc-800/50">
      <div className={`w-8 h-8 rounded-lg ${colorClasses[color]} flex items-center justify-center mb-2`}>
        <span className={colorClasses[color].split(" ")[0]}>{icon}</span>
      </div>
      <p className="text-xl font-bold text-white">{value}</p>
      <p className="text-xs text-zinc-500">{label}</p>
    </div>
  )
}

/* ==========================================================================
   COMPACT STATS ROW
   ========================================================================== */

interface CompactStatsRowProps {
  stats: UserEventStats
}

export function CompactStatsRow({ stats }: CompactStatsRowProps) {
  return (
    <div className="flex items-center gap-4 overflow-x-auto py-2 scrollbar-hide">
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyan-500/10 text-cyan-400 whitespace-nowrap">
        <Calendar className="w-4 h-4" />
        <span className="font-medium">{stats.total_events}</span>
        <span className="text-xs text-cyan-400/70">events</span>
      </div>
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-500/10 text-purple-400 whitespace-nowrap">
        <Clock className="w-4 h-4" />
        <span className="font-medium">{formatDuration(stats.total_duration_minutes)}</span>
      </div>
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-yellow-500/10 text-yellow-400 whitespace-nowrap">
        <Zap className="w-4 h-4" />
        <span className="font-medium">{stats.total_xp_from_events}</span>
        <span className="text-xs text-yellow-400/70">XP</span>
      </div>
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/10 text-green-400 whitespace-nowrap">
        <Trophy className="w-4 h-4" />
        <span className="font-medium">{stats.challenges_completed}</span>
        <span className="text-xs text-green-400/70">défis</span>
      </div>
    </div>
  )
}

/* ==========================================================================
   LOYALTY BADGE
   ========================================================================== */

interface LoyaltyBadgeProps {
  eventCount: number
}

export function LoyaltyBadge({ eventCount }: LoyaltyBadgeProps) {
  const getLoyaltyLevel = (count: number) => {
    if (count >= 50) return { label: "Légende", color: "from-yellow-500 to-amber-500", icon: "👑" }
    if (count >= 25) return { label: "VIP", color: "from-purple-500 to-pink-500", icon: "💎" }
    if (count >= 10) return { label: "Fidèle", color: "from-cyan-500 to-blue-500", icon: "⭐" }
    if (count >= 5) return { label: "Habitué", color: "from-green-500 to-emerald-500", icon: "🎉" }
    return { label: "Nouveau", color: "from-zinc-500 to-zinc-600", icon: "👋" }
  }

  const level = getLoyaltyLevel(eventCount)

  return (
    <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r ${level.color}`}>
      <span>{level.icon}</span>
      <span className="font-bold text-white">{level.label}</span>
      <span className="text-white/70">•</span>
      <span className="text-white/70">{eventCount} events</span>
    </div>
  )
}

/* ==========================================================================
   EVENT STREAK CARD
   ========================================================================== */

interface EventStreakCardProps {
  currentStreak: number
  longestStreak: number
  lastEventDate?: string
}

export function EventStreakCard({
  currentStreak,
  longestStreak,
  lastEventDate,
}: EventStreakCardProps) {
  const isActive = currentStreak > 0

  return (
    <div className="p-4 rounded-2xl bg-gradient-to-br from-orange-500/10 to-red-500/10 border border-orange-500/30">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-orange-400" />
          </div>
          <div>
            <p className="font-bold text-white">Série d'événements</p>
            <p className="text-xs text-zinc-400">
              {isActive ? "En cours" : "Interrompue"}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className={`text-3xl font-bold ${isActive ? "text-orange-400" : "text-zinc-500"}`}>
            {currentStreak}
          </p>
          <p className="text-xs text-zinc-400">semaines</p>
        </div>
      </div>

      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-1 text-zinc-400">
          <Award className="w-4 h-4" />
          <span>Record: {longestStreak} semaines</span>
        </div>
        {lastEventDate && (
          <span className="text-xs text-zinc-500">
            Dernier: {new Date(lastEventDate).toLocaleDateString("fr-FR", {
              day: "numeric",
              month: "short",
            })}
          </span>
        )}
      </div>
    </div>
  )
}

/* ==========================================================================
   FAVORITE DAY CARD
   ========================================================================== */

interface FavoriteDayCardProps {
  favoriteDay: string | null
  eventsByDay?: Record<string, number>
}

export function FavoriteDayCard({ favoriteDay, eventsByDay }: FavoriteDayCardProps) {
  const dayNames: Record<string, string> = {
    monday: "Lundi",
    tuesday: "Mardi",
    wednesday: "Mercredi",
    thursday: "Jeudi",
    friday: "Vendredi",
    saturday: "Samedi",
    sunday: "Dimanche",
  }

  if (!favoriteDay) {
    return null
  }

  return (
    <div className="p-4 rounded-2xl bg-zinc-800/50">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-pink-500/20 flex items-center justify-center">
          <Heart className="w-6 h-6 text-pink-400" />
        </div>
        <div>
          <p className="text-sm text-zinc-400">Ton jour préféré</p>
          <p className="text-xl font-bold text-white">
            {dayNames[favoriteDay] || favoriteDay}
          </p>
        </div>
      </div>
    </div>
  )
}

/* ==========================================================================
   RECORD CARD
   ========================================================================== */

interface RecordCardProps {
  longestStayMinutes: number
  averageRatingGiven: number | null
  totalReviews: number
}

export function RecordCard({
  longestStayMinutes,
  averageRatingGiven,
  totalReviews,
}: RecordCardProps) {
  return (
    <div className="p-4 rounded-2xl bg-zinc-800/50">
      <h3 className="font-bold text-white mb-3 flex items-center gap-2">
        <Award className="w-5 h-5 text-amber-400" />
        Tes records
      </h3>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-zinc-400">
            <Clock className="w-4 h-4" />
            <span>Plus longue soirée</span>
          </div>
          <span className="font-bold text-white">
            {formatDuration(longestStayMinutes)}
          </span>
        </div>

        {averageRatingGiven !== null && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-zinc-400">
              <Star className="w-4 h-4" />
              <span>Note moyenne donnée</span>
            </div>
            <span className="font-bold text-yellow-400">
              {averageRatingGiven.toFixed(1)}/5
            </span>
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-zinc-400">
            <Star className="w-4 h-4" />
            <span>Avis laissés</span>
          </div>
          <span className="font-bold text-white">{totalReviews}</span>
        </div>
      </div>
    </div>
  )
}
