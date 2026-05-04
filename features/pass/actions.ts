'use server'

/**
 * TEENS PARTY MOROCCO - Pass VIP Domain Actions
 * =============================================
 *
 * Server Actions pour le système Pass VIP.
 * Toutes les entrées sont validées avec Zod.
 */

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import Stripe from 'stripe'
import { sendPassActivationEmail } from '@/lib/emails'
import {
  hasActivePassSchema,
  getUserPassTierSchema,
  subscribePassSchema,
  confirmSubscriptionSchema,
  cancelPassSchema,
  calculatePriceWithPassSchema,
  calculateSavingsSchema,
  trackUsageSchema,
  PASS_TIERS,
  type SubscribePassInput,
  type TrackUsageInput,
  type ActionResult,
  type VIPCard,
  type HasActivePassResult,
  type UserPassTierResult,
  type PriceWithPassResult,
  type PassSavingsResult,
  type SubscriptionResult,
  type VIPCardUsage,
  type VIPTier,
  type ItemType,
} from './schema'

/* ==========================================================================
   STRIPE CLIENT
   ========================================================================== */

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-10-29.clover',
})

/* ==========================================================================
   HELPER: Get authenticated user
   ========================================================================== */

async function getAuthenticatedUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return { supabase, user }
}

/* ==========================================================================
   VÉRIFICATIONS
   ========================================================================== */

/**
 * Vérifie si un utilisateur a un Pass actif
 */
export async function hasActivePass(
  userId?: string
): Promise<ActionResult<HasActivePassResult>> {
  try {
    // Validate input if provided
    if (userId) {
      const validation = hasActivePassSchema.safeParse({ userId })
      if (!validation.success) {
        return { success: false, error: validation.error.errors[0].message }
      }
    }

    const { supabase, user } = await getAuthenticatedUser()
    const targetUserId = userId || user?.id

    if (!targetUserId) {
      return { success: true, data: { hasPass: false } }
    }

    const { data, error } = await supabase
      .from('vip_cards')
      .select('*')
      .eq('profile_id', targetUserId)
      .eq('status', 'active')
      .gte('expiry_date', new Date().toISOString().split('T')[0])
      .maybeSingle()

    if (error && error.code !== 'PGRST116') throw error

    return { success: true, data: { hasPass: !!data, data: data || undefined } }
  } catch (error: any) {
    console.error('[pass/hasActivePass] Error:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Récupère le tier Pass actif d'un utilisateur
 */
export async function getUserPassTier(
  userId?: string
): Promise<ActionResult<UserPassTierResult>> {
  try {
    // Validate input if provided
    if (userId) {
      const validation = getUserPassTierSchema.safeParse({ userId })
      if (!validation.success) {
        return { success: false, error: validation.error.errors[0].message }
      }
    }

    const { supabase, user } = await getAuthenticatedUser()
    const targetUserId = userId || user?.id

    if (!targetUserId) {
      return { success: true, data: { tier: null } }
    }

    const { data, error } = await supabase
      .from('vip_cards')
      .select('card_type, discount_percentage, expiry_date')
      .eq('profile_id', targetUserId)
      .eq('status', 'active')
      .gte('expiry_date', new Date().toISOString().split('T')[0])
      .order('discount_percentage', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error && error.code !== 'PGRST116') throw error

    return {
      success: true,
      data: {
        tier: (data?.card_type as VIPTier) || null,
        data: data || undefined,
      },
    }
  } catch (error: any) {
    console.error('[pass/getUserPassTier] Error:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Récupère toutes les infos du Pass utilisateur
 */
export async function getMyPass(): Promise<ActionResult<VIPCard | null>> {
  try {
    const { supabase, user } = await getAuthenticatedUser()

    if (!user) {
      return { success: false, error: 'Non authentifié' }
    }

    const { data, error } = await supabase
      .from('vip_cards')
      .select('*')
      .eq('profile_id', user.id)
      .eq('status', 'active')
      .gte('expiry_date', new Date().toISOString().split('T')[0])
      .order('discount_percentage', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error && error.code !== 'PGRST116') throw error

    return { success: true, data }
  } catch (error: any) {
    console.error('[pass/getMyPass] Error:', error)
    return { success: false, error: error.message }
  }
}

/* ==========================================================================
   CALCULS PRIX
   ========================================================================== */

/**
 * Calcule le prix avec réduction Pass
 */
export async function calculatePriceWithPass(
  basePrice: number,
  userId?: string,
  itemType: ItemType = 'event'
): Promise<ActionResult<PriceWithPassResult>> {
  try {
    // Validate input
    const validation = calculatePriceWithPassSchema.safeParse({
      basePrice,
      userId,
      itemType,
    })
    if (!validation.success) {
      return { success: false, error: validation.error.errors[0].message }
    }

    const tierResult = await getUserPassTier(userId)

    if (!tierResult.success) {
      return { success: false, error: (tierResult as { success: false; error: string }).error }
    }

    const tier = tierResult.data.tier

    if (!tier) {
      return {
        success: true,
        data: {
          originalPrice: basePrice,
          finalPrice: basePrice,
          discount: 0,
          tier: null,
        },
      }
    }

    const tierConfig = PASS_TIERS[tier]
    const discountPercentage = tierConfig.discount_percentage
    const discount = (basePrice * discountPercentage) / 100
    const finalPrice = Math.round((basePrice - discount) * 100) / 100

    return {
      success: true,
      data: {
        originalPrice: basePrice,
        finalPrice,
        discount,
        discountPercentage,
        tier,
      },
    }
  } catch (error: any) {
    console.error('[pass/calculatePriceWithPass] Error:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Calcule les économies estimées avec un Pass
 */
export async function calculatePassSavings(
  tier: VIPTier,
  eventsPerMonth: number,
  clubsPerMonth: number,
  avgEventPrice: number = 150,
  avgClubPrice: number = 200
): Promise<ActionResult<PassSavingsResult>> {
  try {
    // Validate input
    const validation = calculateSavingsSchema.safeParse({
      tier,
      eventsPerMonth,
      clubsPerMonth,
      avgEventPrice,
      avgClubPrice,
    })
    if (!validation.success) {
      return { success: false, error: validation.error.errors[0].message }
    }

    const config = PASS_TIERS[tier]

    const monthlyEventSpending = eventsPerMonth * avgEventPrice
    const monthlyClubSpending = clubsPerMonth * avgClubPrice
    const monthlyTotal = monthlyEventSpending + monthlyClubSpending

    const monthlySavings = (monthlyTotal * config.discount_percentage) / 100
    const yearlySavings = monthlySavings * 12

    const netYearlySavings = yearlySavings - config.price

    return {
      success: true,
      data: {
        tier,
        monthlySpending: monthlyTotal,
        monthlySavings,
        yearlySavings,
        passPrice: config.price,
        netYearlySavings,
        breakEvenMonths: config.price > 0 ? Math.ceil(config.price / monthlySavings) : 0,
      },
    }
  } catch (error: any) {
    console.error('[pass/calculatePassSavings] Error:', error)
    return { success: false, error: error.message }
  }
}

/* ==========================================================================
   SOUSCRIPTION
   ========================================================================== */

/**
 * Crée une souscription Pass (avec paiement Stripe)
 */
export async function subscribeToPass(
  input: SubscribePassInput
): Promise<ActionResult<SubscriptionResult>> {
  try {
    // Validate input
    const validation = subscribePassSchema.safeParse(input)
    if (!validation.success) {
      return { success: false, error: validation.error.errors[0].message }
    }

    const { tier, duration_months } = validation.data
    const { supabase, user } = await getAuthenticatedUser()

    if (!user) {
      return { success: false, error: 'Non authentifié' }
    }

    const config = PASS_TIERS[tier]

    // Check if user already has active Pass
    const activePassResult = await hasActivePass(user.id)
    if (activePassResult.success && activePassResult.data.hasPass) {
      return { success: false, error: 'Vous avez déjà un Pass actif' }
    }

    // If free (standard), create directly
    if (config.price === 0) {
      const expiryDate = new Date()
      expiryDate.setMonth(expiryDate.getMonth() + duration_months)

      const { data: card, error: cardError } = await supabase
        .from('vip_cards')
        .insert({
          profile_id: user.id,
          card_type: tier,
          card_number: `VIP-${new Date().getFullYear()}-${Math.floor(Math.random() * 100000000).toString().padStart(8, '0')}`,
          issue_date: new Date().toISOString().split('T')[0],
          expiry_date: expiryDate.toISOString().split('T')[0],
          status: 'active',
          discount_percentage: config.discount_percentage,
          monthly_events_included: config.monthly_events_included,
          monthly_clubs_included: config.monthly_clubs_included,
          partner_discount_percentage: config.partner_discount_percentage,
          priority_booking_hours: config.priority_booking_hours,
          benefits: config.benefits,
          auto_renew: false,
        })
        .select()
        .single()

      if (cardError) throw cardError

      revalidatePath('/carte-vip')
      revalidatePath('/profile')
      return { success: true, data: { data: card } }
    }

    // Otherwise, create Stripe session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'mad',
            product_data: {
              name: `Pass TEEN CLUB ${tier.toUpperCase()}`,
              description: `Abonnement annuel Pass ${tier}`,
            },
            unit_amount: config.price * 100,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/carte-vip/confirmation?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/carte-vip/souscrire`,
      client_reference_id: user.id,
      metadata: {
        user_id: user.id,
        tier,
        duration_months: duration_months.toString(),
        type: 'vip_pass',
      },
    })

    return { success: true, data: { sessionId: session.id, url: session.url } }
  } catch (error: any) {
    console.error('[pass/subscribeToPass] Error:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Confirme la souscription après paiement Stripe
 */
export async function confirmPassSubscription(
  sessionId: string
): Promise<ActionResult<VIPCard>> {
  try {
    // Validate input
    const validation = confirmSubscriptionSchema.safeParse({ sessionId })
    if (!validation.success) {
      return { success: false, error: validation.error.errors[0].message }
    }

    const supabase = await createClient()

    // Retrieve Stripe session
    const session = await stripe.checkout.sessions.retrieve(sessionId)

    if (session.payment_status !== 'paid') {
      return { success: false, error: 'Paiement non confirmé' }
    }

    const userId = session.metadata?.user_id
    const tier = session.metadata?.tier as VIPTier
    const durationMonths = parseInt(session.metadata?.duration_months || '12')

    if (!userId || !tier) {
      return { success: false, error: 'Métadonnées invalides' }
    }

    const config = PASS_TIERS[tier]

    const expiryDate = new Date()
    expiryDate.setMonth(expiryDate.getMonth() + durationMonths)

    // Create VIP card
    const { data: card, error: cardError } = await supabase
      .from('vip_cards')
      .insert({
        profile_id: userId,
        card_type: tier,
        card_number: `VIP-${new Date().getFullYear()}-${Math.floor(Math.random() * 100000000).toString().padStart(8, '0')}`,
        issue_date: new Date().toISOString().split('T')[0],
        expiry_date: expiryDate.toISOString().split('T')[0],
        status: 'active',
        discount_percentage: config.discount_percentage,
        monthly_events_included: config.monthly_events_included,
        monthly_clubs_included: config.monthly_clubs_included,
        partner_discount_percentage: config.partner_discount_percentage,
        priority_booking_hours: config.priority_booking_hours,
        benefits: config.benefits,
        stripe_subscription_id: session.id,
        auto_renew: true,
      })
      .select()
      .single()

    if (cardError) throw cardError

    // Get user email for notification
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', userId)
      .single()

    // Send activation email
    if (profile?.email) {
      await sendPassActivationEmail({
        to: profile.email,
        parentName: profile.full_name || 'Membre VIP',
        tierName: tier.charAt(0).toUpperCase() + tier.slice(1),
        cardNumber: card.card_number,
        expiryDate: new Date(card.expiry_date).toLocaleDateString('fr-FR', {
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        }),
        discountPercentage: config.discount_percentage,
        monthlyEventsIncluded: config.monthly_events_included,
        priorityBookingHours: config.priority_booking_hours
      })
    }

    revalidatePath('/carte-vip')
    revalidatePath('/profile')
    return { success: true, data: card }
  } catch (error: any) {
    console.error('[pass/confirmPassSubscription] Error:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Annule un Pass
 */
export async function cancelPass(
  reason?: string
): Promise<ActionResult<VIPCard[]>> {
  try {
    // Validate input if provided
    if (reason) {
      const validation = cancelPassSchema.safeParse({ reason })
      if (!validation.success) {
        return { success: false, error: validation.error.errors[0].message }
      }
    }

    const { supabase, user } = await getAuthenticatedUser()

    if (!user) {
      return { success: false, error: 'Non authentifié' }
    }

    const { data, error } = await supabase
      .from('vip_cards')
      .update({
        status: 'suspended',
        auto_renew: false,
        cancelled_at: new Date().toISOString(),
        cancellation_reason: reason,
      })
      .eq('profile_id', user.id)
      .eq('status', 'active')
      .select()

    if (error) throw error

    revalidatePath('/carte-vip')
    revalidatePath('/profile')
    return { success: true, data: data ?? [] }
  } catch (error: any) {
    console.error('[pass/cancelPass] Error:', error)
    return { success: false, error: error.message }
  }
}

/* ==========================================================================
   TRACKING UTILISATION
   ========================================================================== */

/**
 * Enregistre l'utilisation d'un avantage Pass
 */
export async function trackPassUsage(
  input: TrackUsageInput
): Promise<ActionResult<null>> {
  try {
    // Validate input
    const validation = trackUsageSchema.safeParse(input)
    if (!validation.success) {
      return { success: false, error: validation.error.errors[0].message }
    }

    const { usageType, referenceType, referenceId, discountApplied } = validation.data
    const { supabase, user } = await getAuthenticatedUser()

    if (!user) {
      return { success: false, error: 'Non authentifié' }
    }

    // Get active card
    const { data: card } = await supabase
      .from('vip_cards')
      .select('id')
      .eq('profile_id', user.id)
      .eq('status', 'active')
      .single()

    if (!card) {
      return { success: false, error: 'Pas de Pass actif' }
    }

    // Record usage
    const { error } = await supabase.from('vip_card_usage').insert({
      vip_card_id: card.id,
      usage_type: usageType,
      reference_type: referenceType,
      reference_id: referenceId,
      discount_applied: discountApplied || 0,
    })

    if (error) throw error

    return { success: true, data: null }
  } catch (error: any) {
    console.error('[pass/trackPassUsage] Error:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Récupère l'historique d'utilisation du Pass
 */
export async function getPassUsageHistory(): Promise<ActionResult<VIPCardUsage[]>> {
  try {
    const { supabase, user } = await getAuthenticatedUser()

    if (!user) {
      return { success: false, error: 'Non authentifié' }
    }

    const { data, error } = await supabase
      .from('vip_card_usage')
      .select(`
        *,
        vip_card:vip_card_id (card_type, card_number)
      `)
      .eq('vip_card.profile_id', user.id)
      .order('usage_date', { ascending: false })
      .limit(50)

    if (error) throw error

    return { success: true, data: data ?? [] }
  } catch (error: any) {
    console.error('[pass/getPassUsageHistory] Error:', error)
    return { success: false, error: error.message }
  }
}

