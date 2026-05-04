"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Sun,
  Calendar,
  CalendarDays,
  Sparkles,
  Ticket,
  Users,
  Target,
  CalendarCheck,
  Flame,
  Star,
  Zap,
  Clock,
  Check,
  Gift,
  ChevronRight,
  Loader2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  type MissionWithProgress,
  type MissionType,
  type MissionCategory,
  MISSION_TYPE_CONFIG,
  MISSION_CATEGORY_CONFIG,
  formatBonusReward,
} from "../../features/missions/schema"

/* ==========================================================================
   TYPES
   ========================================================================== */

interface MissionCardProps {
  mission: MissionWithProgress
  onClaim?: (userMissionId: string) => Promise<void>
  onClick?: () => void
  compact?: boolean
  className?: string
}

/* ==========================================================================
   ICON MAP
   ========================================================================== */

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  sun: Sun,
  calendar: Calendar,
  "calendar-days": CalendarDays,
  sparkles: Sparkles,
  ticket: Ticket,
  users: Users,
  target: Target,
  "calendar-check": CalendarCheck,
  flame: Flame,
  star: Star,
  zap: Zap,
}

function getMissionIcon(iconName: string): React.ComponentType<{ className?: string }> {
  return ICON_MAP[iconName] || Star
}

/* ==========================================================================
   MAIN COMPONENT
   ========================================================================== */

export function MissionCard({
  mission,
  onClaim,
  onClick,
  compact = false,
  className,
}: MissionCardProps) {
  const [isClaiming, setIsClaiming] = useState(false)
  const typeConfig = MISSION_TYPE_CONFIG[mission.type]
  const categoryConfig = MISSION_CATEGORY_CONFIG[mission.category]
  const Icon = getMissionIcon(mission.icon)
  const CategoryIcon = getMissionIcon(categoryConfig.icon)

  const isCompleted = mission.status === "completed"
  const isClaimed = mission.status === "claimed"
  const isExpired = mission.status === "expired"

  const handleClaim = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!onClaim || !mission.user_mission_id || isClaiming) return

    setIsClaiming(true)
    try {
      await onClaim(mission.user_mission_id)
    } finally {
      setIsClaiming(false)
    }
  }

  if (compact) {
    return (
      <CompactMissionCard
        mission={mission}
        onClaim={onClaim}
        onClick={onClick}
      />
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "relative overflow-hidden rounded-2xl transition-all",
        "bg-zinc-900 border",
        isCompleted
          ? "border-green-500/50 bg-green-500/5"
          : isClaimed
          ? "border-zinc-700 opacity-60"
          : isExpired
          ? "border-red-500/30 opacity-50"
          : "border-zinc-800 hover:border-zinc-700",
        onClick && !isClaimed && !isExpired && "cursor-pointer",
        className
      )}
      onClick={onClick}
      whileHover={!isClaimed && !isExpired ? { scale: 1.01 } : {}}
    >
      {/* New Badge */}
      {mission.is_new && !isCompleted && !isClaimed && (
        <div className="absolute top-3 right-3">
          <span className="px-2 py-0.5 text-xs font-bold bg-cyan-500 text-white rounded-full">
            NEW
          </span>
        </div>
      )}

      <div className="p-4">
        {/* Header */}
        <div className="flex items-start gap-3 mb-3">
          {/* Icon */}
          <div
            className={cn(
              "flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center",
              isCompleted || isClaimed
                ? "bg-green-500/20"
                : `bg-gradient-to-br ${typeConfig.gradient}`
            )}
          >
            {isCompleted || isClaimed ? (
              <Check className="w-6 h-6 text-green-400" />
            ) : (
              <Icon className="w-6 h-6 text-white" />
            )}
          </div>

          {/* Title & Type */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span
                className={cn(
                  "text-xs font-medium px-2 py-0.5 rounded-full",
                  typeConfig.bgColor,
                  typeConfig.color
                )}
              >
                {typeConfig.shortLabel}
              </span>
              <span className={cn("text-xs flex items-center gap-1", categoryConfig.color)}>
                <CategoryIcon className="w-3 h-3" />
                {categoryConfig.label}
              </span>
            </div>
            <h3
              className={cn(
                "font-bold truncate",
                isClaimed || isExpired ? "text-zinc-500" : "text-white"
              )}
            >
              {mission.name}
            </h3>
          </div>
        </div>

        {/* Description */}
        <p className="text-sm text-zinc-400 mb-4 line-clamp-2">
          {mission.description}
        </p>

        {/* Progress Bar */}
        {!isClaimed && (
          <div className="mb-4">
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs text-zinc-500">
                {mission.current_progress} / {mission.target_count}
              </span>
              <span className="text-xs font-medium text-zinc-400">
                {mission.progress_percentage}%
              </span>
            </div>
            <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
              <motion.div
                className={cn(
                  "h-full rounded-full",
                  isCompleted
                    ? "bg-green-500"
                    : `bg-gradient-to-r ${typeConfig.gradient}`
                )}
                initial={{ width: 0 }}
                animate={{ width: `${mission.progress_percentage}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
              />
            </div>
          </div>
        )}

        {/* Rewards & Time */}
        <div className="flex items-center justify-between">
          {/* Rewards */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <Zap className="w-4 h-4 text-yellow-400" />
              <span className="font-bold text-yellow-400">
                +{mission.xp_reward} XP
              </span>
            </div>
            {mission.bonus_reward && (
              <div className="flex items-center gap-1 text-sm text-purple-400">
                <Gift className="w-3.5 h-3.5" />
                <span>{formatBonusReward(mission.bonus_reward)}</span>
              </div>
            )}
          </div>

          {/* Time Remaining or Claim Button */}
          {isCompleted && onClaim && mission.user_mission_id ? (
            <motion.button
              onClick={handleClaim}
              disabled={isClaiming}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm",
                "bg-gradient-to-r from-green-500 to-emerald-500 text-white",
                "hover:shadow-lg hover:shadow-green-500/25 transition-shadow",
                isClaiming && "opacity-70"
              )}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {isClaiming ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Gift className="w-4 h-4" />
                  Réclamer
                </>
              )}
            </motion.button>
          ) : mission.time_remaining && !isClaimed ? (
            <div className="flex items-center gap-1 text-sm text-zinc-500">
              <Clock className="w-4 h-4" />
              <span>{mission.time_remaining}</span>
            </div>
          ) : null}
        </div>
      </div>

      {/* Completed Overlay Shine */}
      {isCompleted && (
        <motion.div
          className="absolute inset-0 pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-green-500/10 to-transparent" />
        </motion.div>
      )}
    </motion.div>
  )
}

/* ==========================================================================
   COMPACT MISSION CARD
   ========================================================================== */

interface CompactMissionCardProps {
  mission: MissionWithProgress
  onClaim?: (userMissionId: string) => Promise<void>
  onClick?: () => void
}

function CompactMissionCard({
  mission,
  onClaim,
  onClick,
}: CompactMissionCardProps) {
  const [isClaiming, setIsClaiming] = useState(false)
  const typeConfig = MISSION_TYPE_CONFIG[mission.type]
  const Icon = getMissionIcon(mission.icon)

  const isCompleted = mission.status === "completed"
  const isClaimed = mission.status === "claimed"

  const handleClaim = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!onClaim || !mission.user_mission_id || isClaiming) return

    setIsClaiming(true)
    try {
      await onClaim(mission.user_mission_id)
    } finally {
      setIsClaiming(false)
    }
  }

  return (
    <motion.div
      className={cn(
        "flex items-center gap-3 p-3 rounded-xl transition-all",
        "bg-zinc-800/50 border border-zinc-700/50",
        isCompleted && "border-green-500/30 bg-green-500/5",
        isClaimed && "opacity-50",
        onClick && !isClaimed && "cursor-pointer hover:bg-zinc-800"
      )}
      onClick={onClick}
      whileHover={!isClaimed ? { x: 4 } : {}}
    >
      {/* Icon */}
      <div
        className={cn(
          "flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center",
          isCompleted
            ? "bg-green-500/20"
            : `bg-gradient-to-br ${typeConfig.gradient}`
        )}
      >
        {isCompleted ? (
          <Check className="w-5 h-5 text-green-400" />
        ) : (
          <Icon className="w-5 h-5 text-white" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className={cn("font-medium truncate", isClaimed ? "text-zinc-500" : "text-white")}>
          {mission.name}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-zinc-500">
            {mission.current_progress}/{mission.target_count}
          </span>
          <div className="flex-1 h-1 bg-zinc-700 rounded-full max-w-[60px]">
            <div
              className={cn(
                "h-full rounded-full",
                isCompleted ? "bg-green-500" : typeConfig.color.replace("text-", "bg-")
              )}
              style={{ width: `${mission.progress_percentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* Reward / Action */}
      {isCompleted && onClaim && mission.user_mission_id ? (
        <button
          onClick={handleClaim}
          disabled={isClaiming}
          className="flex-shrink-0 p-2 rounded-lg bg-green-500 text-white"
        >
          {isClaiming ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Gift className="w-4 h-4" />
          )}
        </button>
      ) : (
        <div className="flex items-center gap-1 text-sm">
          <Zap className="w-3.5 h-3.5 text-yellow-400" />
          <span className="font-bold text-yellow-400">{mission.xp_reward}</span>
        </div>
      )}
    </motion.div>
  )
}

/* ==========================================================================
   MISSION TYPE BADGE
   ========================================================================== */

interface MissionTypeBadgeProps {
  type: MissionType
  showLabel?: boolean
  className?: string
}

export function MissionTypeBadge({
  type,
  showLabel = true,
  className,
}: MissionTypeBadgeProps) {
  const config = MISSION_TYPE_CONFIG[type]
  const Icon = getMissionIcon(config.icon)

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium",
        config.bgColor,
        config.color,
        className
      )}
    >
      <Icon className="w-3.5 h-3.5" />
      {showLabel && <span>{config.label}</span>}
    </span>
  )
}

/* ==========================================================================
   MISSION CATEGORY BADGE
   ========================================================================== */

interface MissionCategoryBadgeProps {
  category: MissionCategory
  showLabel?: boolean
  className?: string
}

export function MissionCategoryBadge({
  category,
  showLabel = true,
  className,
}: MissionCategoryBadgeProps) {
  const config = MISSION_CATEGORY_CONFIG[category]
  const Icon = getMissionIcon(config.icon)

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-xs",
        config.color,
        className
      )}
    >
      <Icon className="w-3.5 h-3.5" />
      {showLabel && <span>{config.label}</span>}
    </span>
  )
}
