'use server'

/**
 * TEENS PARTY MOROCCO - Payments Domain Schema
 * =============================================
 *
 * Schemas Zod pour les paiements Stripe.
 */

import { z } from 'zod'

/* ==========================================================================
   SCHEMAS
   ========================================================================== */

export const bookingIdSchema = z.object({
  bookingId: z.string().uuid('ID de réservation invalide'),
})

export const sessionIdSchema = z.object({
  sessionId: z.string().min(1, 'ID de session requis'),
})

/* ==========================================================================
   TYPES
   ========================================================================== */

export type BookingIdInput = z.infer<typeof bookingIdSchema>
export type SessionIdInput = z.infer<typeof sessionIdSchema>

export type ActionResult<T = unknown> =
  | { success: true; data: T }
  | { success: false; error: string }
