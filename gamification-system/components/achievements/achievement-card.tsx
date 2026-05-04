"use client"

import { motion } from "framer-motion"
import { Zap, Lock, Check } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  type UserAchievement,
  RARITY_CONFIG,
} from "../../features/achievements/schema"
import { getAchievementIcon } from "./achievements-list"

/* ==========================================================================
   TYPES
   ========================================================================== */

interface AchievementCardProps {
  achievement: UserAchievement
  onClick?: () => void
  className?: string
  size?: "sm" | "md" | "lg"
  showDescription?: boolean
  showProgress?: boolean
}

/* ==========================================================================
   COMPONENT
   ========================================================================== */

export function AchievementCard({
  achievement,
  onClick,
  className,
  size = "md",
  showDescription = true,
  showProgress = true,
}: AchievementCardProps) {
  const Icon = getAchievementIcon(achievement.icon)
  const isUnlocked = achievement.is_unlocked
  const rarityConfig = RARITY_CONFIG[achievement.rarity]

  const percentage = achievement.percentage_complete

  const sizeConfig = {
    sm: {
      padding: "p-3",
      iconSize: "w-8 h-8",
      iconContainer: "w-10 h-10",
      titleSize: "text-sm",
      descSize: "text-xs",
    },
    md: {
      padding: "p-4",
      iconSize: "w-6 h-6",
      iconContainer: "w-12 h-12",
      titleSize: "text-base",
      descSize: "text-sm",
    },
    lg: {
      padding: "p-6",
      iconSize: "w-8 h-8",
      iconContainer: "w-16 h-16",
      titleSize: "text-lg",
      descSize: "text-base",
    },
  }

  const config = sizeConfig[size]

  return (
    <motion.div
      className={cn(
        "relative rounded-2xl cursor-pointer transition-all overflow-hidden",
        config.padding,
        isUnlocked
          ? cn(
              "bg-gradient-to-br border",
              rarityConfig.bgGradient,
              rarityConfig.border
            )
          : "bg-zinc-900 border border-zinc-800",
        !isUnlocked && "opacity-60 hover:opacity-80",
        className
      )}
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
    >
      {/* Background Glow for unlocked */}
      {isUnlocked && (
        <div
          className={cn(
            "absolute inset-0 rounded-2xl blur-xl -z-10 opacity-20",
            `bg-gradient-to-br ${rarityConfig.gradient}`
          )}
        />
      )}

      <div className="flex items-start gap-4">
        {/* Badge Icon */}
        <motion.div
          className={cn(
            "rounded-full flex items-center justify-center flex-shrink-0 relative",
            config.iconContainer,
            isUnlocked
              ? `bg-gradient-to-br ${rarityConfig.gradient}`
              : "bg-zinc-800"
          )}
          animate={
            isUnlocked
              ? {
                  boxShadow: [
                    "0 0 0px rgba(255,255,255,0)",
                    "0 0 20px rgba(255,255,255,0.3)",
                    "0 0 0px rgba(255,255,255,0)",
                  ],
                }
              : {}
          }
          transition={{ duration: 2, repeat: Infinity }}
        >
          <Icon
            className={cn(
              config.iconSize,
              isUnlocked ? "text-white" : "text-zinc-600"
            )}
          />

          {/* Lock icon for locked achievements */}
          {!isUnlocked && percentage === 0 && (
            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-zinc-900 rounded-full flex items-center justify-center border border-zinc-700">
              <Lock className="w-3 h-3 text-zinc-500" />
            </div>
          )}

          {/* Check icon for unlocked */}
          {isUnlocked && (
            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
              <Check className="w-3 h-3 text-white" />
            </div>
          )}
        </motion.div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Title and Rarity Badge */}
          <div className="flex items-center gap-2 mb-1">
            <h4
              className={cn(
                "font-bold truncate",
                config.titleSize,
                isUnlocked ? "text-white" : "text-zinc-400"
              )}
            >
              {achievement.name}
            </h4>

            {isUnlocked && (
              <span
                className={cn(
                  "text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0",
                  `bg-gradient-to-r ${rarityConfig.gradient} text-white`
                )}
              >
                {rarityConfig.label}
              </span>
            )}
          </div>

          {/* Description */}
          {showDescription && (
            <p
              className={cn(
                "text-zinc-400 mb-2 line-clamp-2",
                config.descSize
              )}
            >
              {achievement.description}
            </p>
          )}

          {/* Progress Bar (for non-unlocked with progress) */}
          {showProgress && !isUnlocked && percentage > 0 && (
            <div className="mb-2">
              <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                <motion.div
                  className={cn(
                    "h-full rounded-full",
                    `bg-gradient-to-r ${rarityConfig.gradient}`
                  )}
                  initial={{ width: 0 }}
                  animate={{ width: `${percentage}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
              <p className="text-xs text-zinc-500 mt-1">
                {achievement.progress} / {achievement.requirement_value}
              </p>
            </div>
          )}

          {/* Points and Date */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap
                className={cn(
                  "w-4 h-4",
                  isUnlocked ? "text-cyan-400" : "text-zinc-600"
                )}
              />
              <span
                className={cn(
                  "font-bold text-sm",
                  isUnlocked ? "text-cyan-400" : "text-zinc-600"
                )}
              >
                {isUnlocked ? "+" : ""}
                {achievement.points} pts
              </span>

              {achievement.xp_reward > 0 && isUnlocked && (
                <span className="text-xs text-green-400 font-medium">
                  +{achievement.xp_reward} XP
                </span>
              )}
            </div>

            {isUnlocked && achievement.unlocked_at && (
              <span className="text-zinc-500 text-xs">
                {new Date(achievement.unlocked_at).toLocaleDateString("fr-FR")}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Shimmer effect for unlocked */}
      {isUnlocked && (
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -z-0"
          animate={{ x: ["-100%", "200%"] }}
          transition={{ duration: 3, repeat: Infinity, repeatDelay: 2 }}
        />
      )}
    </motion.div>
  )
}

/* ==========================================================================
   MINI ACHIEVEMENT BADGE (pour affichage compact)
   ========================================================================== */

interface AchievementBadgeMiniProps {
  achievement: UserAchievement
  onClick?: () => void
  className?: string
}

export function AchievementBadgeMini({
  achievement,
  onClick,
  className,
}: AchievementBadgeMiniProps) {
  const Icon = getAchievementIcon(achievement.icon)
  const isUnlocked = achievement.is_unlocked
  const rarityConfig = RARITY_CONFIG[achievement.rarity]

  return (
    <motion.div
      className={cn(
        "relative w-14 h-14 rounded-full flex items-center justify-center cursor-pointer",
        isUnlocked
          ? `bg-gradient-to-br ${rarityConfig.gradient}`
          : "bg-zinc-800",
        !isUnlocked && "opacity-50",
        className
      )}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      title={achievement.name}
    >
      <Icon
        className={cn(
          "w-7 h-7",
          isUnlocked ? "text-white" : "text-zinc-600"
        )}
      />

      {!isUnlocked && (
        <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-zinc-900 rounded-full flex items-center justify-center border border-zinc-700">
          <Lock className="w-2.5 h-2.5 text-zinc-500" />
        </div>
      )}
    </motion.div>
  )
}

/* ==========================================================================
   ACHIEVEMENT SHOWCASE (pour profil)
   ========================================================================== */

interface AchievementShowcaseProps {
  achievements: UserAchievement[]
  maxDisplay?: number
  onViewAll?: () => void
  className?: string
}

export function AchievementShowcase({
  achievements,
  maxDisplay = 5,
  onViewAll,
  className,
}: AchievementShowcaseProps) {
  const displayedAchievements = achievements
    .filter((a) => a.is_unlocked)
    .sort((a, b) => {
      // Sort by rarity (mythic first) then by unlock date
      const rarityOrder = { mythic: 0, legendary: 1, epic: 2, rare: 3, common: 4 }
      const rarityDiff = rarityOrder[a.rarity] - rarityOrder[b.rarity]
      if (rarityDiff !== 0) return rarityDiff
      return new Date(b.unlocked_at!).getTime() - new Date(a.unlocked_at!).getTime()
    })
    .slice(0, maxDisplay)

  const remaining = achievements.filter((a) => a.is_unlocked).length - maxDisplay

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="flex -space-x-3">
        {displayedAchievements.map((achievement, index) => (
          <motion.div
            key={achievement.id}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.1 }}
            style={{ zIndex: maxDisplay - index }}
          >
            <AchievementBadgeMini achievement={achievement} />
          </motion.div>
        ))}

        {remaining > 0 && (
          <motion.button
            className="w-14 h-14 rounded-full bg-zinc-800 border-2 border-zinc-700 flex items-center justify-center text-zinc-400 font-bold text-sm hover:bg-zinc-700 transition-colors"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={onViewAll}
          >
            +{remaining}
          </motion.button>
        )}
      </div>
    </div>
  )
}
