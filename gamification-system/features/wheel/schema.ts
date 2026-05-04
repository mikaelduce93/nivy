/**
 * TEENS PARTY MOROCCO - Fortune Wheel Schema
 * ==========================================
 *
 * Définitions Zod et types TypeScript pour la Roue de la Fortune.
 */

import { z } from "zod"

/* ==========================================================================
   ENUMS
   ========================================================================== */

export const WheelRewardTypeEnum = z.enum([
  "xp",
  "xp_multiplier",
  "shop_discount",
  "free_spin",
  "badge",
  "mystery_box",
  "nothing",
  "jackpot",
])
export type WheelRewardType = z.infer<typeof WheelRewardTypeEnum>

export const SpinTypeEnum = z.enum(["daily", "bonus", "purchased", "reward"])
export type SpinType = z.infer<typeof SpinTypeEnum>

/* ==========================================================================
   CONFIGURATION
   ========================================================================== */

export const WHEEL_REWARD_CONFIG: Record<
  WheelRewardType,
  {
    label: string
    icon: string
    color: string
    bgColor: string
    celebrationLevel: "low" | "medium" | "high" | "jackpot"
  }
> = {
  xp: {
    label: "XP",
    icon: "zap",
    color: "text-green-400",
    bgColor: "bg-green-500",
    celebrationLevel: "medium",
  },
  xp_multiplier: {
    label: "Multiplicateur",
    icon: "trending-up",
    color: "text-yellow-400",
    bgColor: "bg-yellow-500",
    celebrationLevel: "high",
  },
  shop_discount: {
    label: "Réduction",
    icon: "percent",
    color: "text-cyan-400",
    bgColor: "bg-cyan-500",
    celebrationLevel: "medium",
  },
  free_spin: {
    label: "Spin Bonus",
    icon: "rotate-cw",
    color: "text-pink-400",
    bgColor: "bg-pink-500",
    celebrationLevel: "high",
  },
  badge: {
    label: "Badge",
    icon: "award",
    color: "text-purple-400",
    bgColor: "bg-purple-500",
    celebrationLevel: "high",
  },
  mystery_box: {
    label: "Mystery Box",
    icon: "box",
    color: "text-violet-400",
    bgColor: "bg-violet-500",
    celebrationLevel: "high",
  },
  nothing: {
    label: "Rien",
    icon: "x",
    color: "text-zinc-400",
    bgColor: "bg-zinc-600",
    celebrationLevel: "low",
  },
  jackpot: {
    label: "JACKPOT",
    icon: "crown",
    color: "text-yellow-400",
    bgColor: "bg-gradient-to-r from-yellow-500 to-orange-500",
    celebrationLevel: "jackpot",
  },
}

/* ==========================================================================
   WHEEL SEGMENT SCHEMA
   ========================================================================== */

export const WheelSegmentSchema = z.object({
  id: z.string().uuid(),
  segment_index: z.number(),
  name: z.string(),
  description: z.string().nullable(),
  color: z.string(),
  icon: z.string(),
  reward_type: WheelRewardTypeEnum,
  reward_value: z.record(z.unknown()),
  probability: z.number(),
})

export type WheelSegment = z.infer<typeof WheelSegmentSchema>

/* ==========================================================================
   SPIN RESULT SCHEMA
   ========================================================================== */

export const SpinResultSchema = z.object({
  success: z.boolean(),
  error: z.string().optional(),
  spin_id: z.string().uuid().optional(),
  segment_index: z.number().optional(),
  segment_name: z.string().optional(),
  segment_color: z.string().optional(),
  segment_icon: z.string().optional(),
  reward_type: WheelRewardTypeEnum.optional(),
  reward_value: z.record(z.unknown()).optional(),
  xp_earned: z.number().optional(),
  current_streak: z.number().optional(),
  streak_multiplier: z.number().optional(),
})

export type SpinResult = z.infer<typeof SpinResultSchema>

/* ==========================================================================
   CAN SPIN SCHEMA
   ========================================================================== */

export const CanSpinSchema = z.object({
  can_spin_daily: z.boolean(),
  bonus_spins: z.number(),
  current_streak: z.number(),
  streak_multiplier: z.number(),
  next_spin_at: z.string().datetime().nullable(),
})

export type CanSpin = z.infer<typeof CanSpinSchema>

/* ==========================================================================
   WHEEL STATS SCHEMA
   ========================================================================== */

export const WheelStatsSchema = z.object({
  total_spins: z.number(),
  total_xp_earned: z.number(),
  jackpots_won: z.number(),
  best_reward: z
    .object({
      reward_type: WheelRewardTypeEnum,
      xp_earned: z.number(),
      date: z.string().datetime(),
    })
    .nullable(),
  current_streak: z.number(),
  best_streak: z.number(),
  streak_multiplier: z.number(),
  current_jackpot: z.number(),
})

export type WheelStats = z.infer<typeof WheelStatsSchema>

/* ==========================================================================
   SPIN HISTORY SCHEMA
   ========================================================================== */

export const SpinHistoryEntrySchema = z.object({
  spin_id: z.string().uuid(),
  segment_name: z.string(),
  segment_color: z.string(),
  segment_icon: z.string(),
  reward_type: WheelRewardTypeEnum,
  reward_value: z.record(z.unknown()),
  xp_earned: z.number(),
  spin_type: SpinTypeEnum,
  spun_at: z.string().datetime(),
})

export type SpinHistoryEntry = z.infer<typeof SpinHistoryEntrySchema>

/* ==========================================================================
   HELPER FUNCTIONS
   ========================================================================== */

/**
 * Calcule le temps restant avant le prochain spin
 */
export function getTimeUntilNextSpin(nextSpinAt: string | null): string | null {
  if (!nextSpinAt) return null

  const now = new Date()
  const next = new Date(nextSpinAt)
  const diff = next.getTime() - now.getTime()

  if (diff <= 0) return null

  const hours = Math.floor(diff / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m`
}

/**
 * Formate la récompense pour l'affichage
 */
export function formatWheelReward(
  type: WheelRewardType,
  value: Record<string, unknown>
): string {
  switch (type) {
    case "xp":
      return `+${value.amount} XP`
    case "xp_multiplier":
      return `×${value.multiplier} XP (${value.duration_minutes}min)`
    case "shop_discount":
      return `-${value.percent}% Boutique`
    case "free_spin":
      return `+${value.spins} Spin${(value.spins as number) > 1 ? "s" : ""}`
    case "mystery_box":
      return `Mystery Box ${value.tier}`
    case "jackpot":
      if (value.jackpot_won) {
        return `JACKPOT: ${value.amount} XP!`
      }
      return `${value.consolation_xp} XP (consolation)`
    case "nothing":
      return "Pas de chance..."
    default:
      return "Récompense"
  }
}

/**
 * Génère les angles pour chaque segment de la roue
 */
export function generateSegmentAngles(
  segmentCount: number
): Array<{ start: number; end: number; middle: number }> {
  const anglePerSegment = 360 / segmentCount
  const angles: Array<{ start: number; end: number; middle: number }> = []

  for (let i = 0; i < segmentCount; i++) {
    const start = i * anglePerSegment
    const end = (i + 1) * anglePerSegment
    const middle = start + anglePerSegment / 2
    angles.push({ start, end, middle })
  }

  return angles
}

/**
 * Calcule l'angle de rotation pour atterrir sur un segment
 */
export function calculateSpinAngle(
  targetSegmentIndex: number,
  segmentCount: number,
  minRotations: number = 5
): number {
  const anglePerSegment = 360 / segmentCount
  // On veut que la flèche pointe vers le milieu du segment
  // La roue tourne dans le sens horaire, donc on inverse
  const targetAngle = 360 - (targetSegmentIndex * anglePerSegment + anglePerSegment / 2)
  // Ajouter plusieurs rotations complètes + un petit décalage aléatoire
  const randomOffset = (Math.random() - 0.5) * (anglePerSegment * 0.5)
  return minRotations * 360 + targetAngle + randomOffset
}

/**
 * Calcule le bonus de streak
 */
export function getStreakBonus(streak: number): {
  multiplier: number
  nextMilestone: number
  bonusPercent: number
} {
  // +5% par jour de streak, max 100% (×2)
  const multiplier = Math.min(2.0, 1.0 + streak * 0.05)
  const bonusPercent = Math.round((multiplier - 1) * 100)

  // Prochains paliers: 7, 14, 21, 30 jours
  const milestones = [7, 14, 21, 30]
  const nextMilestone = milestones.find((m) => m > streak) || 30

  return { multiplier, nextMilestone, bonusPercent }
}

/**
 * Détermine le niveau de célébration pour une récompense
 */
export function getCelebrationLevel(
  type: WheelRewardType,
  xpEarned: number
): "low" | "medium" | "high" | "jackpot" {
  if (type === "jackpot") return "jackpot"
  if (type === "nothing") return "low"
  if (xpEarned >= 500) return "high"
  if (xpEarned >= 200) return "medium"
  return WHEEL_REWARD_CONFIG[type].celebrationLevel
}
