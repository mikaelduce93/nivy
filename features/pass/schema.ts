/**
 * TEENS PARTY MOROCCO - Pass VIP Domain Schemas
 * =============================================
 *
 * Schémas Zod pour la validation du système Pass VIP.
 */

import { z } from 'zod'

/* ==========================================================================
   ENUMS & CONSTANTS
   ========================================================================== */

export const VIPTierEnum = z.enum(['standard', 'gold', 'platinum'])
export type VIPTier = z.infer<typeof VIPTierEnum>

export const PassStatusEnum = z.enum(['active', 'suspended', 'expired'])
export type PassStatus = z.infer<typeof PassStatusEnum>

export const UsageTypeEnum = z.enum([
  'event',
  'club',
  'partner_discount',
  'priority_booking',
])
export type UsageType = z.infer<typeof UsageTypeEnum>

export const ItemTypeEnum = z.enum(['event', 'club', 'anniv'])
export type ItemType = z.infer<typeof ItemTypeEnum>

/* ==========================================================================
   PASS TIER CONFIGURATION
   ========================================================================== */

export type PassBenefit = {
  type: string
  value: string
}

export type PassTierConfig = {
  price: number
  discount_percentage: number
  monthly_events_included: number
  monthly_clubs_included: number
  partner_discount_percentage: number
  priority_booking_hours: number
  benefits: PassBenefit[]
}

export const PASS_TIERS: Record<VIPTier, PassTierConfig> = {
  standard: {
    price: 0,
    discount_percentage: 0,
    monthly_events_included: 0,
    monthly_clubs_included: 0,
    partner_discount_percentage: 0,
    priority_booking_hours: 24,
    benefits: [
      { type: 'points', value: '1 point par 10dh dépensés' },
      { type: 'discount', value: '-10% sur anniversaires' },
      { type: 'priority', value: 'Accès préventes 24h avant' },
      { type: 'badge', value: 'Badge profil Silver' },
    ],
  },
  gold: {
    price: 299,
    discount_percentage: 20,
    monthly_events_included: 1,
    monthly_clubs_included: 0,
    partner_discount_percentage: 10,
    priority_booking_hours: 48,
    benefits: [
      { type: 'points', value: '2 points par 10dh dépensés' },
      { type: 'discount', value: '-20% sur tous événements' },
      { type: 'discount', value: '-15% sur clubs' },
      { type: 'discount', value: '-10% chez partenaires' },
      { type: 'free', value: '1 invité gratuit par mois' },
      { type: 'priority', value: 'Accès préventes 48h avant' },
      { type: 'badge', value: 'Badge profil Gold' },
      { type: 'gift', value: 'Cadeaux d\'anniversaire' },
    ],
  },
  platinum: {
    price: 599,
    discount_percentage: 30,
    monthly_events_included: 5,
    monthly_clubs_included: 2,
    partner_discount_percentage: 20,
    priority_booking_hours: 72,
    benefits: [
      { type: 'points', value: '3 points par 10dh dépensés' },
      { type: 'discount', value: '-30% sur tous événements' },
      { type: 'discount', value: '-25% sur clubs' },
      { type: 'discount', value: '-20% chez partenaires' },
      { type: 'vip', value: 'Accès VIP systématique' },
      { type: 'free', value: '5 invités offerts anniversaire' },
      { type: 'concierge', value: 'Conciergerie dédiée 24/7' },
      { type: 'priority', value: 'Accès préventes 72h avant' },
      { type: 'badge', value: 'Badge profil Platinum' },
      { type: 'exclusive', value: 'Expériences VIP exclusives' },
      { type: 'meet', value: 'Meet & Greet artistes' },
      { type: 'merch', value: 'Merch exclusif' },
    ],
  },
}

/* ==========================================================================
   INPUT SCHEMAS
   ========================================================================== */

/**
 * Schéma pour vérifier si un utilisateur a un Pass actif
 */
export const hasActivePassSchema = z.object({
  userId: z.string().uuid('ID utilisateur invalide').optional(),
})

export type HasActivePassInput = z.infer<typeof hasActivePassSchema>

/**
 * Schéma pour récupérer le tier Pass
 */
export const getUserPassTierSchema = z.object({
  userId: z.string().uuid('ID utilisateur invalide').optional(),
})

export type GetUserPassTierInput = z.infer<typeof getUserPassTierSchema>

/**
 * Schéma pour souscrire à un Pass
 */
export const subscribePassSchema = z.object({
  tier: VIPTierEnum,
  duration_months: z
    .number()
    .int()
    .min(1, 'Durée minimum: 1 mois')
    .max(24, 'Durée maximum: 24 mois')
    .optional()
    .default(12),
})

export type SubscribePassInput = z.infer<typeof subscribePassSchema>

/**
 * Schéma pour confirmer la souscription
 */
export const confirmSubscriptionSchema = z.object({
  sessionId: z.string().min(10, 'Session ID invalide'),
})

export type ConfirmSubscriptionInput = z.infer<typeof confirmSubscriptionSchema>

/**
 * Schéma pour annuler un Pass
 */
export const cancelPassSchema = z.object({
  reason: z
    .string()
    .max(500, 'Raison trop longue')
    .optional(),
})

export type CancelPassInput = z.infer<typeof cancelPassSchema>

/**
 * Schéma pour calculer le prix avec Pass
 */
export const calculatePriceWithPassSchema = z.object({
  basePrice: z.number().nonnegative('Prix invalide'),
  userId: z.string().uuid('ID utilisateur invalide').optional(),
  itemType: ItemTypeEnum.optional().default('event'),
})

export type CalculatePriceWithPassInput = z.infer<typeof calculatePriceWithPassSchema>

/**
 * Schéma pour calculer les économies
 */
export const calculateSavingsSchema = z.object({
  tier: VIPTierEnum,
  eventsPerMonth: z.number().int().min(0).max(30),
  clubsPerMonth: z.number().int().min(0).max(30),
  avgEventPrice: z.number().nonnegative().optional().default(150),
  avgClubPrice: z.number().nonnegative().optional().default(200),
})

export type CalculateSavingsInput = z.infer<typeof calculateSavingsSchema>

/**
 * Schéma pour tracker l'utilisation
 */
export const trackUsageSchema = z.object({
  usageType: UsageTypeEnum,
  referenceType: z.string().max(50).optional(),
  referenceId: z.string().uuid().optional(),
  discountApplied: z.number().nonnegative().optional(),
})

export type TrackUsageInput = z.infer<typeof trackUsageSchema>

/* ==========================================================================
   OUTPUT TYPES
   ========================================================================== */

/**
 * Type de retour standard pour les actions
 */
export type ActionResult<T = unknown> =
  | { success: true; data: T }
  | { success: false; error: string }

/**
 * Type VIP Card
 */
export type VIPCard = {
  id: string
  profile_id: string
  card_type: VIPTier
  card_number: string
  issue_date: string
  expiry_date: string
  status: PassStatus
  discount_percentage: number
  monthly_events_included: number
  monthly_clubs_included: number
  partner_discount_percentage: number
  priority_booking_hours: number
  benefits: PassBenefit[]
  stripe_subscription_id: string | null
  auto_renew: boolean
  cancelled_at: string | null
  cancellation_reason: string | null
  created_at: string
  updated_at: string
}

/**
 * Type Résultat vérification Pass
 */
export type HasActivePassResult = {
  hasPass: boolean
  data?: VIPCard
}

/**
 * Type Tier actif
 */
export type UserPassTierResult = {
  tier: VIPTier | null
  data?: {
    card_type: VIPTier
    discount_percentage: number
    expiry_date: string
  }
}

/**
 * Type Calcul de prix avec Pass
 */
export type PriceWithPassResult = {
  originalPrice: number
  finalPrice: number
  discount: number
  discountPercentage?: number
  tier: VIPTier | null
}

/**
 * Type Calcul des économies
 */
export type PassSavingsResult = {
  tier: VIPTier
  monthlySpending: number
  monthlySavings: number
  yearlySavings: number
  passPrice: number
  netYearlySavings: number
  breakEvenMonths: number
}

/**
 * Type Souscription (avec Stripe)
 */
export type SubscriptionResult = {
  sessionId?: string
  url?: string | null
  data?: VIPCard
}

/**
 * Type Usage tracking
 */
export type VIPCardUsage = {
  id: string
  vip_card_id: string
  usage_type: UsageType
  reference_type: string | null
  reference_id: string | null
  discount_applied: number
  usage_date: string
  created_at: string
}
