/**
 * TEENS PARTY MOROCCO - VIP Badge Components
 * ==========================================
 *
 * Composants pour les badges et indicateurs VIP.
 */

"use client"

import { motion } from "framer-motion"
import {
  User,
  Award,
  Medal,
  Trophy,
  Crown,
  Gem,
  Flame,
  Sparkles,
} from "lucide-react"
import {
  type VipTierSlug,
  VIP_TIER_CONFIG,
  getTierConfig,
  getTierGlowStyle,
} from "../../features/vip-system"

/* ==========================================================================
   VIP BADGE
   ========================================================================== */

interface VipBadgeProps {
  tier: VipTierSlug
  size?: "xs" | "sm" | "md" | "lg" | "xl"
  showName?: boolean
  showGlow?: boolean
  animated?: boolean
  onClick?: () => void
}

export function VipBadge({
  tier,
  size = "md",
  showName = false,
  showGlow = true,
  animated = true,
  onClick,
}: VipBadgeProps) {
  const config = getTierConfig(tier)

  const sizeClasses = {
    xs: "w-5 h-5",
    sm: "w-6 h-6",
    md: "w-8 h-8",
    lg: "w-10 h-10",
    xl: "w-14 h-14",
  }

  const iconSizes = {
    xs: 10,
    sm: 12,
    md: 16,
    lg: 20,
    xl: 28,
  }

  const textSizes = {
    xs: "text-[10px]",
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base",
    xl: "text-lg",
  }

  // Icon mapping
  const iconMap: Record<string, React.ElementType> = {
    User: User,
    Award: Award,
    Medal: Medal,
    Trophy: Trophy,
    Crown: Crown,
    Gem: Gem,
    Flame: Flame,
  }

  const IconComponent = iconMap[config.icon] || User

  return (
    <motion.button
      whileHover={animated ? { scale: 1.1 } : {}}
      whileTap={animated ? { scale: 0.95 } : {}}
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 ${onClick ? "cursor-pointer" : "cursor-default"}`}
    >
      <div
        className={`relative ${sizeClasses[size]} rounded-full flex items-center justify-center ${config.bgColor} border ${config.borderColor}`}
        style={showGlow && tier !== "standard" ? getTierGlowStyle(tier) : {}}
      >
        {/* Background gradient */}
        <div
          className={`absolute inset-0 rounded-full bg-gradient-to-br ${config.gradient} opacity-50`}
        />

        {/* Icon */}
        <IconComponent
          size={iconSizes[size]}
          className={`relative z-10 ${config.color}`}
        />

        {/* Sparkle effect for legendary */}
        {tier === "legendary" && animated && (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
            className="absolute -inset-1"
          >
            <Sparkles className="absolute top-0 left-1/2 w-2 h-2 text-orange-400" />
            <Sparkles className="absolute bottom-0 right-0 w-1.5 h-1.5 text-red-400" />
          </motion.div>
        )}
      </div>

      {showName && (
        <span className={`font-medium ${config.color} ${textSizes[size]}`}>
          {config.name}
        </span>
      )}
    </motion.button>
  )
}

/* ==========================================================================
   VIP TIER ICON
   ========================================================================== */

interface VipTierIconProps {
  tier: VipTierSlug
  size?: number
  className?: string
}

export function VipTierIcon({ tier, size = 20, className = "" }: VipTierIconProps) {
  const config = getTierConfig(tier)

  const iconMap: Record<string, React.ElementType> = {
    User: User,
    Award: Award,
    Medal: Medal,
    Trophy: Trophy,
    Crown: Crown,
    Gem: Gem,
    Flame: Flame,
  }

  const IconComponent = iconMap[config.icon] || User

  return (
    <IconComponent size={size} className={`${config.color} ${className}`} />
  )
}

/* ==========================================================================
   VIP EMOJI BADGE
   ========================================================================== */

interface VipEmojiBadgeProps {
  tier: VipTierSlug
  size?: "sm" | "md" | "lg"
}

export function VipEmojiBadge({ tier, size = "md" }: VipEmojiBadgeProps) {
  const config = getTierConfig(tier)

  const sizeClasses = {
    sm: "text-sm",
    md: "text-lg",
    lg: "text-2xl",
  }

  return <span className={sizeClasses[size]}>{config.emoji}</span>
}

/* ==========================================================================
   VIP NAME TAG
   ========================================================================== */

interface VipNameTagProps {
  tier: VipTierSlug
  username: string
  showBadge?: boolean
  showTierName?: boolean
  size?: "sm" | "md" | "lg"
}

export function VipNameTag({
  tier,
  username,
  showBadge = true,
  showTierName = false,
  size = "md",
}: VipNameTagProps) {
  const config = getTierConfig(tier)

  const textSizes = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-lg",
  }

  return (
    <div className="flex items-center gap-2">
      {showBadge && <VipBadge tier={tier} size={size === "sm" ? "xs" : "sm"} />}

      <div className="flex flex-col">
        <span
          className={`font-semibold ${textSizes[size]} bg-gradient-to-r ${config.textGradient} bg-clip-text text-transparent`}
        >
          {username}
        </span>
        {showTierName && (
          <span className={`text-xs ${config.color}`}>{config.name}</span>
        )}
      </div>
    </div>
  )
}

/* ==========================================================================
   VIP CHIP
   ========================================================================== */

interface VipChipProps {
  tier: VipTierSlug
  size?: "sm" | "md"
}

export function VipChip({ tier, size = "md" }: VipChipProps) {
  const config = getTierConfig(tier)

  if (tier === "standard") return null

  const sizeClasses = {
    sm: "px-1.5 py-0.5 text-[10px]",
    md: "px-2 py-1 text-xs",
  }

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-bold ${sizeClasses[size]} ${config.bgColor} ${config.color} border ${config.borderColor}`}
    >
      <span>{config.emoji}</span>
      <span>{config.name}</span>
    </span>
  )
}

/* ==========================================================================
   VIP CROWN INDICATOR
   ========================================================================== */

interface VipCrownIndicatorProps {
  tier: VipTierSlug
  position?: "top-left" | "top-right" | "bottom-left" | "bottom-right"
}

export function VipCrownIndicator({
  tier,
  position = "top-right",
}: VipCrownIndicatorProps) {
  if (tier === "standard") return null

  const config = getTierConfig(tier)

  const positionClasses = {
    "top-left": "-top-2 -left-2",
    "top-right": "-top-2 -right-2",
    "bottom-left": "-bottom-2 -left-2",
    "bottom-right": "-bottom-2 -right-2",
  }

  return (
    <motion.div
      initial={{ scale: 0, rotate: -30 }}
      animate={{ scale: 1, rotate: 0 }}
      className={`absolute ${positionClasses[position]} z-10`}
    >
      <div
        className={`w-6 h-6 rounded-full ${config.bgColor} border ${config.borderColor} flex items-center justify-center`}
        style={getTierGlowStyle(tier)}
      >
        <span className="text-xs">{config.emoji}</span>
      </div>
    </motion.div>
  )
}

/* ==========================================================================
   VIP LEADERBOARD BADGE
   ========================================================================== */

interface VipLeaderboardBadgeProps {
  tier: VipTierSlug
  rank: number
  highlighted?: boolean
}

export function VipLeaderboardBadge({
  tier,
  rank,
  highlighted = false,
}: VipLeaderboardBadgeProps) {
  const config = getTierConfig(tier)

  // Médailles pour le top 3
  const rankMedals: Record<number, string> = {
    1: "🥇",
    2: "🥈",
    3: "🥉",
  }

  return (
    <div
      className={`flex items-center gap-3 px-3 py-2 rounded-xl ${
        highlighted
          ? `${config.bgColor} border ${config.borderColor}`
          : "bg-zinc-800/50"
      }`}
      style={highlighted ? getTierGlowStyle(tier) : {}}
    >
      {/* Rank */}
      <div className="w-8 text-center">
        {rankMedals[rank] ? (
          <span className="text-lg">{rankMedals[rank]}</span>
        ) : (
          <span className="text-sm text-zinc-400">#{rank}</span>
        )}
      </div>

      {/* VIP Badge */}
      <VipBadge tier={tier} size="sm" />

      {/* Tier Name */}
      <span className={`text-sm font-medium ${config.color}`}>
        {config.name}
      </span>
    </div>
  )
}

/* ==========================================================================
   VIP COMPARISON INDICATOR
   ========================================================================== */

interface VipComparisonIndicatorProps {
  tier1: VipTierSlug
  tier2: VipTierSlug
}

export function VipComparisonIndicator({
  tier1,
  tier2,
}: VipComparisonIndicatorProps) {
  const config1 = getTierConfig(tier1)
  const config2 = getTierConfig(tier2)

  const level1 = config1.level
  const level2 = config2.level
  const diff = level1 - level2

  return (
    <div className="flex items-center gap-2">
      <VipBadge tier={tier1} size="sm" />
      <span
        className={`text-sm font-medium ${
          diff > 0
            ? "text-green-400"
            : diff < 0
            ? "text-red-400"
            : "text-zinc-400"
        }`}
      >
        {diff > 0 ? `+${diff}` : diff === 0 ? "=" : diff}
      </span>
      <VipBadge tier={tier2} size="sm" />
    </div>
  )
}

/* ==========================================================================
   ALL TIERS DISPLAY
   ========================================================================== */

interface AllTiersDisplayProps {
  currentTier: VipTierSlug
  onTierClick?: (tier: VipTierSlug) => void
}

export function AllTiersDisplay({
  currentTier,
  onTierClick,
}: AllTiersDisplayProps) {
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
    <div className="flex items-center gap-2">
      {tiers.map((tier) => {
        const config = getTierConfig(tier)
        const isAchieved = config.level <= currentLevel
        const isCurrent = tier === currentTier

        return (
          <motion.button
            key={tier}
            whileHover={{ scale: 1.1 }}
            onClick={() => onTierClick?.(tier)}
            className={`relative p-1 rounded-lg transition-opacity ${
              isAchieved ? "opacity-100" : "opacity-30"
            } ${isCurrent ? `ring-2 ring-offset-2 ring-offset-zinc-900 ${config.borderColor.replace("border-", "ring-")}` : ""}`}
          >
            <VipBadge
              tier={tier}
              size="sm"
              showGlow={isAchieved}
              animated={false}
            />
          </motion.button>
        )
      })}
    </div>
  )
}
