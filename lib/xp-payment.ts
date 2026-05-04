/**
 * XP Payment System Utilities
 * ==========================
 * Configuration and helpers for hybrid XP + DH payment
 */

// Conversion rate: 100 XP = 1 DH
export const XP_TO_DH_RATE = 100

// Maximum percentage of payment that can be covered by XP
export const MAX_XP_PAYMENT_PERCENTAGE = 0.5 // 50% max

// Minimum XP required to use XP payment
export const MIN_XP_FOR_PAYMENT = 500 // 5 DH equivalent

/**
 * Convert XP to DH value
 */
export function xpToDH(xp: number): number {
  return Math.floor(xp / XP_TO_DH_RATE)
}

/**
 * Convert DH to XP required
 */
export function dhToXP(dh: number): number {
  return dh * XP_TO_DH_RATE
}

/**
 * Calculate maximum XP that can be used for a given price
 */
export function calculateMaxXPUsable(totalPrice: number, availableXP: number): number {
  // Max XP based on price limit (50% of total)
  const maxXPByPercentage = dhToXP(Math.floor(totalPrice * MAX_XP_PAYMENT_PERCENTAGE))

  // Return the minimum of what's allowed and what's available
  return Math.min(maxXPByPercentage, availableXP)
}

/**
 * Calculate payment breakdown
 */
export function calculateHybridPayment(
  totalPrice: number,
  xpToUse: number,
  availableXP: number
): {
  xpAmount: number
  xpValue: number
  dhAmount: number
  totalPrice: number
  isValid: boolean
  errorMessage?: string
} {
  // Validate XP amount
  if (xpToUse < 0) {
    return {
      xpAmount: 0,
      xpValue: 0,
      dhAmount: totalPrice,
      totalPrice,
      isValid: false,
      errorMessage: "Le montant XP ne peut pas être négatif"
    }
  }

  if (xpToUse > availableXP) {
    return {
      xpAmount: 0,
      xpValue: 0,
      dhAmount: totalPrice,
      totalPrice,
      isValid: false,
      errorMessage: "Vous n'avez pas assez de XP"
    }
  }

  const maxUsable = calculateMaxXPUsable(totalPrice, availableXP)
  if (xpToUse > maxUsable) {
    return {
      xpAmount: maxUsable,
      xpValue: xpToDH(maxUsable),
      dhAmount: totalPrice - xpToDH(maxUsable),
      totalPrice,
      isValid: false,
      errorMessage: `Maximum ${maxUsable} XP utilisables (50% du total)`
    }
  }

  const xpValue = xpToDH(xpToUse)
  const dhAmount = totalPrice - xpValue

  return {
    xpAmount: xpToUse,
    xpValue,
    dhAmount,
    totalPrice,
    isValid: true
  }
}

/**
 * Format XP amount for display
 */
export function formatXP(xp: number): string {
  if (xp >= 1000000) {
    return `${(xp / 1000000).toFixed(1)}M`
  }
  if (xp >= 1000) {
    return `${(xp / 1000).toFixed(1)}K`
  }
  return xp.toString()
}

/**
 * Get XP tier based on amount
 */
export function getXPTier(xp: number): {
  name: string
  color: string
  minXP: number
} {
  if (xp >= 50000) return { name: "Légende", color: "text-amber-400", minXP: 50000 }
  if (xp >= 25000) return { name: "Maître", color: "text-purple-400", minXP: 25000 }
  if (xp >= 10000) return { name: "Expert", color: "text-cyan-400", minXP: 10000 }
  if (xp >= 5000) return { name: "Avancé", color: "text-emerald-400", minXP: 5000 }
  if (xp >= 1000) return { name: "Confirmé", color: "text-blue-400", minXP: 1000 }
  return { name: "Débutant", color: "text-zinc-400", minXP: 0 }
}
