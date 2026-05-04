/**
 * TEENS PARTY MOROCCO - Crew Card Component
 * ==========================================
 *
 * Carte d'affichage d'un crew.
 */

"use client"

import { motion } from "framer-motion"
import {
  Users,
  Trophy,
  Zap,
  Crown,
  Lock,
  Unlock,
  ChevronRight,
  Star,
} from "lucide-react"
import {
  type Crew,
  type CrewLeaderboardEntry,
  getCrewTier,
  getTierProgress,
  formatCrewXp,
} from "../../features/crews"

/* ==========================================================================
   CREW CARD
   ========================================================================== */

interface CrewCardProps {
  crew: Crew
  memberCount?: number
  onClick?: () => void
  showJoinButton?: boolean
  onJoin?: () => void
  isJoining?: boolean
}

export function CrewCard({
  crew,
  memberCount,
  onClick,
  showJoinButton = false,
  onJoin,
  isJoining = false,
}: CrewCardProps) {
  const tier = getCrewTier(crew.total_xp)
  const tierProgress = getTierProgress(crew.total_xp)

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="relative p-4 rounded-2xl bg-zinc-900 border border-zinc-800 overflow-hidden cursor-pointer group"
    >
      {/* Banner/Background */}
      {crew.banner_url ? (
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `url(${crew.banner_url})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
      ) : (
        <div
          className="absolute inset-0 opacity-10"
          style={{
            background: `linear-gradient(135deg, ${crew.color}, transparent)`,
          }}
        />
      )}

      <div className="relative">
        {/* Header */}
        <div className="flex items-start gap-3">
          {/* Avatar */}
          <div
            className="w-14 h-14 rounded-xl flex items-center justify-center overflow-hidden"
            style={{ backgroundColor: `${crew.color}30` }}
          >
            {crew.avatar_url ? (
              <img
                src={crew.avatar_url}
                alt={crew.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <Users className="w-7 h-7" style={{ color: crew.color }} />
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-white truncate">{crew.name}</h3>
              {!crew.is_public && (
                <Lock className="w-4 h-4 text-zinc-500 flex-shrink-0" />
              )}
            </div>

            {crew.motto && (
              <p className="text-sm text-zinc-400 truncate italic">
                "{crew.motto}"
              </p>
            )}

            {/* Tier Badge */}
            <div className="flex items-center gap-2 mt-1">
              <span
                className="text-xs px-2 py-0.5 rounded-full font-medium"
                style={{
                  backgroundColor: `${tier.color}20`,
                  color: tier.color,
                }}
              >
                {tier.tier}
              </span>
              <span className="text-xs text-zinc-500">
                {formatCrewXp(crew.total_xp)} XP
              </span>
            </div>
          </div>

          {/* Arrow */}
          {onClick && (
            <ChevronRight className="w-5 h-5 text-zinc-500 group-hover:text-white transition-colors" />
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 mt-4">
          <div className="p-2 rounded-lg bg-zinc-800/50 text-center">
            <div className="flex items-center justify-center gap-1 text-cyan-400">
              <Users className="w-4 h-4" />
              <span className="font-bold">
                {memberCount ?? "?"}/{crew.max_members}
              </span>
            </div>
            <p className="text-xs text-zinc-500">Membres</p>
          </div>

          <div className="p-2 rounded-lg bg-zinc-800/50 text-center">
            <div className="flex items-center justify-center gap-1 text-yellow-400">
              <Zap className="w-4 h-4" />
              <span className="font-bold">{formatCrewXp(crew.total_xp)}</span>
            </div>
            <p className="text-xs text-zinc-500">XP Total</p>
          </div>

          <div className="p-2 rounded-lg bg-zinc-800/50 text-center">
            <div className="flex items-center justify-center gap-1 text-purple-400">
              <Star className="w-4 h-4" />
              <span className="font-bold">{crew.average_level.toFixed(1)}</span>
            </div>
            <p className="text-xs text-zinc-500">Niveau Moy.</p>
          </div>
        </div>

        {/* Tier Progress */}
        {tier.nextTierXp && (
          <div className="mt-3">
            <div className="flex justify-between text-xs text-zinc-400 mb-1">
              <span>{tier.tier}</span>
              <span>{tierProgress}%</span>
            </div>
            <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ backgroundColor: tier.color }}
                initial={{ width: 0 }}
                animate={{ width: `${tierProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Join Button */}
        {showJoinButton && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onJoin?.()
            }}
            disabled={isJoining}
            className="w-full mt-4 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-purple-500 text-white font-semibold disabled:opacity-50 hover:opacity-90 transition-opacity"
          >
            {isJoining
              ? "Demande en cours..."
              : crew.requires_approval
              ? "Demander à rejoindre"
              : "Rejoindre"}
          </button>
        )}
      </div>
    </motion.div>
  )
}

/* ==========================================================================
   LEADERBOARD CREW CARD
   ========================================================================== */

interface LeaderboardCrewCardProps {
  entry: CrewLeaderboardEntry
  isUserCrew?: boolean
  onClick?: () => void
}

export function LeaderboardCrewCard({
  entry,
  isUserCrew = false,
  onClick,
}: LeaderboardCrewCardProps) {
  const tier = getCrewTier(entry.total_xp)

  const getRankStyle = (rank: number) => {
    if (rank === 1) return { bg: "bg-yellow-500", text: "text-black", icon: Crown }
    if (rank === 2) return { bg: "bg-zinc-400", text: "text-black", icon: Trophy }
    if (rank === 3) return { bg: "bg-amber-700", text: "text-white", icon: Trophy }
    return { bg: "bg-zinc-700", text: "text-zinc-300", icon: null }
  }

  const rankStyle = getRankStyle(entry.rank)

  return (
    <motion.div
      whileHover={{ scale: 1.01 }}
      onClick={onClick}
      className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors ${
        isUserCrew
          ? "bg-cyan-500/10 border border-cyan-500/30"
          : "bg-zinc-800/50 hover:bg-zinc-800"
      }`}
    >
      {/* Rank */}
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center ${rankStyle.bg} ${rankStyle.text}`}
      >
        {rankStyle.icon ? (
          <rankStyle.icon className="w-4 h-4" />
        ) : (
          <span className="font-bold text-sm">{entry.rank}</span>
        )}
      </div>

      {/* Avatar */}
      <div
        className="w-10 h-10 rounded-lg flex items-center justify-center overflow-hidden"
        style={{ backgroundColor: `${entry.color}30` }}
      >
        {entry.avatar_url ? (
          <img
            src={entry.avatar_url}
            alt={entry.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <Users className="w-5 h-5" style={{ color: entry.color }} />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className={`font-medium truncate ${isUserCrew ? "text-cyan-400" : "text-white"}`}>
            {entry.name}
          </p>
          {isUserCrew && <span className="text-xs text-cyan-400">(ton crew)</span>}
        </div>
        <div className="flex items-center gap-2 text-xs text-zinc-400">
          <span>{entry.member_count} membres</span>
          <span>•</span>
          <span style={{ color: tier.color }}>{tier.tier}</span>
        </div>
      </div>

      {/* XP */}
      <div className="text-right">
        <p className="font-bold text-yellow-400 flex items-center gap-1">
          <Zap className="w-4 h-4" />
          {formatCrewXp(entry.total_xp)}
        </p>
        <p className="text-xs text-zinc-500">XP</p>
      </div>
    </motion.div>
  )
}

/* ==========================================================================
   COMPACT CREW CARD
   ========================================================================== */

interface CompactCrewCardProps {
  crew: Crew
  role?: string
  onClick?: () => void
}

export function CompactCrewCard({ crew, role, onClick }: CompactCrewCardProps) {
  const tier = getCrewTier(crew.total_xp)

  return (
    <div
      onClick={onClick}
      className="flex items-center gap-3 p-3 rounded-xl bg-zinc-800/50 cursor-pointer hover:bg-zinc-800 transition-colors"
    >
      {/* Avatar */}
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center overflow-hidden"
        style={{ backgroundColor: `${crew.color}30` }}
      >
        {crew.avatar_url ? (
          <img
            src={crew.avatar_url}
            alt={crew.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <Users className="w-6 h-6" style={{ color: crew.color }} />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="font-bold text-white truncate">{crew.name}</p>
        <div className="flex items-center gap-2 text-xs">
          {role && (
            <span
              className={
                role === "owner"
                  ? "text-yellow-400"
                  : role === "admin"
                  ? "text-purple-400"
                  : "text-zinc-400"
              }
            >
              {role === "owner" ? "Propriétaire" : role === "admin" ? "Admin" : "Membre"}
            </span>
          )}
          <span className="text-zinc-500">•</span>
          <span style={{ color: tier.color }}>{tier.tier}</span>
        </div>
      </div>

      <ChevronRight className="w-5 h-5 text-zinc-500" />
    </div>
  )
}

/* ==========================================================================
   NO CREW CARD
   ========================================================================== */

interface NoCrewCardProps {
  onCreateCrew: () => void
  onBrowseCrews: () => void
}

export function NoCrewCard({ onCreateCrew, onBrowseCrews }: NoCrewCardProps) {
  return (
    <div className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800 border-dashed text-center">
      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-zinc-800 flex items-center justify-center">
        <Users className="w-8 h-8 text-zinc-600" />
      </div>

      <h3 className="font-bold text-white mb-2">Tu n'as pas de crew</h3>
      <p className="text-sm text-zinc-400 mb-6">
        Rejoins un crew existant ou crée le tien pour gagner des XP en équipe !
      </p>

      <div className="flex flex-col gap-2">
        <button
          onClick={onCreateCrew}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-500 text-white font-semibold hover:opacity-90 transition-opacity"
        >
          Créer mon crew
        </button>
        <button
          onClick={onBrowseCrews}
          className="w-full py-3 rounded-xl bg-zinc-800 text-white font-semibold hover:bg-zinc-700 transition-colors"
        >
          Parcourir les crews
        </button>
      </div>
    </div>
  )
}
