/**
 * TEENS PARTY MOROCCO - Social Stats Component
 * ============================================
 *
 * Statistiques sociales du dashboard.
 */

"use client"

import { motion } from "framer-motion"
import {
  Users,
  UserPlus,
  Heart,
  MessageCircle,
  Camera,
  Star,
  Trophy,
  Swords,
  UsersRound,
  Share2,
  ThumbsUp,
  Award,
} from "lucide-react"
import {
  type LifetimeStats,
  formatLargeNumber,
} from "../../features/stats-dashboard"

/* ==========================================================================
   SOCIAL STATS OVERVIEW
   ========================================================================== */

interface SocialStatsOverviewProps {
  stats: LifetimeStats
}

export function SocialStatsOverview({ stats }: SocialStatsOverviewProps) {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="p-4 rounded-2xl bg-gradient-to-br from-pink-500/10 to-rose-500/10 border border-pink-500/30">
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-6 h-6 text-pink-400" />
          <h3 className="text-lg font-bold text-white">Social</h3>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-3xl font-bold text-white">{stats.total_friends}</p>
            <p className="text-xs text-zinc-400">Amis</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-pink-400">
              {stats.total_crews_joined}
            </p>
            <p className="text-xs text-zinc-400">Crews</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-purple-400">
              {stats.total_duels_played}
            </p>
            <p className="text-xs text-zinc-400">Duels</p>
          </div>
        </div>
      </div>

      {/* Stats détaillées */}
      <div className="grid grid-cols-2 gap-3">
        <SocialStatCard
          icon={<UserPlus className="w-5 h-5" />}
          label="Demandes envoyées"
          value={stats.total_friend_requests_sent}
          color="text-cyan-400"
          bgColor="bg-cyan-500/10"
        />
        <SocialStatCard
          icon={<Heart className="w-5 h-5" />}
          label="Demandes reçues"
          value={stats.total_friend_requests_received}
          color="text-pink-400"
          bgColor="bg-pink-500/10"
        />
        <SocialStatCard
          icon={<Swords className="w-5 h-5" />}
          label="Duels gagnés"
          value={stats.total_duels_won}
          subValue={`/${stats.total_duels_played}`}
          color="text-orange-400"
          bgColor="bg-orange-500/10"
        />
        <SocialStatCard
          icon={<UsersRound className="w-5 h-5" />}
          label="Crews rejoints"
          value={stats.total_crews_joined}
          color="text-violet-400"
          bgColor="bg-violet-500/10"
        />
      </div>

      {/* Win rate des duels */}
      {stats.total_duels_played > 0 && (
        <DuelWinRateCard
          wins={stats.total_duels_won}
          total={stats.total_duels_played}
        />
      )}
    </div>
  )
}

/* ==========================================================================
   SOCIAL STAT CARD
   ========================================================================== */

interface SocialStatCardProps {
  icon: React.ReactNode
  label: string
  value: number
  subValue?: string
  color: string
  bgColor: string
}

function SocialStatCard({
  icon,
  label,
  value,
  subValue,
  color,
  bgColor,
}: SocialStatCardProps) {
  return (
    <div className={`p-4 rounded-xl ${bgColor} border border-white/5`}>
      <div className="flex items-center gap-2 mb-2">
        <span className={color}>{icon}</span>
        <span className="text-xs text-zinc-400">{label}</span>
      </div>
      <p className="text-2xl font-bold text-white">
        {value}
        {subValue && <span className="text-sm text-zinc-500">{subValue}</span>}
      </p>
    </div>
  )
}

/* ==========================================================================
   DUEL WIN RATE CARD
   ========================================================================== */

interface DuelWinRateCardProps {
  wins: number
  total: number
}

function DuelWinRateCard({ wins, total }: DuelWinRateCardProps) {
  const winRate = Math.round((wins / total) * 100)

  return (
    <div className="p-4 rounded-xl bg-gradient-to-r from-orange-500/10 to-red-500/10 border border-orange-500/30">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Swords className="w-5 h-5 text-orange-400" />
          <span className="text-sm text-zinc-400">Win Rate Duels</span>
        </div>
        <span className="text-xl font-bold text-orange-400">{winRate}%</span>
      </div>

      {/* Progress bar */}
      <div className="h-3 bg-zinc-800 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${winRate}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="h-full bg-gradient-to-r from-orange-500 to-red-500 rounded-full"
        />
      </div>

      <p className="text-xs text-zinc-500 mt-2 text-center">
        {wins} victoires sur {total} duels
      </p>
    </div>
  )
}

/* ==========================================================================
   CONTENT STATS
   ========================================================================== */

interface ContentStatsProps {
  stats: LifetimeStats
}

export function ContentStats({ stats }: ContentStatsProps) {
  return (
    <div className="space-y-4">
      <h3 className="font-bold text-white flex items-center gap-2">
        <Share2 className="w-5 h-5 text-cyan-400" />
        Contenu partagé
      </h3>

      <div className="grid grid-cols-2 gap-3">
        <ContentStatCard
          icon={<Camera className="w-5 h-5" />}
          label="Photos uploadées"
          value={stats.total_photos_uploaded}
          color="text-purple-400"
          bgColor="bg-purple-500/10"
        />
        <ContentStatCard
          icon={<ThumbsUp className="w-5 h-5" />}
          label="Photos likées"
          value={stats.total_photos_liked}
          color="text-pink-400"
          bgColor="bg-pink-500/10"
        />
        <ContentStatCard
          icon={<Star className="w-5 h-5" />}
          label="Avis rédigés"
          value={stats.total_reviews_written}
          color="text-yellow-400"
          bgColor="bg-yellow-500/10"
        />
        <ContentStatCard
          icon={<MessageCircle className="w-5 h-5" />}
          label="Commentaires"
          value={stats.total_comments_posted}
          color="text-cyan-400"
          bgColor="bg-cyan-500/10"
        />
      </div>

      {/* Note moyenne */}
      {stats.average_review_rating && stats.average_review_rating > 0 && (
        <div className="p-4 rounded-xl bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Star className="w-5 h-5 text-yellow-400" />
              <span className="text-sm text-zinc-400">Note moyenne donnée</span>
            </div>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`w-4 h-4 ${
                    star <= stats.average_review_rating!
                      ? "text-yellow-400 fill-yellow-400"
                      : "text-zinc-600"
                  }`}
                />
              ))}
              <span className="ml-2 font-bold text-white">
                {stats.average_review_rating.toFixed(1)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ==========================================================================
   CONTENT STAT CARD
   ========================================================================== */

interface ContentStatCardProps {
  icon: React.ReactNode
  label: string
  value: number
  color: string
  bgColor: string
}

function ContentStatCard({
  icon,
  label,
  value,
  color,
  bgColor,
}: ContentStatCardProps) {
  return (
    <div className={`p-3 rounded-xl ${bgColor} border border-white/5`}>
      <div className="flex items-center gap-2 mb-1">
        <span className={color}>{icon}</span>
      </div>
      <p className="text-xl font-bold text-white">{value}</p>
      <p className="text-xs text-zinc-500">{label}</p>
    </div>
  )
}

/* ==========================================================================
   FRIENDS GROWTH CHART
   ========================================================================== */

interface FriendsGrowthChartProps {
  data: Array<{ month: string; friends: number }>
}

export function FriendsGrowthChart({ data }: FriendsGrowthChartProps) {
  const maxFriends = Math.max(...data.map((d) => d.friends), 1)

  return (
    <div className="p-4 rounded-xl bg-zinc-800/50 border border-zinc-700">
      <div className="flex items-center gap-2 mb-4">
        <Users className="w-5 h-5 text-pink-400" />
        <h4 className="font-medium text-white">Croissance des amis</h4>
      </div>

      <div className="flex items-end gap-2 h-24">
        {data.map((item, idx) => {
          const height = (item.friends / maxFriends) * 100
          return (
            <div key={item.month} className="flex-1 flex flex-col items-center">
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: `${height}%` }}
                transition={{ duration: 0.5, delay: idx * 0.1 }}
                className="w-full bg-gradient-to-t from-pink-500 to-rose-400 rounded-t-lg min-h-[4px]"
              />
              <span className="text-xs text-zinc-500 mt-1">{item.month}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ==========================================================================
   SOCIAL BADGES
   ========================================================================== */

interface SocialBadge {
  id: string
  name: string
  description: string
  icon: string
  earned: boolean
}

interface SocialBadgesProps {
  badges: SocialBadge[]
}

export function SocialBadges({ badges }: SocialBadgesProps) {
  const badgeIcons: Record<string, React.ReactNode> = {
    social_butterfly: <Users className="w-5 h-5" />,
    influencer: <Star className="w-5 h-5" />,
    photographer: <Camera className="w-5 h-5" />,
    reviewer: <Star className="w-5 h-5" />,
    duel_master: <Swords className="w-5 h-5" />,
    crew_leader: <UsersRound className="w-5 h-5" />,
  }

  return (
    <div className="space-y-3">
      <h4 className="font-medium text-zinc-400 flex items-center gap-2">
        <Award className="w-4 h-4" />
        Badges sociaux
      </h4>

      <div className="grid grid-cols-3 gap-2">
        {badges.map((badge) => (
          <div
            key={badge.id}
            className={`p-3 rounded-xl text-center transition-all ${
              badge.earned
                ? "bg-gradient-to-br from-pink-500/20 to-rose-500/20 border border-pink-500/30"
                : "bg-zinc-800/30 border border-zinc-700 opacity-50"
            }`}
          >
            <div
              className={`w-10 h-10 rounded-full mx-auto mb-2 flex items-center justify-center ${
                badge.earned ? "bg-pink-500/20 text-pink-400" : "bg-zinc-700 text-zinc-500"
              }`}
            >
              {badgeIcons[badge.icon] || <Award className="w-5 h-5" />}
            </div>
            <p
              className={`text-xs font-medium ${
                badge.earned ? "text-white" : "text-zinc-500"
              }`}
            >
              {badge.name}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ==========================================================================
   FRIENDSHIP STATS SUMMARY
   ========================================================================== */

interface FriendshipStatsSummaryProps {
  totalFriends: number
  newThisMonth: number
  activeFrequently: number
  mutualEvents: number
}

export function FriendshipStatsSummary({
  totalFriends,
  newThisMonth,
  activeFrequently,
  mutualEvents,
}: FriendshipStatsSummaryProps) {
  return (
    <div className="p-4 rounded-2xl bg-gradient-to-br from-pink-500/10 via-rose-500/10 to-purple-500/10 border border-pink-500/30">
      <div className="flex items-center gap-2 mb-4">
        <Heart className="w-5 h-5 text-pink-400" />
        <h3 className="font-bold text-white">Tes amitiés</h3>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-zinc-400">Total d'amis</span>
          <span className="text-xl font-bold text-white">{totalFriends}</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-zinc-400">Nouveaux ce mois</span>
          <span className="text-green-400 font-medium">+{newThisMonth}</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-zinc-400">Souvent actifs</span>
          <span className="text-cyan-400 font-medium">{activeFrequently}</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-zinc-400">Events ensemble</span>
          <span className="text-purple-400 font-medium">{mutualEvents}</span>
        </div>
      </div>
    </div>
  )
}
