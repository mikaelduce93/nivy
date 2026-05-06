"use client"

import { motion } from "framer-motion"
import { Sprout, Rocket, Crown, Zap, Sparkles } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

/* ==========================================================================
   LEVEL BADGE — 5 tiers Gen-Z (Sprout / Rocket / Crown / Legend / Cosmic)
   ==========================================================================

   Phase 2 visual polish: collapsed the original 8 RPG-niche tiers (Débutant,
   Apprenti, Explorateur, Aventurier, Expert, Maître, Légende, Mythique) into
   five Gen-Z named tiers. Same visual treatment (gradient ring + level
   number chip + shimmer); the labels feel native to a teen audience instead
   of a tabletop RPG manual.
   ========================================================================== */

export type LevelTierId = "sprout" | "rocket" | "crown" | "legend" | "cosmic"

export interface LevelTier {
  id: LevelTierId
  /** Label rendered to users. Kept short (one or two syllables). */
  name: string
  /** Decorative emoji shown alongside the label. */
  emoji: string
  /** Lucide icon used inside the badge disc. */
  icon: LucideIcon
  /** Tailwind gradient applied as the badge background. */
  gradient: string
  /** Inclusive lower bound of the level range owning this tier. */
  minLevel: number
}

/**
 * Tiers, ordered by `minLevel` ascending. Order matters for `getTierForLevel`.
 *
 * Range mapping:
 *   1–5    → Sprout   (just landed)
 *   6–15   → Rocket   (climbing)
 *   16–25  → Crown    (expert)
 *   26–35  → Legend   (rare air)
 *   36+    → Cosmic   (mythic)
 */
const TIERS: readonly LevelTier[] = [
  {
    id: "sprout",
    name: "Sprout",
    emoji: "🌱",
    icon: Sprout,
    gradient: "from-green-400 to-emerald-500",
    minLevel: 1,
  },
  {
    id: "rocket",
    name: "Rocket",
    emoji: "🚀",
    icon: Rocket,
    gradient: "from-cyan-400 to-blue-500",
    minLevel: 6,
  },
  {
    id: "crown",
    name: "Crown",
    emoji: "👑",
    icon: Crown,
    gradient: "from-yellow-400 to-amber-500",
    minLevel: 16,
  },
  {
    id: "legend",
    name: "Legend",
    emoji: "⚡",
    icon: Zap,
    gradient: "from-purple-400 via-fuchsia-500 to-pink-500",
    minLevel: 26,
  },
  {
    id: "cosmic",
    name: "Cosmic",
    emoji: "🌌",
    icon: Sparkles,
    gradient: "from-cyan-400 via-purple-500 to-pink-500",
    minLevel: 36,
  },
] as const

/** Resolve the tier owning the given level. Defaults to Sprout for level <= 0. */
export function getTierForLevel(level: number): LevelTier {
  // Walk descending so the highest matching minLevel wins.
  for (let i = TIERS.length - 1; i >= 0; i--) {
    const tier = TIERS[i]
    if (level >= tier.minLevel) return tier
  }
  return TIERS[0]
}

/* ==========================================================================
   Backwards compatibility aliases
   ==========================================================================

   The previous API exposed `LEVEL_CONFIG` keyed by numeric thresholds and a
   `getLevelConfig(level)` helper returning `{ icon, gradient, label }`. Some
   callers in `components/gamification/*` may still reference these; we keep
   shims that adapt the new tier shape to the old surface.
   ========================================================================== */

export interface LegacyLevelConfig {
  icon: LucideIcon
  gradient: string
  label: string
}

export const LEVEL_CONFIG: Record<number, LegacyLevelConfig> = TIERS.reduce(
  (acc, tier) => {
    acc[tier.minLevel] = {
      icon: tier.icon,
      gradient: tier.gradient,
      label: tier.name,
    }
    return acc
  },
  {} as Record<number, LegacyLevelConfig>,
)

export function getLevelConfig(level: number): LegacyLevelConfig {
  const tier = getTierForLevel(level)
  return { icon: tier.icon, gradient: tier.gradient, label: tier.name }
}

/* ==========================================================================
   LevelBadge component
   ========================================================================== */

interface LevelBadgeProps {
  level: number
  className?: string
  size?: "sm" | "md" | "lg" | "xl"
  showLabel?: boolean
  animate?: boolean
}

const SIZE_CONFIG = {
  sm: { wrapper: "w-8 h-8", icon: "w-4 h-4", text: "text-xs", label: "text-xs" },
  md: { wrapper: "w-12 h-12", icon: "w-6 h-6", text: "text-sm", label: "text-sm" },
  lg: { wrapper: "w-16 h-16", icon: "w-8 h-8", text: "text-base", label: "text-base" },
  xl: { wrapper: "w-24 h-24", icon: "w-12 h-12", text: "text-lg", label: "text-lg" },
} as const

export function LevelBadge({
  level,
  className,
  size = "md",
  showLabel = false,
  animate = true,
}: LevelBadgeProps) {
  const tier = getTierForLevel(level)
  const Icon = tier.icon
  const sizing = SIZE_CONFIG[size]

  return (
    <div className={cn("flex flex-col items-center gap-2", className)}>
      <motion.div
        className="relative"
        initial={animate ? { scale: 0, rotate: -180 } : {}}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 200, damping: 15 }}
      >
        {/* Badge disc */}
        <motion.div
          className={cn(
            "rounded-full flex items-center justify-center relative overflow-hidden",
            `bg-gradient-to-br ${tier.gradient}`,
            sizing.wrapper,
          )}
          whileHover={animate ? { scale: 1.1, rotate: 5 } : {}}
        >
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

          <Icon className={cn("text-white relative z-10", sizing.icon)} aria-hidden="true" />

          {/* Shimmer */}
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

        {/* Level number chip */}
        <motion.div
          className="absolute -bottom-1 -right-1 bg-zinc-900 border-2 border-zinc-800 rounded-full min-w-6 h-6 flex items-center justify-center px-1"
          initial={animate ? { scale: 0 } : {}}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring" }}
        >
          <span className={cn("font-bold text-white tabular-nums", sizing.text)}>{level}</span>
        </motion.div>

        {/* Glow */}
        <div
          className={cn(
            "absolute inset-0 rounded-full blur-lg -z-10 opacity-50",
            `bg-gradient-to-br ${tier.gradient}`,
          )}
          aria-hidden="true"
        />
      </motion.div>

      {showLabel && (
        <motion.span
          className={cn("font-semibold text-zinc-300 inline-flex items-center gap-1", sizing.label)}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <span aria-hidden="true">{tier.emoji}</span>
          {tier.name}
        </motion.span>
      )}
    </div>
  )
}

/* ==========================================================================
   LEVEL UP ANIMATION
   ========================================================================== */

interface LevelUpAnimationProps {
  fromLevel: number
  toLevel: number
  onComplete?: () => void
}

export function LevelUpAnimation({ fromLevel, toLevel, onComplete }: LevelUpAnimationProps) {
  const newTier = getTierForLevel(toLevel)

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onComplete}
    >
      <ConfettiParticles />

      <motion.div
        className="text-center"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 15 }}
      >
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

        <motion.div
          className="mb-6"
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: 0.4, type: "spring", stiffness: 150 }}
        >
          <LevelBadge level={toLevel} size="xl" showLabel animate={false} />
        </motion.div>

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
            aria-hidden="true"
          >
            →
          </motion.span>
          <span className={`bg-gradient-to-r ${newTier.gradient} bg-clip-text text-transparent`}>
            {toLevel}
          </span>
        </motion.div>

        <motion.p
          className="mt-4 text-xl text-zinc-300"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
        >
          Tu es maintenant <span className="font-bold text-white">{newTier.emoji} {newTier.name}</span> !
        </motion.p>

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
            y: [0, typeof window !== "undefined" ? window.innerHeight + 50 : 1000],
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
   LEVEL PROGRESS RING
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
  const tier = getTierForLevel(level)
  const Icon = tier.icon

  const xpInCurrentLevel = currentXP % 100
  const percentage = (xpInCurrentLevel / 100) * 100

  const strokeWidth = 8
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (percentage / 100) * circumference

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-zinc-800"
        />

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

        <defs>
          <linearGradient id="levelGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#00d4ff" />
            <stop offset="50%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#ec4899" />
          </linearGradient>
        </defs>
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${tier.gradient} flex items-center justify-center mb-1`}>
          <Icon className="w-5 h-5 text-white" aria-hidden="true" />
        </div>
        <span className="text-2xl font-black text-white tabular-nums">{level}</span>
        <span className="text-xs text-zinc-500 tabular-nums">{xpInCurrentLevel}/{100} XP</span>
      </div>
    </div>
  )
}

/* ==========================================================================
   LEVEL MILESTONES
   ========================================================================== */

interface LevelMilestonesProps {
  currentLevel: number
  className?: string
}

export function LevelMilestones({ currentLevel, className }: LevelMilestonesProps) {
  return (
    <div className={cn("flex items-center gap-1", className)}>
      {TIERS.map((tier, index) => {
        const isReached = currentLevel >= tier.minLevel
        const Icon = tier.icon

        return (
          <motion.div
            key={tier.id}
            className="relative"
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.1 }}
          >
            {index < TIERS.length - 1 && (
              <div
                className={cn(
                  "absolute top-1/2 left-full w-3 h-0.5 -translate-y-1/2",
                  isReached
                    ? "bg-gradient-to-r from-cyan-500 to-blue-500"
                    : "bg-zinc-800",
                )}
              />
            )}

            <motion.div
              className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center",
                isReached
                  ? `bg-gradient-to-br ${tier.gradient}`
                  : "bg-zinc-800 border border-zinc-700",
              )}
              whileHover={{ scale: 1.2 }}
              title={`${tier.name} (Lv ${tier.minLevel}+)`}
            >
              <Icon
                className={cn("w-4 h-4", isReached ? "text-white" : "text-zinc-600")}
                aria-hidden="true"
              />
            </motion.div>

            <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs text-zinc-500 whitespace-nowrap tabular-nums">
              {tier.minLevel}
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}
