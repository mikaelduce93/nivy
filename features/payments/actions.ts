'use server'

/**
 * TEENS PARTY MOROCCO - Payments Domain Actions
 * =============================================
 *
 * Server Actions pour les paiements Stripe.
 */

import { stripe } from '@/lib/stripe'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { bookingIdSchema, sessionIdSchema, type ActionResult } from './schema'

/* ==========================================================================
   HELPER: Get authenticated user
   ========================================================================== */

async function getAuthenticatedUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return { supabase, user }
}

/* ==========================================================================
   STRIPE CHECKOUT
   ========================================================================== */

/**
 * Crée une session Stripe Checkout pour une réservation
 */
export async function createBookingCheckoutSession(
  bookingId: string
): Promise<ActionResult<string>> {
  try {
    // Validate input
    const validation = bookingIdSchema.safeParse({ bookingId })
    if (!validation.success) {
      return { success: false, error: validation.error.errors[0].message }
    }

    const { supabase, user } = await getAuthenticatedUser()

    if (!user) {
      return { success: false, error: 'Non authentifié' }
    }

    // Fetch booking details
    const { data: booking, error } = await supabase
      .from('bookings')
      .select(`
        *,
        events (
          title,
          event_date,
          location
        )
      `)
      .eq('id', bookingId)
      .eq('parent_id', user.id)
      .single()

    if (error || !booking) {
      return { success: false, error: 'Réservation introuvable' }
    }

    if (booking.payment_status === 'paid') {
      return { success: false, error: 'Réservation déjà payée' }
    }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      ui_mode: 'embedded',
      redirect_on_completion: 'never',
      line_items: [
        {
          price_data: {
            currency: 'mad',
            product_data: {
              name: booking.events?.title || 'Événement',
              description: `${new Date(booking.events?.event_date).toLocaleDateString('fr-FR', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })} - ${booking.events?.location || 'Maroc'}`,
            },
            unit_amount: Math.round(booking.total_amount * 100),
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      metadata: {
        bookingId: booking.id,
        userId: user.id,
        type: 'event_booking',
      },
      customer_email: user.email,
    })

    return { success: true, data: session.client_secret! }
  } catch (error: any) {
    console.error('[payments/createBookingCheckoutSession] Error:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Vérifie le statut de paiement d'une réservation
 */
export async function verifyPaymentStatus(
  bookingId: string
): Promise<ActionResult<boolean>> {
  try {
    // Validate input
    const validation = bookingIdSchema.safeParse({ bookingId })
    if (!validation.success) {
      return { success: false, error: validation.error.errors[0].message }
    }

    const { supabase, user } = await getAuthenticatedUser()

    if (!user) {
      return { success: false, error: 'Non authentifié' }
    }

    const { data: booking } = await supabase
      .from('bookings')
      .select('payment_status')
      .eq('id', bookingId)
      .eq('parent_id', user.id)
      .single()

    return { success: true, data: booking?.payment_status === 'paid' }
  } catch (error: any) {
    console.error('[payments/verifyPaymentStatus] Error:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Gère le paiement réussi après webhook Stripe
 */
export async function handleSuccessfulPayment(
  sessionId: string
): Promise<ActionResult<null>> {
  try {
    // Validate input
    const validation = sessionIdSchema.safeParse({ sessionId })
    if (!validation.success) {
      return { success: false, error: validation.error.errors[0].message }
    }

    const { supabase } = await getAuthenticatedUser()

    // Retrieve session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId)

    if (session.payment_status === 'paid' && session.metadata?.bookingId) {
      // Update booking status
      const { error } = await supabase
        .from('bookings')
        .update({
          payment_status: 'paid',
          payment_method: 'stripe',
          updated_at: new Date().toISOString(),
        })
        .eq('id', session.metadata.bookingId)

      if (error) {
        console.error('[payments/handleSuccessfulPayment] Error:', error)
        return { success: false, error: error.message }
      }

      // Redirect to confirmation page
      redirect(`/reservation/confirmation?booking=${session.metadata.bookingId}`)
    }

    return { success: true, data: null }
  } catch (error: any) {
    console.error('[payments/handleSuccessfulPayment] Error:', error)
    return { success: false, error: error.message }
  }
}
