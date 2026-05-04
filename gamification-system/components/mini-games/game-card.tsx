/**
 * TEENS PARTY MOROCCO - Game Card Component
 * ==========================================
 *
 * Cartes d'affichage des mini-jeux.
 */

"use client"

import { motion } from "framer-motion"
import {
  Music,
  Grid,
  TrendingUp,
  Calendar,
  Headphones,
  Smile,
  Play,
  Users,
  Trophy,
  Zap,
  Clock,
  Lock,
  ChevronRight,
} from "lucide-react"
import {
  type MiniGameType,
  GAME_TYPE_CONFIG,
  isCooldownActive,
  formatGameTime,
} from "../../features/mini-games"

/* ==========================================================================
   ICON MAPPING
   ========================================================================== */

const gameIcons: Record<string, React.ReactNode> = {
  Music: <Music className="w-6 h-6" />,
  Grid: <Grid className="w-6 h-6" />,
  TrendingUp: <TrendingUp className="w-6 h-6" />,
  Calendar: <Calendar className="w-6 h-6" />,
  Headphones: <Headphones className="w-6 h-6" />,
  Smile: <Smile className="w-6 h-6" />,
}

/* ==========================================================================
   MAIN GAME CARD
   ========================================================================== */

interface GameCardProps {
  gameType: MiniGameType
  onClick?: () => void
  lastPlayedAt?: string | null
  bestScore?: number
  isDaily?: boolean
}

export function GameCard({
  gameType,
  onClick,
  lastPlayedAt,
  bestScore,
  isDaily = false,
}: GameCardProps) {
  const config = GAME_TYPE_CONFIG[gameType.slug]
  const cooldown = isCooldownActive(lastPlayedAt || null, gameType.cooldown_minutes)

  return (
    <motion.div
      whileHover={!cooldown.active ? { scale: 1.02 } : {}}
      whileTap={!cooldown.active ? { scale: 0.98 } : {}}
      onClick={!cooldown.active ? onClick : undefined}
      className={`relative p-4 rounded-2xl border overflow-hidden transition-all ${
        cooldown.active
          ? "bg-zinc-900/50 border-zinc-800 opacity-60"
          : `bg-gradient-to-br ${config?.gradient || "from-zinc-800 to-zinc-900"} border-white/10`
      } ${!cooldown.active ? "cursor-pointer" : ""}`}
    >
      {/* Daily Badge */}
      {isDaily && (
        <div className="absolute top-0 right-0 px-3 py-1 bg-yellow-500 text-black text-xs font-bold rounded-bl-xl">
          QUOTIDIEN
        </div>
      )}

      {/* Cooldown Overlay */}
      {cooldown.active && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="text-center">
            <Lock className="w-8 h-8 text-zinc-400 mx-auto mb-2" />
            <p className="text-sm text-zinc-400">Disponible dans</p>
            <p className="text-xl font-bold text-white">
              {formatGameTime(cooldown.remainingSeconds)}
            </p>
          </div>
        </div>
      )}

      <div className="flex items-start gap-4">
        {/* Icon */}
        <div
          className="w-14 h-14 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: `${config?.color || "#ffffff"}20` }}
        >
          <span style={{ color: config?.color || "#ffffff" }}>
            {gameIcons[config?.icon || "Play"] || <Play className="w-6 h-6" />}
          </span>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-white">{gameType.name}</h3>
          <p className="text-sm text-zinc-400 line-clamp-2">
            {gameType.description}
          </p>

          {/* Stats */}
          <div className="flex items-center gap-4 mt-2 text-xs">
            {/* Players */}
            {gameType.max_players > 1 && (
              <div className="flex items-center gap-1 text-zinc-400">
                <Users className="w-3 h-3" />
                {gameType.min_players}-{gameType.max_players}
              </div>
            )}

            {/* Time */}
            {gameType.time_limit_seconds && (
              <div className="flex items-center gap-1 text-zinc-400">
                <Clock className="w-3 h-3" />
                {formatGameTime(gameType.time_limit_seconds)}
              </div>
            )}

            {/* XP */}
            <div className="flex items-center gap-1 text-yellow-400">
              <Zap className="w-3 h-3" />
              +{gameType.base_xp} XP
            </div>
          </div>
        </div>

        {/* Arrow */}
        {!cooldown.active && (
          <ChevronRight className="w-5 h-5 text-zinc-500" />
        )}
      </div>

      {/* Best Score */}
      {bestScore !== undefined && bestScore > 0 && (
        <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between">
          <span className="text-xs text-zinc-400">Meilleur score</span>
          <div className="flex items-center gap-1 text-yellow-400">
            <Trophy className="w-3 h-3" />
            <span className="font-bold">{bestScore.toLocaleString()}</span>
          </div>
        </div>
      )}
    </motion.div>
  )
}

/* ==========================================================================
   COMPACT GAME CARD
   ========================================================================== */

interface CompactGameCardProps {
  gameType: MiniGameType
  onClick?: () => void
  isLocked?: boolean
}

export function CompactGameCard({
  gameType,
  onClick,
  isLocked = false,
}: CompactGameCardProps) {
  const config = GAME_TYPE_CONFIG[gameType.slug]

  return (
    <motion.div
      whileHover={!isLocked ? { scale: 1.02 } : {}}
      whileTap={!isLocked ? { scale: 0.98 } : {}}
      onClick={!isLocked ? onClick : undefined}
      className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${
        isLocked
          ? "bg-zinc-800/30 opacity-50"
          : "bg-zinc-800/50 hover:bg-zinc-800"
      } ${!isLocked ? "cursor-pointer" : ""}`}
    >
      {/* Icon */}
      <div
        className="w-10 h-10 rounded-lg flex items-center justify-center"
        style={{ backgroundColor: `${config?.color || "#ffffff"}20` }}
      >
        <span style={{ color: config?.color || "#ffffff" }}>
          {gameIcons[config?.icon || "Play"] || <Play className="w-4 h-4" />}
        </span>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="font-medium text-white truncate">{gameType.name}</p>
        <p className="text-xs text-zinc-500">{config?.emoji} {gameType.slug}</p>
      </div>

      {/* XP */}
      {!isLocked && (
        <div className="flex items-center gap-1 text-yellow-400 text-xs">
          <Zap className="w-3 h-3" />
          +{gameType.base_xp}
        </div>
      )}

      {isLocked && <Lock className="w-4 h-4 text-zinc-600" />}
    </motion.div>
  )
}

/* ==========================================================================
   FEATURED GAME CARD
   ========================================================================== */

interface FeaturedGameCardProps {
  gameType: MiniGameType
  onClick?: () => void
  playerCount?: number
}

export function FeaturedGameCard({
  gameType,
  onClick,
  playerCount = 0,
}: FeaturedGameCardProps) {
  const config = GAME_TYPE_CONFIG[gameType.slug]

  return (
    <motion.div
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      onClick={onClick}
      className={`relative p-5 rounded-2xl bg-gradient-to-br ${config?.gradient || "from-zinc-800 to-zinc-900"} border border-white/10 cursor-pointer overflow-hidden`}
    >
      {/* Background decoration */}
      <div className="absolute top-0 right-0 opacity-10 text-8xl">
        {config?.emoji || "🎮"}
      </div>

      <div className="relative">
        {/* Icon & Title */}
        <div className="flex items-center gap-4 mb-4">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{ backgroundColor: `${config?.color || "#ffffff"}20` }}
          >
            <span style={{ color: config?.color || "#ffffff" }}>
              {gameIcons[config?.icon || "Play"] || <Play className="w-8 h-8" />}
            </span>
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">{gameType.name}</h3>
            <p className="text-sm text-zinc-400">{gameType.description}</p>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-6 mb-4">
          <div className="flex items-center gap-2 text-sm">
            <Users className="w-4 h-4 text-cyan-400" />
            <span className="text-zinc-400">
              {playerCount} joueur{playerCount !== 1 ? "s" : ""} en ligne
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Zap className="w-4 h-4 text-yellow-400" />
            <span className="text-yellow-400">+{gameType.base_xp} XP</span>
          </div>
        </div>

        {/* Play Button */}
        <button className="w-full py-3 rounded-xl bg-white/20 text-white font-bold hover:bg-white/30 transition-colors flex items-center justify-center gap-2">
          <Play className="w-5 h-5" />
          Jouer maintenant
        </button>
      </div>
    </motion.div>
  )
}

/* ==========================================================================
   DAILY GAME WIDGET
   ========================================================================== */

interface DailyGameWidgetProps {
  gameType: MiniGameType
  hasPlayedToday: boolean
  bestScore?: number
  onClick?: () => void
}

export function DailyGameWidget({
  gameType,
  hasPlayedToday,
  bestScore,
  onClick,
}: DailyGameWidgetProps) {
  const config = GAME_TYPE_CONFIG[gameType.slug]

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="p-4 rounded-2xl bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 cursor-pointer"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-yellow-400" />
          <span className="font-bold text-yellow-400">QUIZ DU JOUR</span>
        </div>
        {hasPlayedToday ? (
          <span className="text-xs px-2 py-1 rounded-full bg-green-500/20 text-green-400">
            ✓ Joué
          </span>
        ) : (
          <span className="text-xs px-2 py-1 rounded-full bg-yellow-500 text-black font-bold animate-pulse">
            NOUVEAU
          </span>
        )}
      </div>

      <h3 className="font-bold text-white mb-1">{gameType.name}</h3>
      <p className="text-sm text-zinc-400 mb-3">{gameType.description}</p>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 text-yellow-400">
          <Zap className="w-4 h-4" />
          <span className="font-bold">+{gameType.base_xp} XP</span>
        </div>
        {bestScore !== undefined && bestScore > 0 && (
          <div className="flex items-center gap-1 text-zinc-400 text-sm">
            <Trophy className="w-4 h-4" />
            <span>Record: {bestScore}</span>
          </div>
        )}
      </div>
    </motion.div>
  )
}
