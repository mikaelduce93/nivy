/**
 * TEENS PARTY MOROCCO - Sharing Stats Components
 * ===============================================
 *
 * Composants pour les statistiques de partage.
 */

"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import {
  Share2,
  TrendingUp,
  MousePointer,
  UserPlus,
  Flame,
  Trophy,
  Sparkles,
  Coins,
  Target,
  Calendar,
  ChevronRight,
  Instagram,
  Facebook,
  Twitter,
  MessageCircle,
  Link,
  Music2,
  Ghost,
} from "lucide-react"
import {
  type UserSharingStats,
  type PlatformSlug,
  type SharingAchievement,
  PLATFORM_CONFIG,
} from "../../features/social-sharing"

/* ==========================================================================
   SHARING STATS CARD
   ========================================================================== */

interface SharingStatsCardProps {
  stats: UserSharingStats
}

export function SharingStatsCard({ stats }: SharingStatsCardProps) {
  const conversionRate =
    stats.total_clicks > 0
      ? Math.round((stats.total_conversions / stats.total_clicks) * 100)
      : 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 rounded-2xl bg-zinc-800/50 border border-zinc-700/50"
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-xl bg-cyan-500/20 flex items-center justify-center">
          <Share2 className="w-6 h-6 text-cyan-400" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-white">Statistiques de partage</h3>
          <p className="text-sm text-zinc-400">Ton impact social</p>
        </div>
      </div>

      {/* Main stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatBox
          icon={Share2}
          value={stats.total_shares}
          label="Partages"
          color="text-cyan-400"
          bgColor="bg-cyan-500/20"
        />
        <StatBox
          icon={MousePointer}
          value={stats.total_clicks}
          label="Clics"
          color="text-purple-400"
          bgColor="bg-purple-500/20"
        />
        <StatBox
          icon={UserPlus}
          value={stats.total_conversions}
          label="Conversions"
          color="text-green-400"
          bgColor="bg-green-500/20"
        />
        <StatBox
          icon={Target}
          value={`${conversionRate}%`}
          label="Taux conv."
          color="text-orange-400"
          bgColor="bg-orange-500/20"
        />
      </div>

      {/* Streak */}
      <div className="flex items-center justify-between p-4 rounded-xl bg-zinc-900/50 mb-6">
        <div className="flex items-center gap-3">
          <Flame className="w-6 h-6 text-orange-400" />
          <div>
            <p className="font-medium text-white">
              Série actuelle: {stats.current_share_streak} jours
            </p>
            <p className="text-sm text-zinc-500">
              Record: {stats.longest_share_streak} jours
            </p>
          </div>
        </div>
        {stats.current_share_streak >= 3 && (
          <span className="px-2 py-1 rounded-full text-xs bg-orange-500/20 text-orange-400">
            En feu !
          </span>
        )}
      </div>

      {/* Rewards earned */}
      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 rounded-xl bg-zinc-900/50">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-yellow-400" />
            <span className="text-sm text-zinc-400">XP gagné</span>
          </div>
          <p className="text-2xl font-bold text-white">
            {stats.total_xp_earned.toLocaleString()}
          </p>
        </div>
        <div className="p-4 rounded-xl bg-zinc-900/50">
          <div className="flex items-center gap-2 mb-2">
            <Coins className="w-4 h-4 text-orange-400" />
            <span className="text-sm text-zinc-400">Coins gagnés</span>
          </div>
          <p className="text-2xl font-bold text-white">
            {stats.total_coins_earned.toLocaleString()}
          </p>
        </div>
      </div>
    </motion.div>
  )
}

/* ==========================================================================
   PLATFORM BREAKDOWN
   ========================================================================== */

interface PlatformBreakdownProps {
  sharesByPlatform: Record<string, number>
}

export function PlatformBreakdown({ sharesByPlatform }: PlatformBreakdownProps) {
  const platforms = Object.entries(sharesByPlatform)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)

  const total = Object.values(sharesByPlatform).reduce((sum, n) => sum + n, 0)

  if (total === 0) {
    return (
      <div className="p-4 rounded-xl bg-zinc-800/50 border border-zinc-700/50 text-center">
        <Share2 className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
        <p className="text-sm text-zinc-400">Pas encore de partages</p>
      </div>
    )
  }

  return (
    <div className="p-4 rounded-xl bg-zinc-800/50 border border-zinc-700/50">
      <h4 className="font-medium text-white mb-4">Partages par plateforme</h4>

      <div className="space-y-3">
        {platforms.map(([platform, count]) => {
          const config = PLATFORM_CONFIG[platform as PlatformSlug]
          const percentage = Math.round((count / total) * 100)
          const Icon = getPlatformIcon(platform as PlatformSlug)

          return (
            <div key={platform}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-6 h-6 rounded-md flex items-center justify-center ${config?.bgColor || "bg-zinc-700"}`}
                  >
                    <Icon size={14} className={config?.color || "text-white"} />
                  </div>
                  <span className="text-sm text-zinc-300">
                    {config?.name || platform}
                  </span>
                </div>
                <span className="text-sm text-zinc-400">
                  {count} ({percentage}%)
                </span>
              </div>
              <div className="h-2 rounded-full bg-zinc-700 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${percentage}%` }}
                  transition={{ duration: 0.5 }}
                  className={`h-full rounded-full ${config?.bgColor || "bg-cyan-500"}`}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ==========================================================================
   SHARING ACHIEVEMENTS
   ========================================================================== */

interface SharingAchievementsProps {
  achievements: (SharingAchievement & { unlocked: boolean; unlocked_at?: string })[]
  onViewAll?: () => void
}

export function SharingAchievements({
  achievements,
  onViewAll,
}: SharingAchievementsProps) {
  const unlockedCount = achievements.filter((a) => a.unlocked).length

  return (
    <div className="p-4 rounded-xl bg-zinc-800/50 border border-zinc-700/50">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-yellow-400" />
          <h4 className="font-medium text-white">Succès de partage</h4>
        </div>
        <span className="text-sm text-zinc-400">
          {unlockedCount}/{achievements.length}
        </span>
      </div>

      <div className="space-y-3">
        {achievements.slice(0, 4).map((achievement) => (
          <div
            key={achievement.id}
            className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${
              achievement.unlocked
                ? "bg-yellow-500/10 border border-yellow-500/30"
                : "bg-zinc-900/50 opacity-60"
            }`}
          >
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                achievement.unlocked
                  ? "bg-yellow-500/20"
                  : "bg-zinc-800"
              }`}
            >
              <AchievementIcon
                icon={achievement.icon}
                unlocked={achievement.unlocked}
              />
            </div>

            <div className="flex-1">
              <p
                className={`font-medium ${
                  achievement.unlocked ? "text-white" : "text-zinc-500"
                }`}
              >
                {achievement.name}
              </p>
              <p className="text-xs text-zinc-500">{achievement.description}</p>
            </div>

            {achievement.unlocked ? (
              <Sparkles className="w-5 h-5 text-yellow-400" />
            ) : (
              <div className="text-right">
                <p className="text-xs text-zinc-500">
                  +{achievement.xp_reward} XP
                </p>
              </div>
            )}
          </div>
        ))}
      </div>

      {achievements.length > 4 && onViewAll && (
        <button
          onClick={onViewAll}
          className="w-full mt-4 py-2 text-sm text-cyan-400 hover:underline flex items-center justify-center gap-1"
        >
          Voir tous les succès
          <ChevronRight className="w-4 h-4" />
        </button>
      )}
    </div>
  )
}

/* ==========================================================================
   SHARING HISTORY
   ========================================================================== */

interface ShareHistoryItem {
  id: string
  platform: PlatformSlug
  content_type: string
  shared_title: string
  click_count: number
  created_at: string
}

interface SharingHistoryProps {
  shares: ShareHistoryItem[]
  onViewAll?: () => void
}

export function SharingHistory({ shares, onViewAll }: SharingHistoryProps) {
  if (shares.length === 0) {
    return (
      <div className="p-4 rounded-xl bg-zinc-800/50 border border-zinc-700/50 text-center">
        <Calendar className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
        <p className="text-sm text-zinc-400">Aucun partage récent</p>
      </div>
    )
  }

  return (
    <div className="p-4 rounded-xl bg-zinc-800/50 border border-zinc-700/50">
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-medium text-white">Historique récent</h4>
        {onViewAll && (
          <button
            onClick={onViewAll}
            className="text-sm text-cyan-400 hover:underline"
          >
            Voir tout
          </button>
        )}
      </div>

      <div className="space-y-2">
        {shares.slice(0, 5).map((share) => {
          const config = PLATFORM_CONFIG[share.platform]
          const Icon = getPlatformIcon(share.platform)

          return (
            <div
              key={share.id}
              className="flex items-center gap-3 p-3 rounded-xl bg-zinc-900/50"
            >
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center ${config?.bgColor || "bg-zinc-700"}`}
              >
                <Icon size={18} className={config?.color || "text-white"} />
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm text-white truncate">{share.shared_title}</p>
                <p className="text-xs text-zinc-500">
                  {new Date(share.created_at).toLocaleDateString("fr-FR")}
                </p>
              </div>

              <div className="flex items-center gap-1 text-sm text-zinc-400">
                <MousePointer className="w-4 h-4" />
                {share.click_count}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ==========================================================================
   MINI SHARING WIDGET
   ========================================================================== */

interface MiniSharingWidgetProps {
  totalShares: number
  streak: number
  onClick?: () => void
}

export function MiniSharingWidget({
  totalShares,
  streak,
  onClick,
}: MiniSharingWidgetProps) {
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      onClick={onClick}
      className="flex items-center gap-3 p-3 rounded-xl bg-zinc-800/50 border border-zinc-700/50 w-full text-left"
    >
      <div className="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center">
        <Share2 className="w-5 h-5 text-cyan-400" />
      </div>

      <div className="flex-1">
        <p className="text-sm font-medium text-white">{totalShares} partages</p>
        {streak > 0 && (
          <p className="text-xs text-orange-400 flex items-center gap-1">
            <Flame className="w-3 h-3" />
            Série de {streak} jours
          </p>
        )}
      </div>

      <ChevronRight className="w-5 h-5 text-zinc-400" />
    </motion.button>
  )
}

/* ==========================================================================
   HELPERS
   ========================================================================== */

interface StatBoxProps {
  icon: typeof Share2
  value: number | string
  label: string
  color: string
  bgColor: string
}

function StatBox({ icon: Icon, value, label, color, bgColor }: StatBoxProps) {
  return (
    <div className="p-4 rounded-xl bg-zinc-900/50">
      <div className={`w-8 h-8 rounded-lg ${bgColor} flex items-center justify-center mb-2`}>
        <Icon className={`w-4 h-4 ${color}`} />
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="text-xs text-zinc-500">{label}</p>
    </div>
  )
}

function getPlatformIcon(platform: PlatformSlug) {
  const icons: Record<PlatformSlug, typeof Share2> = {
    instagram: Instagram,
    tiktok: Music2,
    snapchat: Ghost,
    whatsapp: MessageCircle,
    facebook: Facebook,
    twitter: Twitter,
    copy_link: Link,
  }
  return icons[platform] || Share2
}

interface AchievementIconProps {
  icon: string | null
  unlocked: boolean
}

function AchievementIcon({ icon, unlocked }: AchievementIconProps) {
  const iconMap: Record<string, typeof Share2> = {
    Share2: Share2,
    Megaphone: TrendingUp,
    Star: Sparkles,
    Sparkles: Sparkles,
  }

  const Icon = iconMap[icon || "Share2"] || Share2

  return (
    <Icon
      className={`w-5 h-5 ${unlocked ? "text-yellow-400" : "text-zinc-600"}`}
    />
  )
}
