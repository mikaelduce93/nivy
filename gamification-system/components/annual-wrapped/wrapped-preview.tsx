/**
 * TEENS PARTY MOROCCO - Wrapped Preview Component
 * ================================================
 *
 * Prévisualisations et widgets du récapitulatif annuel.
 */

"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import {
  Sparkles,
  Play,
  Share2,
  Eye,
  Lock,
  Calendar,
  Trophy,
  Zap,
  ChevronRight,
  Download,
  Copy,
  Check,
  Loader2,
} from "lucide-react"
import {
  type UserWrapped,
  formatWrappedValue,
  getRarityColor,
  getRarityBg,
  WRAPPED_ACHIEVEMENT_CONFIG,
  type WrappedAchievement,
} from "../../features/annual-wrapped"

/* ==========================================================================
   WRAPPED BANNER
   ========================================================================== */

interface WrappedBannerProps {
  year: number
  isAvailable: boolean
  isReady: boolean
  onGenerate?: () => void
  onView?: () => void
  isGenerating?: boolean
}

export function WrappedBanner({
  year,
  isAvailable,
  isReady,
  onGenerate,
  onView,
  isGenerating = false,
}: WrappedBannerProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400 p-6"
    >
      {/* Background decoration */}
      <div className="absolute top-0 right-0 text-[150px] opacity-10 -rotate-12">
        ✨
      </div>

      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-5 h-5 text-white" />
          <span className="text-sm font-medium text-white/80">
            Teens Party Wrapped
          </span>
        </div>

        <h2 className="text-2xl font-bold text-white mb-2">Ton {year} en revue</h2>

        <p className="text-white/80 mb-6">
          {isReady
            ? "Ton récapitulatif est prêt !"
            : isAvailable
            ? "Découvre tes moments forts de l'année"
            : "Pas assez de données pour cette année"}
        </p>

        {isReady ? (
          <button
            onClick={onView}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-white text-purple-600 font-bold hover:bg-white/90 transition-colors"
          >
            <Play className="w-5 h-5" />
            Voir mon Wrapped
          </button>
        ) : isAvailable ? (
          <button
            onClick={onGenerate}
            disabled={isGenerating}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-white text-purple-600 font-bold hover:bg-white/90 transition-colors disabled:opacity-50"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Génération...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                Générer mon Wrapped
              </>
            )}
          </button>
        ) : (
          <div className="flex items-center gap-2 text-white/60">
            <Lock className="w-4 h-4" />
            <span className="text-sm">Participe à plus d'événements pour débloquer</span>
          </div>
        )}
      </div>
    </motion.div>
  )
}

/* ==========================================================================
   WRAPPED CARD PREVIEW
   ========================================================================== */

interface WrappedCardPreviewProps {
  wrapped: UserWrapped
  onClick?: () => void
}

export function WrappedCardPreview({ wrapped, onClick }: WrappedCardPreviewProps) {
  const { data, achievements } = wrapped

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400 p-5 cursor-pointer"
    >
      {/* Background emoji */}
      <div className="absolute -top-4 -right-4 text-[100px] opacity-10">✨</div>

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-white" />
            <span className="text-xs font-medium text-white/80">
              Wrapped {wrapped.year}
            </span>
          </div>
          <ChevronRight className="w-5 h-5 text-white/60" />
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-white">
              {formatWrappedValue(data.summary.total_xp, "xp")}
            </p>
            <p className="text-xs text-white/60">XP</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-white">
              {data.summary.total_events}
            </p>
            <p className="text-xs text-white/60">Events</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-white">
              {achievements.length}
            </p>
            <p className="text-xs text-white/60">Badges</p>
          </div>
        </div>

        {/* Achievements preview */}
        {achievements.length > 0 && (
          <div className="flex items-center gap-2">
            {achievements.slice(0, 3).map((a) => (
              <span key={a.slug} className="text-2xl">
                {a.emoji}
              </span>
            ))}
            {achievements.length > 3 && (
              <span className="text-sm text-white/60">
                +{achievements.length - 3}
              </span>
            )}
          </div>
        )}
      </div>
    </motion.div>
  )
}

/* ==========================================================================
   WRAPPED SHARE CARD
   ========================================================================== */

interface WrappedShareCardProps {
  wrapped: UserWrapped
  shareUrl?: string
  onCopyLink?: () => void
  onShare?: (platform: string) => void
}

export function WrappedShareCard({
  wrapped,
  shareUrl,
  onCopyLink,
  onShare,
}: WrappedShareCardProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    if (shareUrl) {
      navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      onCopyLink?.()
    }
  }

  return (
    <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800">
      <h3 className="font-bold text-white mb-4 flex items-center gap-2">
        <Share2 className="w-5 h-5 text-cyan-400" />
        Partager ton Wrapped
      </h3>

      {/* Preview mini */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400 p-4 mb-4">
        <div className="text-center text-white">
          <p className="text-sm opacity-80">Mon {wrapped.year}</p>
          <p className="text-3xl font-bold mb-1">
            {wrapped.data.summary.total_xp.toLocaleString()} XP
          </p>
          <p className="text-sm opacity-80">
            {wrapped.data.summary.total_events} événements
          </p>
        </div>
      </div>

      {/* Share options */}
      <div className="space-y-2">
        {shareUrl && (
          <button
            onClick={handleCopy}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-zinc-800 text-white hover:bg-zinc-700 transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-green-400" />
                Copié !
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                Copier le lien
              </>
            )}
          </button>
        )}

        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => onShare?.("instagram")}
            className="flex flex-col items-center gap-1 py-3 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 text-white"
          >
            <span className="text-lg">📸</span>
            <span className="text-xs">Instagram</span>
          </button>
          <button
            onClick={() => onShare?.("twitter")}
            className="flex flex-col items-center gap-1 py-3 rounded-xl bg-black text-white"
          >
            <span className="text-lg">𝕏</span>
            <span className="text-xs">Twitter</span>
          </button>
          <button
            onClick={() => onShare?.("whatsapp")}
            className="flex flex-col items-center gap-1 py-3 rounded-xl bg-green-500 text-white"
          >
            <span className="text-lg">💬</span>
            <span className="text-xs">WhatsApp</span>
          </button>
        </div>
      </div>
    </div>
  )
}

/* ==========================================================================
   WRAPPED SUMMARY MINI
   ========================================================================== */

interface WrappedSummaryMiniProps {
  wrapped: UserWrapped
}

export function WrappedSummaryMini({ wrapped }: WrappedSummaryMiniProps) {
  const { data } = wrapped

  return (
    <div className="p-4 rounded-xl bg-zinc-800/50 border border-zinc-700">
      <div className="flex items-center gap-2 mb-3">
        <Calendar className="w-4 h-4 text-purple-400" />
        <span className="text-sm text-zinc-400">Récap {wrapped.year}</span>
      </div>

      <div className="grid grid-cols-4 gap-2 text-center">
        <div>
          <p className="text-lg font-bold text-yellow-400">
            {(data.summary.total_xp / 1000).toFixed(1)}K
          </p>
          <p className="text-xs text-zinc-500">XP</p>
        </div>
        <div>
          <p className="text-lg font-bold text-purple-400">
            {data.summary.total_events}
          </p>
          <p className="text-xs text-zinc-500">Events</p>
        </div>
        <div>
          <p className="text-lg font-bold text-cyan-400">
            {data.summary.total_challenges}
          </p>
          <p className="text-xs text-zinc-500">Défis</p>
        </div>
        <div>
          <p className="text-lg font-bold text-orange-400">
            {data.summary.longest_streak}
          </p>
          <p className="text-xs text-zinc-500">Streak</p>
        </div>
      </div>
    </div>
  )
}

/* ==========================================================================
   WRAPPED ACHIEVEMENTS LIST
   ========================================================================== */

interface WrappedAchievementsListProps {
  achievements: UserWrapped["achievements"]
}

export function WrappedAchievementsList({
  achievements,
}: WrappedAchievementsListProps) {
  if (achievements.length === 0) {
    return (
      <div className="p-4 rounded-xl bg-zinc-800/50 border border-zinc-700 text-center">
        <Trophy className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
        <p className="text-sm text-zinc-400">Pas encore de badges cette année</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {achievements.map((achievement) => {
        const config =
          WRAPPED_ACHIEVEMENT_CONFIG[achievement.slug as WrappedAchievement]

        return (
          <div
            key={achievement.slug}
            className={`p-3 rounded-xl border ${getRarityBg(achievement.rarity)}`}
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">{achievement.emoji}</span>
              <div className="flex-1">
                <p className="font-medium text-white">{achievement.title}</p>
                <p className="text-xs text-zinc-400">{achievement.description}</p>
              </div>
              <span
                className={`text-xs px-2 py-0.5 rounded-full ${getRarityColor(
                  achievement.rarity
                )} bg-white/5`}
              >
                {achievement.rarity}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* ==========================================================================
   WRAPPED YEAR SELECTOR
   ========================================================================== */

interface WrappedYearSelectorProps {
  availableYears: number[]
  selectedYear: number
  onSelectYear: (year: number) => void
}

export function WrappedYearSelector({
  availableYears,
  selectedYear,
  onSelectYear,
}: WrappedYearSelectorProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2">
      {availableYears.map((year) => (
        <button
          key={year}
          onClick={() => onSelectYear(year)}
          className={`px-4 py-2 rounded-xl font-medium transition-colors whitespace-nowrap ${
            selectedYear === year
              ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white"
              : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
          }`}
        >
          {year}
        </button>
      ))}
    </div>
  )
}

/* ==========================================================================
   WRAPPED TEASER
   ========================================================================== */

interface WrappedTeaserProps {
  year: number
  daysUntilAvailable?: number
  onClick?: () => void
}

export function WrappedTeaser({
  year,
  daysUntilAvailable,
  onClick,
}: WrappedTeaserProps) {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      onClick={onClick}
      className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-zinc-800 to-zinc-900 p-5 cursor-pointer border border-zinc-700"
    >
      {/* Lock overlay */}
      <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
        <div className="text-center">
          <Lock className="w-8 h-8 text-zinc-400 mx-auto mb-2" />
          {daysUntilAvailable && daysUntilAvailable > 0 && (
            <p className="text-sm text-zinc-400">
              Disponible dans {daysUntilAvailable} jours
            </p>
          )}
        </div>
      </div>

      <div className="opacity-30">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-4 h-4" />
          <span className="text-xs">Wrapped {year}</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold">???</p>
            <p className="text-xs">XP</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold">??</p>
            <p className="text-xs">Events</p>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

/* ==========================================================================
   WRAPPED NOTIFICATION
   ========================================================================== */

interface WrappedNotificationProps {
  year: number
  onView: () => void
  onDismiss: () => void
}

export function WrappedNotification({
  year,
  onView,
  onDismiss,
}: WrappedNotificationProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 50 }}
      className="fixed bottom-4 left-4 right-4 z-50 p-4 rounded-2xl bg-gradient-to-r from-purple-600 via-pink-500 to-orange-400 shadow-lg"
    >
      <div className="flex items-center gap-4">
        <div className="text-4xl">✨</div>
        <div className="flex-1">
          <p className="font-bold text-white">Ton Wrapped {year} est prêt !</p>
          <p className="text-sm text-white/80">
            Découvre tes moments forts de l'année
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onDismiss}
            className="p-2 rounded-lg bg-white/10 text-white hover:bg-white/20"
          >
            Plus tard
          </button>
          <button
            onClick={onView}
            className="px-4 py-2 rounded-lg bg-white text-purple-600 font-bold hover:bg-white/90"
          >
            Voir
          </button>
        </div>
      </div>
    </motion.div>
  )
}
