"use client"

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Trophy, Award, Star, Zap, Users, Calendar, Heart, Target, X, Share2 } from "lucide-react"
import { cn } from "@/lib/utils"

/* ==========================================================================
   TYPES
   ========================================================================== */

interface Achievement {
  id: string
  name: string
  description: string
  icon: string
  points: number
  category: string
  rarity?: "common" | "rare" | "epic" | "legendary"
}

const ACHIEVEMENT_ICONS = {
  trophy: Trophy,
  award: Award,
  star: Star,
  zap: Zap,
  users: Users,
  calendar: Calendar,
  heart: Heart,
  target: Target,
}

const RARITY_CONFIG = {
  common: {
    gradient: "from-zinc-400 to-zinc-500",
    glow: "shadow-zinc-500/30",
    label: "Commun",
    border: "border-zinc-500/30",
  },
  rare: {
    gradient: "from-blue-400 to-cyan-500",
    glow: "shadow-blue-500/30",
    label: "Rare",
    border: "border-blue-500/30",
  },
  epic: {
    gradient: "from-purple-400 to-pink-500",
    glow: "shadow-purple-500/30",
    label: "Épique",
    border: "border-purple-500/30",
  },
  legendary: {
    gradient: "from-yellow-400 via-orange-500 to-red-500",
    glow: "shadow-yellow-500/30",
    label: "Légendaire",
    border: "border-yellow-500/30",
  },
}

/* ==========================================================================
   ACHIEVEMENT UNLOCK MODAL
   ========================================================================== */

interface AchievementUnlockModalProps {
  achievement: Achievement
  onClose: () => void
  onShare?: () => void
}

export function AchievementUnlockModal({
  achievement,
  onClose,
  onShare,
}: AchievementUnlockModalProps) {
  const Icon = ACHIEVEMENT_ICONS[achievement.icon as keyof typeof ACHIEVEMENT_ICONS] || Trophy
  const rarity = achievement.rarity || "common"
  const rarityConfig = RARITY_CONFIG[rarity]

  useEffect(() => {
    // Auto-close after 5 seconds
    const timer = setTimeout(onClose, 5000)
    return () => clearTimeout(timer)
  }, [onClose])

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      {/* Rayons de lumière */}
      <div className="absolute inset-0 overflow-hidden">
        {Array.from({ length: 12 }).map((_, i) => (
          <motion.div
            key={i}
            className={cn(
              "absolute top-1/2 left-1/2 w-1 origin-bottom",
              `bg-gradient-to-t ${rarityConfig.gradient}`
            )}
            style={{
              height: "50vh",
              rotate: `${i * 30}deg`,
              opacity: 0.3,
            }}
            initial={{ scaleY: 0 }}
            animate={{ scaleY: [0, 1, 0.8] }}
            transition={{ delay: i * 0.05, duration: 0.5 }}
          />
        ))}
      </div>

      {/* Particules brillantes */}
      <SparkleParticles color={rarity} />

      <motion.div
        className={cn(
          "relative bg-zinc-900/90 backdrop-blur-xl rounded-3xl p-8 max-w-sm mx-4",
          "border-2",
          rarityConfig.border
        )}
        initial={{ scale: 0, rotate: -10 }}
        animate={{ scale: 1, rotate: 0 }}
        exit={{ scale: 0, rotate: 10 }}
        transition={{ type: "spring", stiffness: 200, damping: 15 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Bouton fermer */}
        <button
          className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors"
          onClick={onClose}
        >
          <X className="w-5 h-5" />
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
              "text-sm font-bold uppercase tracking-wider mb-2",
              `bg-gradient-to-r ${rarityConfig.gradient} bg-clip-text text-transparent`
            )}
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            Achievement Débloqué !
          </motion.p>
          <p className="text-xs text-zinc-500">{rarityConfig.label}</p>
        </motion.div>

        {/* Badge Achievement */}
        <motion.div
          className="relative mx-auto w-32 h-32 mb-6"
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: 0.3, type: "spring", stiffness: 150 }}
        >
          {/* Anneau extérieur animé */}
          <motion.div
            className={cn(
              "absolute inset-0 rounded-full border-4",
              rarityConfig.border
            )}
            animate={{ rotate: 360 }}
            transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
          >
            {/* Points sur l'anneau */}
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  "absolute w-2 h-2 rounded-full",
                  `bg-gradient-to-br ${rarityConfig.gradient}`
                )}
                style={{
                  top: "50%",
                  left: "50%",
                  transform: `rotate(${i * 45}deg) translateY(-60px)`,
                }}
              />
            ))}
          </motion.div>

          {/* Badge central */}
          <motion.div
            className={cn(
              "absolute inset-4 rounded-full flex items-center justify-center",
              `bg-gradient-to-br ${rarityConfig.gradient}`
            )}
            animate={{
              boxShadow: [
                `0 0 20px rgba(0,0,0,0)`,
                `0 0 40px rgba(255,255,255,0.3)`,
                `0 0 20px rgba(0,0,0,0)`,
              ],
            }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <Icon className="w-12 h-12 text-white" />
          </motion.div>

          {/* Glow */}
          <div
            className={cn(
              "absolute inset-0 rounded-full blur-xl -z-10 opacity-50",
              `bg-gradient-to-br ${rarityConfig.gradient}`
            )}
          />
        </motion.div>

        {/* Nom et description */}
        <motion.div
          className="text-center mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <h3 className="text-2xl font-black text-white mb-2">{achievement.name}</h3>
          <p className="text-zinc-400">{achievement.description}</p>
        </motion.div>

        {/* Points gagnés */}
        <motion.div
          className="flex items-center justify-center gap-2 mb-6"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.6 }}
        >
          <Zap className="w-5 h-5 text-cyan-400" />
          <span className="text-xl font-bold text-cyan-400">+{achievement.points} XP</span>
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
                "flex-1 py-3 rounded-xl font-medium text-white flex items-center justify-center gap-2",
                `bg-gradient-to-r ${rarityConfig.gradient}`
              )}
              onClick={onShare}
            >
              <Share2 className="w-4 h-4" />
              Partager
            </button>
          )}
        </motion.div>
      </motion.div>
    </motion.div>
  )
}

/* ==========================================================================
   SPARKLE PARTICLES
   ========================================================================== */

function SparkleParticles({ color }: { color: string }) {
  const config = RARITY_CONFIG[color as keyof typeof RARITY_CONFIG] || RARITY_CONFIG.common

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {Array.from({ length: 30 }).map((_, i) => (
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
          }}
          transition={{
            duration: 2,
            delay: Math.random() * 2,
            repeat: Infinity,
          }}
        >
          <Star className={cn("w-full h-full", `text-${color === "legendary" ? "yellow" : "cyan"}-400`)} />
        </motion.div>
      ))}
    </div>
  )
}

/* ==========================================================================
   ACHIEVEMENT TOAST - Version toast rapide
   ========================================================================== */

interface AchievementToastProps {
  achievement: Achievement
  onClose: () => void
}

export function AchievementToast({ achievement, onClose }: AchievementToastProps) {
  const Icon = ACHIEVEMENT_ICONS[achievement.icon as keyof typeof ACHIEVEMENT_ICONS] || Trophy
  const rarity = achievement.rarity || "common"
  const rarityConfig = RARITY_CONFIG[rarity]

  useEffect(() => {
    const timer = setTimeout(onClose, 4000)
    return () => clearTimeout(timer)
  }, [onClose])

  return (
    <motion.div
      className="fixed top-4 right-4 z-50"
      initial={{ opacity: 0, x: 100, scale: 0.8 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 100, scale: 0.8 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      <div
        className={cn(
          "flex items-center gap-4 p-4 rounded-2xl backdrop-blur-lg border",
          "bg-zinc-900/90",
          rarityConfig.border
        )}
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
          <p className="text-xs text-zinc-500 uppercase tracking-wider mb-0.5">
            Achievement débloqué
          </p>
          <p className="text-white font-bold truncate">{achievement.name}</p>
          <p className="text-cyan-400 text-sm font-medium">+{achievement.points} XP</p>
        </div>

        {/* Close */}
        <button
          className="text-zinc-500 hover:text-white transition-colors"
          onClick={onClose}
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </motion.div>
  )
}

/* ==========================================================================
   ACHIEVEMENT CARD - Carte d'achievement pour la liste
   ========================================================================== */

interface AchievementCardProps {
  achievement: Achievement & { unlocked_at?: string | null; progress?: number; requirement?: number }
  onClick?: () => void
  className?: string
}

export function AchievementCard({ achievement, onClick, className }: AchievementCardProps) {
  const Icon = ACHIEVEMENT_ICONS[achievement.icon as keyof typeof ACHIEVEMENT_ICONS] || Trophy
  const isUnlocked = !!achievement.unlocked_at
  const rarity = achievement.rarity || "common"
  const rarityConfig = RARITY_CONFIG[rarity]

  const progress = achievement.progress || 0
  const requirement = achievement.requirement || 1
  const percentage = Math.min((progress / requirement) * 100, 100)

  return (
    <motion.div
      className={cn(
        "relative p-4 rounded-2xl cursor-pointer transition-all",
        isUnlocked
          ? cn("bg-gradient-to-br from-zinc-800/50 to-zinc-900/50 border", rarityConfig.border)
          : "bg-zinc-900 border border-zinc-800 opacity-60",
        className
      )}
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
    >
      <div className="flex items-start gap-4">
        {/* Badge */}
        <motion.div
          className={cn(
            "w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0",
            isUnlocked
              ? `bg-gradient-to-br ${rarityConfig.gradient}`
              : "bg-zinc-800"
          )}
          animate={isUnlocked ? { scale: [1, 1.05, 1] } : {}}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <Icon className={cn("w-6 h-6", isUnlocked ? "text-white" : "text-zinc-600")} />
        </motion.div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="text-white font-bold truncate">{achievement.name}</h4>
            {isUnlocked && (
              <span className={cn(
                "text-xs px-2 py-0.5 rounded-full font-medium",
                `bg-gradient-to-r ${rarityConfig.gradient} text-white`
              )}>
                {rarityConfig.label}
              </span>
            )}
          </div>

          <p className="text-zinc-400 text-sm mb-2 line-clamp-2">{achievement.description}</p>

          {/* Progress bar pour non-débloqués */}
          {!isUnlocked && percentage > 0 && (
            <div className="mb-2">
              <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                <motion.div
                  className={cn("h-full rounded-full", `bg-gradient-to-r ${rarityConfig.gradient}`)}
                  initial={{ width: 0 }}
                  animate={{ width: `${percentage}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
              <p className="text-xs text-zinc-500 mt-1">{progress} / {requirement}</p>
            </div>
          )}

          {/* Points */}
          <div className="flex items-center gap-2">
            <Zap className={cn("w-4 h-4", isUnlocked ? "text-cyan-400" : "text-zinc-600")} />
            <span className={cn("font-bold text-sm", isUnlocked ? "text-cyan-400" : "text-zinc-600")}>
              {isUnlocked ? "+" : ""}{achievement.points} points
            </span>

            {isUnlocked && achievement.unlocked_at && (
              <span className="text-zinc-500 text-xs ml-auto">
                {new Date(achievement.unlocked_at).toLocaleDateString("fr-FR")}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Glow for unlocked */}
      {isUnlocked && (
        <div
          className={cn(
            "absolute inset-0 rounded-2xl -z-10 blur-xl opacity-20",
            `bg-gradient-to-br ${rarityConfig.gradient}`
          )}
        />
      )}
    </motion.div>
  )
}

/* ==========================================================================
   ACHIEVEMENT PROGRESS OVERVIEW
   ========================================================================== */

interface AchievementProgressOverviewProps {
  total: number
  unlocked: number
  className?: string
}

export function AchievementProgressOverview({
  total,
  unlocked,
  className,
}: AchievementProgressOverviewProps) {
  const percentage = total > 0 ? (unlocked / total) * 100 : 0

  return (
    <div className={cn("bg-zinc-900 rounded-2xl p-6", className)}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-white">Progression</h3>
        <span className="text-cyan-400 font-bold">{unlocked} / {total}</span>
      </div>

      <div className="h-3 bg-zinc-800 rounded-full overflow-hidden mb-4">
        <motion.div
          className="h-full bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
        />
      </div>

      <div className="flex justify-between text-sm text-zinc-500">
        <span>{Math.round(percentage)}% complété</span>
        <span>{total - unlocked} restants</span>
      </div>
    </div>
  )
}
