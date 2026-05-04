"use client"

import { motion, AnimatePresence } from "framer-motion"
import { Star, Crown, Sparkles, Gem, Shield, Sword, Rocket, Target } from "lucide-react"
import { cn } from "@/lib/utils"

/* ==========================================================================
   LEVEL BADGE - Badge de niveau animé
   ========================================================================== */

interface LevelBadgeProps {
  level: number
  className?: string
  size?: "sm" | "md" | "lg" | "xl"
  showLabel?: boolean
  animate?: boolean
}

// Configuration des niveaux avec icônes et couleurs
const LEVEL_CONFIG = {
  1: { icon: Star, gradient: "from-zinc-400 to-zinc-500", label: "Débutant" },
  5: { icon: Shield, gradient: "from-green-400 to-emerald-500", label: "Apprenti" },
  10: { icon: Target, gradient: "from-blue-400 to-cyan-500", label: "Explorateur" },
  15: { icon: Sword, gradient: "from-purple-400 to-violet-500", label: "Aventurier" },
  20: { icon: Rocket, gradient: "from-orange-400 to-red-500", label: "Expert" },
  25: { icon: Gem, gradient: "from-pink-400 to-rose-500", label: "Maître" },
  30: { icon: Crown, gradient: "from-yellow-400 to-amber-500", label: "Légende" },
  50: { icon: Sparkles, gradient: "from-cyan-400 via-purple-500 to-pink-500", label: "Mythique" },
}

function getLevelConfig(level: number) {
  const levels = Object.keys(LEVEL_CONFIG).map(Number).sort((a, b) => b - a)
  for (const lvl of levels) {
    if (level >= lvl) {
      return LEVEL_CONFIG[lvl as keyof typeof LEVEL_CONFIG]
    }
  }
  return LEVEL_CONFIG[1]
}

export function LevelBadge({
  level,
  className,
  size = "md",
  showLabel = false,
  animate = true,
}: LevelBadgeProps) {
  const config = getLevelConfig(level)
  const Icon = config.icon

  const sizeConfig = {
    sm: { wrapper: "w-8 h-8", icon: "w-4 h-4", text: "text-xs" },
    md: { wrapper: "w-12 h-12", icon: "w-6 h-6", text: "text-sm" },
    lg: { wrapper: "w-16 h-16", icon: "w-8 h-8", text: "text-base" },
    xl: { wrapper: "w-24 h-24", icon: "w-12 h-12", text: "text-lg" },
  }

  return (
    <div className={cn("flex flex-col items-center gap-2", className)}>
      <motion.div
        className="relative"
        initial={animate ? { scale: 0, rotate: -180 } : {}}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 200, damping: 15 }}
      >
        {/* Badge principal */}
        <motion.div
          className={cn(
            "rounded-full flex items-center justify-center relative overflow-hidden",
            `bg-gradient-to-br ${config.gradient}`,
            sizeConfig[size].wrapper
          )}
          whileHover={animate ? { scale: 1.1, rotate: 5 } : {}}
        >
          {/* Fond animé */}
          <motion.div
            className="absolute inset-0 bg-white/20"
            animate={{
              background: [
                "radial-gradient(circle at 30% 30%, rgba(255,255,255,0.3) 0%, transparent 50%)",
                "radial-gradient(circle at 70% 70%, rgba(255,255,255,0.3) 0%, transparent 50%)",
                "radial-gradient(circle at 30% 30%, rgba(255,255,255,0.3) 0%, transparent 50%)",
              ],
            }}
            transition={{ duration: 3, repeat: Infinity }}
          />

          {/* Icône */}
          <Icon className={cn("text-white relative z-10", sizeConfig[size].icon)} />

          {/* Shimmer effect */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -skew-x-12"
            initial={{ x: "-100%" }}
            animate={{ x: "100%" }}
            transition={{
              duration: 2,
              repeat: Infinity,
              repeatDelay: 3,
              ease: "easeInOut",
            }}
          />
        </motion.div>

        {/* Numéro de niveau */}
        <motion.div
          className="absolute -bottom-1 -right-1 bg-zinc-900 border-2 border-zinc-800 rounded-full min-w-6 h-6 flex items-center justify-center px-1"
          initial={animate ? { scale: 0 } : {}}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring" }}
        >
          <span className={cn("font-bold text-white", sizeConfig[size].text)}>
            {level}
          </span>
        </motion.div>

        {/* Glow effect */}
        <div
          className={cn(
            "absolute inset-0 rounded-full blur-lg -z-10 opacity-50",
            `bg-gradient-to-br ${config.gradient}`
          )}
        />
      </motion.div>

      {/* Label */}
      {showLabel && (
        <motion.span
          className="text-sm font-medium text-zinc-400"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          {config.label}
        </motion.span>
      )}
    </div>
  )
}

/* ==========================================================================
   LEVEL UP ANIMATION - Animation de passage de niveau
   ========================================================================== */

interface LevelUpAnimationProps {
  fromLevel: number
  toLevel: number
  onComplete?: () => void
}

export function LevelUpAnimation({
  fromLevel,
  toLevel,
  onComplete,
}: LevelUpAnimationProps) {
  const newConfig = getLevelConfig(toLevel)

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onComplete}
    >
      {/* Particules de confetti */}
      <ConfettiParticles />

      <motion.div
        className="text-center"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 15 }}
      >
        {/* Texte LEVEL UP */}
        <motion.div
          className="mb-8"
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <motion.h2
            className="text-6xl font-black bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 bg-clip-text text-transparent"
            animate={{
              scale: [1, 1.1, 1],
              textShadow: [
                "0 0 20px rgba(255,200,0,0.5)",
                "0 0 40px rgba(255,200,0,0.8)",
                "0 0 20px rgba(255,200,0,0.5)",
              ],
            }}
            transition={{ duration: 1, repeat: Infinity }}
          >
            LEVEL UP!
          </motion.h2>
        </motion.div>

        {/* Badge animé */}
        <motion.div
          className="mb-6"
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: 0.4, type: "spring", stiffness: 150 }}
        >
          <LevelBadge level={toLevel} size="xl" showLabel animate={false} />
        </motion.div>

        {/* Transition de niveau */}
        <motion.div
          className="flex items-center justify-center gap-4 text-2xl font-bold"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          <span className="text-zinc-500">{fromLevel}</span>
          <motion.span
            animate={{ x: [0, 10, 0] }}
            transition={{ duration: 0.5, repeat: Infinity }}
          >
            →
          </motion.span>
          <span className={`bg-gradient-to-r ${newConfig.gradient} bg-clip-text text-transparent`}>
            {toLevel}
          </span>
        </motion.div>

        {/* Nouveau titre */}
        <motion.p
          className="mt-4 text-xl text-zinc-300"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
        >
          Tu es maintenant <span className="font-bold text-white">{newConfig.label}</span> !
        </motion.p>

        {/* Bouton continuer */}
        <motion.button
          className="mt-8 px-8 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-xl font-bold text-white"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onComplete}
        >
          Continuer
        </motion.button>
      </motion.div>
    </motion.div>
  )
}

/* ==========================================================================
   CONFETTI PARTICLES
   ========================================================================== */

function ConfettiParticles() {
  const colors = ["#00d4ff", "#ff6b6b", "#feca57", "#48dbfb", "#ff9ff3", "#54a0ff"]

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {Array.from({ length: 50 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-3 h-3 rounded-sm"
          style={{
            backgroundColor: colors[i % colors.length],
            left: `${Math.random() * 100}%`,
            top: -20,
          }}
          animate={{
            y: [0, window.innerHeight + 50],
            x: [0, (Math.random() - 0.5) * 200],
            rotate: [0, Math.random() * 720],
            opacity: [1, 0],
          }}
          transition={{
            duration: 2 + Math.random() * 2,
            delay: Math.random() * 0.5,
            ease: "easeOut",
          }}
        />
      ))}
    </div>
  )
}

/* ==========================================================================
   LEVEL PROGRESS RING - Cercle de progression
   ========================================================================== */

interface LevelProgressRingProps {
  level: number
  currentXP: number
  xpToNextLevel: number
  className?: string
  size?: number
}

export function LevelProgressRing({
  level,
  currentXP,
  xpToNextLevel,
  className,
  size = 120,
}: LevelProgressRingProps) {
  const config = getLevelConfig(level)
  const Icon = config.icon

  const xpInCurrentLevel = currentXP % 100
  const percentage = (xpInCurrentLevel / 100) * 100

  const strokeWidth = 8
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (percentage / 100) * circumference

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)}>
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-zinc-800"
        />

        {/* Progress circle */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke="url(#levelGradient)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 1, ease: "easeOut" }}
        />

        {/* Gradient definition */}
        <defs>
          <linearGradient id="levelGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#00d4ff" />
            <stop offset="50%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#ec4899" />
          </linearGradient>
        </defs>
      </svg>

      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${config.gradient} flex items-center justify-center mb-1`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <span className="text-2xl font-black text-white">{level}</span>
        <span className="text-xs text-zinc-500">{xpInCurrentLevel}/{100} XP</span>
      </div>
    </div>
  )
}

/* ==========================================================================
   LEVEL MILESTONES - Jalons de niveau
   ========================================================================== */

interface LevelMilestonesProps {
  currentLevel: number
  className?: string
}

export function LevelMilestones({ currentLevel, className }: LevelMilestonesProps) {
  const milestones = [5, 10, 15, 20, 25, 30, 50]

  return (
    <div className={cn("flex items-center gap-1", className)}>
      {milestones.map((milestone, index) => {
        const isReached = currentLevel >= milestone
        const config = getLevelConfig(milestone)
        const Icon = config.icon

        return (
          <motion.div
            key={milestone}
            className="relative"
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.1 }}
          >
            {/* Ligne de connexion */}
            {index < milestones.length - 1 && (
              <div className={cn(
                "absolute top-1/2 left-full w-3 h-0.5 -translate-y-1/2",
                isReached ? "bg-gradient-to-r from-cyan-500 to-blue-500" : "bg-zinc-800"
              )} />
            )}

            {/* Milestone badge */}
            <motion.div
              className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center",
                isReached
                  ? `bg-gradient-to-br ${config.gradient}`
                  : "bg-zinc-800 border border-zinc-700"
              )}
              whileHover={{ scale: 1.2 }}
            >
              <Icon className={cn(
                "w-4 h-4",
                isReached ? "text-white" : "text-zinc-600"
              )} />
            </motion.div>

            {/* Tooltip */}
            <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs text-zinc-500 whitespace-nowrap">
              {milestone}
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}
