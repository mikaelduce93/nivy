/**
 * TEENS PARTY MOROCCO - VIP Progress Components
 * ==============================================
 *
 * Composants pour l'affichage de la progression VIP.
 */

"use client"

import { motion } from "framer-motion"
import { TrendingUp, Zap, ChevronRight, Sparkles, Lock } from "lucide-react"
import {
  type VipTierSlug,
  type VipProgress,
  type VipStatusResponse,
  VIP_TIER_CONFIG,
  TIER_XP_REQUIREMENTS,
  getTierConfig,
  getNextTier,
  formatXp,
  getProgressMessage,
  calculateProgress,
  getTierGlowStyle,
} from "../../features/vip-system"
import { VipBadge, VipTierIcon } from "./vip-badge"

/* ==========================================================================
   VIP PROGRESS BAR
   ========================================================================== */

interface VipProgressBarProps {
  currentXp: number
  currentTier: VipTierSlug
  showLabels?: boolean
  showXp?: boolean
  size?: "sm" | "md" | "lg"
  animated?: boolean
}

export function VipProgressBar({
  currentXp,
  currentTier,
  showLabels = true,
  showXp = true,
  size = "md",
  animated = true,
}: VipProgressBarProps) {
  const progress = calculateProgress(currentXp, currentTier)
  const config = getTierConfig(currentTier)
  const nextConfig = progress.nextTier ? getTierConfig(progress.nextTier) : null

  const heights = {
    sm: "h-2",
    md: "h-3",
    lg: "h-4",
  }

  return (
    <div className="space-y-2">
      {/* Labels */}
      {showLabels && (
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <VipBadge tier={currentTier} size="xs" />
            <span className={config.color}>{config.name}</span>
          </div>

          {nextConfig && (
            <div className="flex items-center gap-2">
              <span className={nextConfig.color}>{nextConfig.name}</span>
              <VipBadge tier={progress.nextTier!} size="xs" />
            </div>
          )}
        </div>
      )}

      {/* Progress bar */}
      <div
        className={`relative ${heights[size]} rounded-full bg-zinc-800 overflow-hidden`}
      >
        <motion.div
          initial={animated ? { width: 0 } : false}
          animate={{ width: `${progress.percentage}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
          className={`absolute inset-y-0 left-0 rounded-full bg-gradient-to-r ${config.gradient}`}
        />

        {/* Shine effect */}
        {animated && (
          <motion.div
            animate={{ x: ["-100%", "200%"] }}
            transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
            className="absolute inset-y-0 w-1/4 bg-gradient-to-r from-transparent via-white/20 to-transparent"
          />
        )}
      </div>

      {/* XP display */}
      {showXp && (
        <div className="flex items-center justify-between text-xs text-zinc-400">
          <span>{formatXp(currentXp)} XP</span>
          {!progress.isMaxTier && (
            <span>
              {formatXp(progress.xpToNext)} XP pour {nextConfig?.name}
            </span>
          )}
          {progress.isMaxTier && (
            <span className="text-orange-400">Tier Maximum atteint !</span>
          )}
        </div>
      )}
    </div>
  )
}

/* ==========================================================================
   VIP PROGRESS CARD
   ========================================================================== */

interface VipProgressCardProps {
  status: VipStatusResponse
  onViewTiers?: () => void
  onClaimRewards?: () => void
}

export function VipProgressCard({
  status,
  onViewTiers,
  onClaimRewards,
}: VipProgressCardProps) {
  const currentTier = status.current_tier.slug as VipTierSlug
  const config = getTierConfig(currentTier)
  const progress = calculateProgress(
    status.status.lifetime_xp,
    currentTier
  )

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative rounded-2xl overflow-hidden"
      style={getTierGlowStyle(currentTier)}
    >
      {/* Background gradient */}
      <div
        className={`absolute inset-0 bg-gradient-to-br ${config.gradient} opacity-20`}
      />

      <div className="relative p-6 border border-zinc-700/50 rounded-2xl backdrop-blur-sm">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-4">
            <div
              className={`w-16 h-16 rounded-2xl flex items-center justify-center ${config.bgColor} border ${config.borderColor}`}
            >
              <VipTierIcon tier={currentTier} size={32} />
            </div>
            <div>
              <h3
                className={`text-2xl font-bold bg-gradient-to-r ${config.textGradient} bg-clip-text text-transparent`}
              >
                {config.name}
              </h3>
              <p className="text-sm text-zinc-400">
                {formatXp(status.status.lifetime_xp)} XP total
              </p>
            </div>
          </div>

          <span className="text-3xl">{config.emoji}</span>
        </div>

        {/* Progress */}
        <VipProgressBar
          currentXp={status.status.lifetime_xp}
          currentTier={currentTier}
        />

        {/* Message */}
        <p className="mt-4 text-sm text-center text-zinc-300">
          {getProgressMessage(progress)}
        </p>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-zinc-700/50">
          <div className="text-center">
            <p className="text-2xl font-bold text-white">
              {status.status.events_attended}
            </p>
            <p className="text-xs text-zinc-400">Événements</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-white">
              x{status.current_tier.xp_multiplier}
            </p>
            <p className="text-xs text-zinc-400">Multiplicateur XP</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-white">
              {status.status.months_active}
            </p>
            <p className="text-xs text-zinc-400">Mois actif</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={onViewTiers}
            className="flex-1 py-3 rounded-xl bg-zinc-800 text-white font-medium hover:bg-zinc-700 transition-colors flex items-center justify-center gap-2"
          >
            Voir les tiers
            <ChevronRight className="w-4 h-4" />
          </button>

          {status.current_tier.free_monthly_coins > 0 &&
            !status.status.monthly_coins_claimed && (
              <button
                onClick={onClaimRewards}
                className={`flex-1 py-3 rounded-xl font-medium transition-colors flex items-center justify-center gap-2 bg-gradient-to-r ${config.gradient} text-white hover:opacity-90`}
              >
                <Sparkles className="w-4 h-4" />
                Réclamer {status.current_tier.free_monthly_coins} coins
              </button>
            )}
        </div>
      </div>
    </motion.div>
  )
}

/* ==========================================================================
   VIP TIERS ROADMAP
   ========================================================================== */

interface VipTiersRoadmapProps {
  currentTier: VipTierSlug
  currentXp: number
  onTierClick?: (tier: VipTierSlug) => void
}

export function VipTiersRoadmap({
  currentTier,
  currentXp,
  onTierClick,
}: VipTiersRoadmapProps) {
  const tiers: VipTierSlug[] = [
    "standard",
    "bronze",
    "silver",
    "gold",
    "platinum",
    "diamond",
    "legendary",
  ]

  const currentLevel = getTierConfig(currentTier).level

  return (
    <div className="space-y-3">
      {tiers.map((tier, index) => {
        const config = getTierConfig(tier)
        const xpRequired = TIER_XP_REQUIREMENTS[tier]
        const isAchieved = config.level <= currentLevel
        const isCurrent = tier === currentTier
        const isNext = config.level === currentLevel + 1

        // Progress vers ce tier si c'est le prochain
        let tierProgress = 0
        if (isNext && index > 0) {
          const prevXp = TIER_XP_REQUIREMENTS[tiers[index - 1]]
          const thisXp = xpRequired
          tierProgress = Math.min(
            100,
            ((currentXp - prevXp) / (thisXp - prevXp)) * 100
          )
        }

        return (
          <motion.div
            key={tier}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            onClick={() => onTierClick?.(tier)}
            className={`relative flex items-center gap-4 p-4 rounded-xl cursor-pointer transition-all ${
              isCurrent
                ? `${config.bgColor} border-2 ${config.borderColor}`
                : isAchieved
                ? "bg-zinc-800/50 border border-zinc-700/50"
                : "bg-zinc-900/50 border border-zinc-800/50 opacity-60"
            }`}
            style={isCurrent ? getTierGlowStyle(tier) : {}}
          >
            {/* Connection line */}
            {index > 0 && (
              <div
                className={`absolute -top-3 left-8 w-0.5 h-3 ${
                  isAchieved ? `bg-gradient-to-b ${config.gradient}` : "bg-zinc-700"
                }`}
              />
            )}

            {/* Badge */}
            <div className="relative">
              <VipBadge
                tier={tier}
                size="md"
                showGlow={isAchieved}
                animated={isCurrent}
              />
              {isAchieved && !isCurrent && (
                <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-green-500 flex items-center justify-center">
                  <Zap className="w-2.5 h-2.5 text-white" />
                </div>
              )}
              {!isAchieved && (
                <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-zinc-700 flex items-center justify-center">
                  <Lock className="w-2.5 h-2.5 text-zinc-500" />
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h4
                  className={`font-bold ${
                    isAchieved ? config.color : "text-zinc-500"
                  }`}
                >
                  {config.name}
                </h4>
                {isCurrent && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] bg-cyan-500/20 text-cyan-400">
                    Actuel
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-400">
                {formatXp(xpRequired)} XP requis
              </p>
            </div>

            {/* Progress for next tier */}
            {isNext && (
              <div className="w-20">
                <div className="h-1.5 rounded-full bg-zinc-700 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${tierProgress}%` }}
                    className={`h-full rounded-full bg-gradient-to-r ${config.gradient}`}
                  />
                </div>
                <p className="text-[10px] text-zinc-400 mt-1 text-right">
                  {Math.round(tierProgress)}%
                </p>
              </div>
            )}

            {/* Multiplier preview */}
            <div className="text-right">
              <p className={`text-sm font-bold ${config.color}`}>
                x{VIP_TIER_CONFIG[tier].level >= 1 ? (1 + (VIP_TIER_CONFIG[tier].level * 0.1)).toFixed(1) : "1.0"}
              </p>
              <p className="text-[10px] text-zinc-500">XP Bonus</p>
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}

/* ==========================================================================
   MINI VIP PROGRESS
   ========================================================================== */

interface MiniVipProgressProps {
  tier: VipTierSlug
  xp: number
  onClick?: () => void
}

export function MiniVipProgress({ tier, xp, onClick }: MiniVipProgressProps) {
  const progress = calculateProgress(xp, tier)
  const config = getTierConfig(tier)

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      onClick={onClick}
      className={`flex items-center gap-3 px-3 py-2 rounded-xl ${config.bgColor} border ${config.borderColor}`}
    >
      <VipBadge tier={tier} size="sm" showGlow={false} />

      <div className="flex-1">
        <div className="h-1.5 w-16 rounded-full bg-zinc-700 overflow-hidden">
          <div
            className={`h-full rounded-full bg-gradient-to-r ${config.gradient}`}
            style={{ width: `${progress.percentage}%` }}
          />
        </div>
      </div>

      {!progress.isMaxTier && (
        <span className="text-xs text-zinc-400">{formatXp(progress.xpToNext)}</span>
      )}
    </motion.button>
  )
}

/* ==========================================================================
   XP GAIN ANIMATION
   ========================================================================== */

interface XpGainAnimationProps {
  amount: number
  multiplier: number
  visible: boolean
  onComplete?: () => void
}

export function XpGainAnimation({
  amount,
  multiplier,
  visible,
  onComplete,
}: XpGainAnimationProps) {
  if (!visible) return null

  const bonus = Math.round(amount * (multiplier - 1))
  const total = amount + bonus

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.8 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20 }}
      onAnimationComplete={onComplete}
      className="fixed top-1/3 left-1/2 -translate-x-1/2 z-50"
    >
      <div className="px-6 py-4 rounded-2xl bg-zinc-900/95 border border-cyan-500/30 backdrop-blur-xl text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <TrendingUp className="w-5 h-5 text-cyan-400" />
          <span className="text-sm text-zinc-400">XP gagné</span>
        </div>

        <div className="text-3xl font-bold text-cyan-400">+{total} XP</div>

        {bonus > 0 && (
          <div className="flex items-center justify-center gap-1 mt-2 text-sm">
            <span className="text-zinc-500">{amount}</span>
            <span className="text-green-400">+{bonus} bonus</span>
            <span className="text-zinc-500">(x{multiplier})</span>
          </div>
        )}
      </div>
    </motion.div>
  )
}
