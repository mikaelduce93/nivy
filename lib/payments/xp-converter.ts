/**
 * XP to DH Converter
 * ==================
 * Conversion utilities for hybrid XP + DH payments
 *
 * Conversion rate: 1 XP = 0.10 DH (10 XP = 1 DH)
 */

// Conversion rate: 1 XP = 0.10 DH
export const XP_TO_DH_RATE = 0.10

// Threshold for parental approval (in XP)
export const PARENTAL_APPROVAL_THRESHOLD_XP = 1000 // 100 DH equivalent

// Minimum XP to use in a payment
export const MIN_XP_FOR_PAYMENT = 50 // 5 DH equivalent

/**
 * Convert XP amount to DH
 * @param xpAmount - Amount in XP
 * @returns Amount in DH (rounded to 2 decimals)
 */
export function convertXPToDH(xpAmount: number): number {
  if (xpAmount < 0) return 0
  return Math.round(xpAmount * XP_TO_DH_RATE * 100) / 100
}

/**
 * Convert DH amount to XP
 * @param dhAmount - Amount in DH
 * @returns Amount in XP (whole number)
 */
export function convertDHToXP(dhAmount: number): number {
  if (dhAmount < 0) return 0
  return Math.floor(dhAmount / XP_TO_DH_RATE)
}

/**
 * Calculate hybrid payment breakdown
 * @param totalPrice - Total price in DH
 * @param xpToUse - XP amount to use
 * @param availableXP - User's available XP balance
 * @returns Payment breakdown with validation
 */
export function calculateHybridPayment(
  totalPrice: number,
  xpToUse: number,
  availableXP: number
): HybridPaymentResult {
  // Validate inputs
  if (totalPrice <= 0) {
    return {
      isValid: false,
      errorCode: 'INVALID_PRICE',
      errorMessage: 'Le prix total doit être supérieur à 0',
      xpAmount: 0,
      xpValueDH: 0,
      cashAmountDH: totalPrice,
      totalPriceDH: totalPrice,
      savings: 0,
      requiresParentalApproval: false,
    }
  }

  if (xpToUse < 0) {
    return {
      isValid: false,
      errorCode: 'INVALID_XP',
      errorMessage: 'Le montant XP ne peut pas être négatif',
      xpAmount: 0,
      xpValueDH: 0,
      cashAmountDH: totalPrice,
      totalPriceDH: totalPrice,
      savings: 0,
      requiresParentalApproval: false,
    }
  }

  // Check if user has enough XP
  if (xpToUse > availableXP) {
    return {
      isValid: false,
      errorCode: 'INSUFFICIENT_XP',
      errorMessage: `Solde XP insuffisant. Vous avez ${availableXP} XP, mais vous essayez d'en utiliser ${xpToUse}`,
      xpAmount: 0,
      xpValueDH: 0,
      cashAmountDH: totalPrice,
      totalPriceDH: totalPrice,
      savings: 0,
      requiresParentalApproval: false,
    }
  }

  // Check minimum XP requirement
  if (xpToUse > 0 && xpToUse < MIN_XP_FOR_PAYMENT) {
    return {
      isValid: false,
      errorCode: 'MIN_XP_NOT_MET',
      errorMessage: `Minimum ${MIN_XP_FOR_PAYMENT} XP requis pour utiliser vos XP`,
      xpAmount: 0,
      xpValueDH: 0,
      cashAmountDH: totalPrice,
      totalPriceDH: totalPrice,
      savings: 0,
      requiresParentalApproval: false,
    }
  }

  // Calculate XP value in DH
  const xpValueDH = convertXPToDH(xpToUse)

  // Check if XP covers more than the total price
  const effectiveXpValue = Math.min(xpValueDH, totalPrice)
  const effectiveXpUsed = convertDHToXP(effectiveXpValue)

  // Calculate remaining cash amount
  const cashAmountDH = Math.max(0, totalPrice - effectiveXpValue)

  // Check if parental approval is required
  const requiresParentalApproval = xpToUse >= PARENTAL_APPROVAL_THRESHOLD_XP

  return {
    isValid: true,
    xpAmount: effectiveXpUsed,
    xpValueDH: effectiveXpValue,
    cashAmountDH: Math.round(cashAmountDH * 100) / 100,
    totalPriceDH: totalPrice,
    savings: effectiveXpValue,
    requiresParentalApproval,
  }
}

/**
 * Calculate maximum XP that can be used for a given price
 * @param totalPrice - Total price in DH
 * @param availableXP - User's available XP balance
 * @returns Maximum XP usable
 */
export function calculateMaxXPUsable(totalPrice: number, availableXP: number): number {
  // Convert total price to XP equivalent
  const maxXPByPrice = convertDHToXP(totalPrice)

  // Return the minimum of what the price allows and what's available
  return Math.min(maxXPByPrice, availableXP)
}

/**
 * Get preset XP percentage options for UI
 * @param totalPrice - Total price in DH
 * @param availableXP - User's available XP balance
 * @returns Array of preset options
 */
export function getXPPresetOptions(
  totalPrice: number,
  availableXP: number
): XPPresetOption[] {
  const maxUsable = calculateMaxXPUsable(totalPrice, availableXP)

  const presets: XPPresetOption[] = [
    { percentage: 0, label: '0%', xpAmount: 0, dhValue: 0 },
  ]

  // Only add options if there's XP available
  if (maxUsable >= MIN_XP_FOR_PAYMENT) {
    const percentages = [25, 50, 75, 100]

    for (const pct of percentages) {
      const xpAmount = Math.floor((maxUsable * pct) / 100)
      if (xpAmount >= MIN_XP_FOR_PAYMENT || pct === 100) {
        presets.push({
          percentage: pct,
          label: `${pct}%`,
          xpAmount,
          dhValue: convertXPToDH(xpAmount),
        })
      }
    }
  }

  return presets
}

/**
 * Format XP amount for display
 * @param xp - XP amount
 * @returns Formatted string
 */
export function formatXP(xp: number): string {
  if (xp >= 1000000) {
    return `${(xp / 1000000).toFixed(1)}M XP`
  }
  if (xp >= 1000) {
    return `${(xp / 1000).toFixed(1)}K XP`
  }
  return `${xp} XP`
}

/**
 * Format DH amount for display
 * @param dh - DH amount
 * @returns Formatted string
 */
export function formatDH(dh: number): string {
  return `${dh.toFixed(2)} DH`
}

// Types
export interface HybridPaymentResult {
  isValid: boolean
  errorCode?: string
  errorMessage?: string
  xpAmount: number
  xpValueDH: number
  cashAmountDH: number
  totalPriceDH: number
  savings: number
  requiresParentalApproval: boolean
}

export interface XPPresetOption {
  percentage: number
  label: string
  xpAmount: number
  dhValue: number
}
