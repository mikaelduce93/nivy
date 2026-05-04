/**
 * TEENS PARTY MOROCCO - Anniversaires Domain Schemas
 * ==================================================
 *
 * Schémas Zod pour la validation des commandes anniversaires.
 */

import { z } from 'zod'

/* ==========================================================================
   ENUMS & CONSTANTS
   ========================================================================== */

export const AnnivOrderTypeEnum = z.enum(['event', 'custom'])
export type AnnivOrderType = z.infer<typeof AnnivOrderTypeEnum>

export const PaymentStatusEnum = z.enum(['pending', 'deposit', 'paid', 'refunded'])
export type PaymentStatus = z.infer<typeof PaymentStatusEnum>

export const OrderStatusEnum = z.enum(['pending', 'confirmed', 'cancelled', 'completed'])
export type OrderStatus = z.infer<typeof OrderStatusEnum>

/* ==========================================================================
   BASE SCHEMAS
   ========================================================================== */

/**
 * Phone validation (Moroccan format)
 */
export const phoneSchema = z
  .string()
  .regex(
    /^(\+212|0)[5-7]\d{8}$/,
    'Format de téléphone invalide (ex: 0612345678)'
  )

/**
 * Date validation (future date)
 */
export const futureDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Format de date invalide (YYYY-MM-DD)')
  .refine(
    (date) => new Date(date) > new Date(),
    { message: 'La date doit être dans le futur' }
  )

/**
 * Time validation (HH:MM format)
 */
export const timeSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Format d\'heure invalide (HH:MM)')
  .optional()

/* ==========================================================================
   INPUT SCHEMAS
   ========================================================================== */

/**
 * Schéma de création d'une commande anniversaire
 */
export const createAnnivOrderSchema = z
  .object({
    teen_id: z.string().uuid('ID adolescent invalide'),

    pack_id: z.string().uuid('ID pack invalide'),

    order_type: AnnivOrderTypeEnum,

    // Pour type 'event'
    event_id: z.string().uuid('ID événement invalide').optional(),

    // Pour type 'custom'
    venue_id: z.string().uuid('ID lieu invalide').optional(),

    // Date & heure
    celebration_date: futureDateSchema,
    celebration_time: timeSchema,

    // Invités
    guest_count: z
      .number()
      .int('Le nombre d\'invités doit être un entier')
      .min(1, 'Au moins 1 invité requis')
      .max(100, 'Maximum 100 invités'),

    guest_names: z
      .array(z.string().min(2, 'Nom trop court'))
      .optional()
      .default([]),

    // Personnalisation
    theme: z.string().max(100, 'Thème trop long').optional(),

    selected_extras: z
      .array(z.string().uuid('ID extra invalide'))
      .optional()
      .default([]),

    special_requests: z
      .string()
      .max(1000, 'Demandes spéciales trop longues')
      .optional(),

    allergies_notes: z
      .string()
      .max(500, 'Notes allergies trop longues')
      .optional(),

    custom_message_dj: z
      .string()
      .max(500, 'Message DJ trop long')
      .optional(),

    // Contact
    contact_phone: phoneSchema,
  })
  .refine(
    (data) => {
      if (data.order_type === 'event') {
        return !!data.event_id
      }
      return true
    },
    { message: 'event_id requis pour type event', path: ['event_id'] }
  )
  .refine(
    (data) => {
      if (data.order_type === 'custom') {
        return !!data.venue_id
      }
      return true
    },
    { message: 'venue_id requis pour type custom', path: ['venue_id'] }
  )

export type CreateAnnivOrderInput = z.input<typeof createAnnivOrderSchema>

/**
 * Schéma pour calculer le prix
 */
export const calculatePriceSchema = z.object({
  pack_id: z.string().uuid('ID pack invalide'),
  guest_count: z
    .number()
    .int()
    .min(1, 'Au moins 1 invité requis'),
  selected_extras: z
    .array(z.string().uuid('ID extra invalide'))
    .optional()
    .default([]),
})

export type CalculatePriceInput = z.infer<typeof calculatePriceSchema>

/**
 * Schéma pour annuler une commande
 */
export const cancelOrderSchema = z.object({
  orderId: z.string().uuid('ID commande invalide'),
  reason: z
    .string()
    .min(5, 'Raison trop courte')
    .max(500, 'Raison trop longue'),
})

export type CancelOrderInput = z.infer<typeof cancelOrderSchema>

/**
 * Schéma pour mettre à jour le statut de paiement
 */
export const updatePaymentStatusSchema = z.object({
  orderId: z.string().uuid('ID commande invalide'),
  paymentStatus: PaymentStatusEnum,
  depositAmount: z.number().nonnegative('Montant invalide').optional(),
})

export type UpdatePaymentStatusInput = z.infer<typeof updatePaymentStatusSchema>

/**
 * Schéma pour récupérer les packs par type
 */
export const getPacksSchema = z.object({
  type: AnnivOrderTypeEnum.optional(),
})

export type GetPacksInput = z.infer<typeof getPacksSchema>

/**
 * Schéma pour récupérer les lieux partenaires
 */
export const getVenuesSchema = z.object({
  city: z.string().max(100, 'Ville trop longue').optional(),
})

export type GetVenuesInput = z.infer<typeof getVenuesSchema>

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
 * Type Pack anniversaire
 */
export type AnnivPack = {
  id: string
  name: string
  pack_type: 'event' | 'custom'
  description: string | null
  includes: string[]
  base_price: number
  included_guests: number
  additional_guest_price: number
  display_order: number
  is_active: boolean
}

/**
 * Type Extra anniversaire
 */
export type AnnivExtra = {
  id: string
  name: string
  description: string | null
  category: string
  price: number
  is_active: boolean
}

/**
 * Type Calcul de prix
 */
export type PriceCalculation = {
  pack_price: number
  extra_guests: number
  extra_guests_price: number
  extras_total_price: number
  subtotal: number
  discount_amount: number
  total_price: number
}

/**
 * Type Commande anniversaire
 */
export type AnnivOrder = {
  id: string
  booking_reference: string
  parent_id: string
  teen_id: string
  pack_id: string
  order_type: AnnivOrderType
  event_id: string | null
  venue_id: string | null
  celebration_date: string
  celebration_time: string | null
  guest_count: number
  guest_names: string[]
  theme: string | null
  selected_extras: string[]
  special_requests: string | null
  allergies_notes: string | null
  custom_message_dj: string | null
  contact_phone: string
  pack_price: number
  extra_guests_price: number
  extras_total_price: number
  subtotal: number
  discount_amount: number
  total_price: number
  status: OrderStatus
  payment_status: PaymentStatus
  deposit_amount: number | null
  qr_code: string | null
  cancelled_reason: string | null
  cancelled_at: string | null
  confirmed_at: string | null
  created_at: string
  updated_at: string
}
