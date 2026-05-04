"use client"

import { useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, Share2, Zap, Star, Download } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  type UserAchievement,
  RARITY_CONFIG,
} from "../../features/achievements/schema"
import { getAchievementIcon } from "./achievements-list"

/* ==========================================================================
   TYPES
   ========================================================================== */

interface AchievementUnlockModalProps {
  achievement: UserAchievement | null
  isOpen: boolean
  onClose: () => void
  onShare?: (achievement: UserAchievement) => void
  autoClose?: boolean
  autoCloseDelay?: number
}

/* ==========================================================================
   SPARKLE PARTICLES
   ========================================================================== */

function SparkleParticles({ rarity }: { rarity: string }) {
  const config = RARITY_CONFIG[rarity as keyof typeof RARITY_CONFIG] || RARITY_CONFIG.common
  const particleCount = rarity === "legendary" || rarity === "mythic" ? 40 : 25

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {Array.from({ length: particleCount }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-2 h-2"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
          }}
          initial={{ opacity: 0, scale: 0 }}
          animate={{
            opacity: [0, 1, 0],
            scale: [0, 1, 0],
            y: [0, -20, -40],
          }}
          transition={{
            duration: 2 + Math.random(),
            delay: Math.random() * 2,
            repeat: Infinity,
          }}
        >
          <Star className="w-full h-full text-yellow-400" />
        </motion.div>
      ))}
    </div>
  )
}

/* ==========================================================================
   LIGHT RAYS
   ========================================================================== */

function LightRays({ rarity }: { rarity: string }) {
  const config = RARITY_CONFIG[rarity as keyof typeof RARITY_CONFIG] || RARITY_CONFIG.common
  const rayCount = 12

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {Array.from({ length: rayCount }).map((_, i) => (
        <motion.div
          key={i}
          className={cn(
            "absolute top-1/2 left-1/2 w-1 origin-bottom",
            `bg-gradient-to-t ${config.gradient}`
          )}
          style={{
            height: "50vh",
            rotate: `${i * (360 / rayCount)}deg`,
            opacity: 0.2,
          }}
          initial={{ scaleY: 0 }}
          animate={{ scaleY: [0, 1, 0.8] }}
          transition={{ delay: i * 0.03, duration: 0.5 }}
        />
      ))}
    </div>
  )
}

/* ==========================================================================
   MAIN COMPONENT
   ========================================================================== */

export function AchievementUnlockModal({
  achievement,
  isOpen,
  onClose,
  onShare,
  autoClose = true,
  autoCloseDelay = 6000,
}: AchievementUnlockModalProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // Auto-close timer
  useEffect(() => {
    if (isOpen && autoClose) {
      const timer = setTimeout(onClose, autoCloseDelay)
      return () => clearTimeout(timer)
    }
  }, [isOpen, autoClose, autoCloseDelay, onClose])

  // Play sound effect (optional)
  useEffect(() => {
    if (isOpen && achievement) {
      // You can add a sound effect here if desired
      // audioRef.current?.play()
    }
  }, [isOpen, achievement])

  if (!achievement) return null

  const Icon = getAchievementIcon(achievement.icon)
  const rarityConfig = RARITY_CONFIG[achievement.rarity]

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          {/* Light Rays */}
          <LightRays rarity={achievement.rarity} />

          {/* Sparkle Particles */}
          <SparkleParticles rarity={achievement.rarity} />

          {/* Modal Content */}
          <motion.div
            className={cn(
              "relative bg-zinc-900/95 backdrop-blur-xl rounded-3xl p-8 max-w-sm w-full mx-4",
              "border-2",
              rarityConfig.border
            )}
            initial={{ scale: 0, rotate: -10 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0, rotate: 10, opacity: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 15 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors z-10"
              onClick={onClose}
            >
              <X className="w-6 h-6" />
            </button>

            {/* Header */}
            <motion.div
              className="text-center mb-6"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <motion.p
                className={cn(
                  "text-sm font-black uppercase tracking-widest mb-2",
                  `bg-gradient-to-r ${rarityConfig.gradient} bg-clip-text text-transparent`
                )}
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                Achievement Débloqué !
              </motion.p>
              <p className={cn("text-xs font-medium", rarityConfig.labelColor)}>
                {rarityConfig.label}
              </p>
            </motion.div>

            {/* Badge */}
            <motion.div
              className="relative mx-auto w-36 h-36 mb-8"
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.3, type: "spring", stiffness: 150 }}
            >
              {/* Rotating Ring */}
              <motion.div
                className={cn(
                  "absolute inset-0 rounded-full border-4",
                  rarityConfig.border
                )}
                animate={{ rotate: 360 }}
                transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
              >
                {/* Points on ring */}
                {Array.from({ length: 8 }).map((_, i) => (
                  <motion.div
                    key={i}
                    className={cn(
                      "absolute w-3 h-3 rounded-full",
                      `bg-gradient-to-br ${rarityConfig.gradient}`
                    )}
                    style={{
                      top: "50%",
                      left: "50%",
                      transform: `rotate(${i * 45}deg) translateY(-68px)`,
                    }}
                    animate={{
                      scale: [1, 1.2, 1],
                      opacity: [0.5, 1, 0.5],
                    }}
                    transition={{
                      duration: 1.5,
                      delay: i * 0.1,
                      repeat: Infinity,
                    }}
                  />
                ))}
              </motion.div>

              {/* Center Badge */}
              <motion.div
                className={cn(
                  "absolute inset-6 rounded-full flex items-center justify-center",
                  `bg-gradient-to-br ${rarityConfig.gradient}`
                )}
                animate={{
                  boxShadow: [
                    "0 0 30px rgba(255,255,255,0)",
                    "0 0 60px rgba(255,255,255,0.4)",
                    "0 0 30px rgba(255,255,255,0)",
                  ],
                }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Icon className="w-14 h-14 text-white" />
              </motion.div>

              {/* Glow */}
              <div
                className={cn(
                  "absolute inset-0 rounded-full blur-2xl -z-10 opacity-60",
                  `bg-gradient-to-br ${rarityConfig.gradient}`
                )}
              />
            </motion.div>

            {/* Achievement Info */}
            <motion.div
              className="text-center mb-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <h2 className="text-2xl font-black text-white mb-2">
                {achievement.name}
              </h2>
              <p className="text-zinc-400">{achievement.description}</p>
            </motion.div>

            {/* Rewards */}
            <motion.div
              className="flex items-center justify-center gap-6 mb-8"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.6 }}
            >
              {/* Points */}
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Star className="w-5 h-5 text-yellow-400" />
                  <span className="text-xl font-bold text-yellow-400">
                    +{achievement.points}
                  </span>
                </div>
                <p className="text-xs text-zinc-500">Points</p>
              </div>

              {/* XP */}
              {achievement.xp_reward > 0 && (
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Zap className="w-5 h-5 text-cyan-400" />
                    <span className="text-xl font-bold text-cyan-400">
                      +{achievement.xp_reward}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500">XP</p>
                </div>
              )}
            </motion.div>

            {/* Actions */}
            <motion.div
              className="flex gap-3"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
            >
              <button
                className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl font-medium text-white transition-colors"
                onClick={onClose}
              >
                Fermer
              </button>

              {onShare && (
                <button
                  className={cn(
                    "flex-1 py-3 rounded-xl font-medium text-white flex items-center justify-center gap-2 transition-all hover:opacity-90",
                    `bg-gradient-to-r ${rarityConfig.gradient}`
                  )}
                  onClick={() => onShare(achievement)}
                >
                  <Share2 className="w-4 h-4" />
                  Partager
                </button>
              )}
            </motion.div>

            {/* Progress bar auto-close */}
            {autoClose && (
              <motion.div
                className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-b-3xl"
                initial={{ width: "100%" }}
                animate={{ width: "0%" }}
                transition={{ duration: autoCloseDelay / 1000, ease: "linear" }}
              />
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/* ==========================================================================
   ACHIEVEMENT TOAST (Compact notification)
   ========================================================================== */

interface AchievementToastProps {
  achievement: UserAchievement | null
  isOpen: boolean
  onClose: () => void
  onClick?: () => void
  position?: "top-right" | "top-left" | "bottom-right" | "bottom-left"
}

export function AchievementToast({
  achievement,
  isOpen,
  onClose,
  onClick,
  position = "top-right",
}: AchievementToastProps) {
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(onClose, 5000)
      return () => clearTimeout(timer)
    }
  }, [isOpen, onClose])

  if (!achievement) return null

  const Icon = getAchievementIcon(achievement.icon)
  const rarityConfig = RARITY_CONFIG[achievement.rarity]

  const positionClasses = {
    "top-right": "top-4 right-4",
    "top-left": "top-4 left-4",
    "bottom-right": "bottom-4 right-4",
    "bottom-left": "bottom-4 left-4",
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className={cn("fixed z-50", positionClasses[position])}
          initial={{ opacity: 0, x: position.includes("right") ? 100 : -100, scale: 0.8 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: position.includes("right") ? 100 : -100, scale: 0.8 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
        >
          <div
            className={cn(
              "flex items-center gap-4 p-4 rounded-2xl backdrop-blur-lg border cursor-pointer",
              "bg-zinc-900/95",
              rarityConfig.border,
              "hover:scale-105 transition-transform"
            )}
            onClick={onClick}
          >
            {/* Badge */}
            <motion.div
              className={cn(
                "w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0",
                `bg-gradient-to-br ${rarityConfig.gradient}`
              )}
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 0.5, repeat: 2 }}
            >
              <Icon className="w-7 h-7 text-white" />
            </motion.div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <p className={cn("text-xs uppercase tracking-wider mb-0.5", rarityConfig.labelColor)}>
                Achievement débloqué
              </p>
              <p className="text-white font-bold truncate">{achievement.name}</p>
              <div className="flex items-center gap-2">
                <span className="text-yellow-400 text-sm font-medium">
                  +{achievement.points} pts
                </span>
                {achievement.xp_reward > 0 && (
                  <span className="text-cyan-400 text-sm font-medium">
                    +{achievement.xp_reward} XP
                  </span>
                )}
              </div>
            </div>

            {/* Close */}
            <button
              className="text-zinc-500 hover:text-white transition-colors"
              onClick={(e) => {
                e.stopPropagation()
                onClose()
              }}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/* ==========================================================================
   MULTI-ACHIEVEMENT NOTIFICATION (pour plusieurs déblocages simultanés)
   ========================================================================== */

interface MultiAchievementNotificationProps {
  achievements: UserAchievement[]
  isOpen: boolean
  onClose: () => void
  onViewAll?: () => void
}

export function MultiAchievementNotification({
  achievements,
  isOpen,
  onClose,
  onViewAll,
}: MultiAchievementNotificationProps) {
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(onClose, 8000)
      return () => clearTimeout(timer)
    }
  }, [isOpen, onClose])

  if (achievements.length === 0) return null

  const totalPoints = achievements.reduce((sum, a) => sum + a.points, 0)
  const totalXP = achievements.reduce((sum, a) => sum + a.xp_reward, 0)

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed top-4 right-4 z-50"
          initial={{ opacity: 0, x: 100, scale: 0.8 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: 100, scale: 0.8 }}
        >
          <div className="bg-zinc-900/95 backdrop-blur-lg border border-cyan-500/30 rounded-2xl p-4 min-w-[300px]">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Star className="w-5 h-5 text-yellow-400" />
                <span className="font-bold text-white">
                  {achievements.length} Achievements !
                </span>
              </div>
              <button
                className="text-zinc-500 hover:text-white transition-colors"
                onClick={onClose}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Achievement List */}
            <div className="space-y-2 mb-4 max-h-[200px] overflow-y-auto">
              {achievements.slice(0, 5).map((achievement) => {
                const Icon = getAchievementIcon(achievement.icon)
                const config = RARITY_CONFIG[achievement.rarity]

                return (
                  <div
                    key={achievement.id}
                    className="flex items-center gap-3 p-2 bg-zinc-800/50 rounded-xl"
                  >
                    <div
                      className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center",
                        `bg-gradient-to-br ${config.gradient}`
                      )}
                    >
                      <Icon className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-sm text-white font-medium truncate flex-1">
                      {achievement.name}
                    </span>
                    <span className={cn("text-xs font-medium", config.labelColor)}>
                      {config.label}
                    </span>
                  </div>
                )
              })}

              {achievements.length > 5 && (
                <p className="text-center text-xs text-zinc-500">
                  +{achievements.length - 5} autres...
                </p>
              )}
            </div>

            {/* Total Rewards */}
            <div className="flex items-center justify-center gap-4 mb-4 py-2 bg-zinc-800/50 rounded-xl">
              <div className="flex items-center gap-1">
                <Star className="w-4 h-4 text-yellow-400" />
                <span className="font-bold text-yellow-400">+{totalPoints} pts</span>
              </div>
              {totalXP > 0 && (
                <div className="flex items-center gap-1">
                  <Zap className="w-4 h-4 text-cyan-400" />
                  <span className="font-bold text-cyan-400">+{totalXP} XP</span>
                </div>
              )}
            </div>

            {/* View All Button */}
            {onViewAll && (
              <button
                className="w-full py-2 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-xl font-medium text-white hover:opacity-90 transition-opacity"
                onClick={onViewAll}
              >
                Voir tous les achievements
              </button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
