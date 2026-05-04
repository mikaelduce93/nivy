'use server'

/**
 * TEENS PARTY MOROCCO - Anniversaires Domain Actions
 * ==================================================
 *
 * Server Actions pour la gestion des commandes anniversaires.
 * Toutes les entrées sont validées avec Zod.
 */

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import QRCode from 'qrcode'
import { sendBirthdayConfirmation } from '@/lib/emails'
import {
  createAnnivOrderSchema,
  calculatePriceSchema,
  cancelOrderSchema,
  updatePaymentStatusSchema,
  getPacksSchema,
  getVenuesSchema,
  type CreateAnnivOrderInput,
  type CalculatePriceInput,
  type CancelOrderInput,
  type UpdatePaymentStatusInput,
  type ActionResult,
  type AnnivPack,
  type AnnivExtra,
  type AnnivOrder,
  type PriceCalculation,
} from './schema'

/* ==========================================================================
   HELPER: Get authenticated user
   ========================================================================== */

async function getAuthenticatedUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return { supabase, user }
}

/* ==========================================================================
   RÉFÉRENTIELS
   ========================================================================== */

/**
 * Récupère tous les packs anniversaires actifs
 */
export async function getAnnivPacks(
  type?: 'event' | 'custom'
): Promise<ActionResult<AnnivPack[]>> {
  try {
    // Validate input if provided
    if (type) {
      const validation = getPacksSchema.safeParse({ type })
      if (!validation.success) {
        return { success: false, error: validation.error.errors[0].message }
      }
    }

    const { supabase } = await getAuthenticatedUser()

    let query = supabase
      .from('anniv_packs')
      .select('*')
      .eq('is_active', true)
      .order('display_order')

    if (type) {
      query = query.eq('pack_type', type)
    }

    const { data, error } = await query

    if (error) throw error

    return { success: true, data: data ?? [] }
  } catch (error: any) {
    console.error('[anniversaires/getAnnivPacks] Error:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Récupère un pack par son ID
 */
export async function getAnnivPackById(
  packId: string
): Promise<ActionResult<AnnivPack>> {
  try {
    const { supabase } = await getAuthenticatedUser()

    const { data, error } = await supabase
      .from('anniv_packs')
      .select('*')
      .eq('id', packId)
      .single()

    if (error) throw error

    return { success: true, data }
  } catch (error: any) {
    console.error('[anniversaires/getAnnivPackById] Error:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Récupère tous les extras actifs
 */
export async function getAnnivExtras(): Promise<ActionResult<AnnivExtra[]>> {
  try {
    const { supabase } = await getAuthenticatedUser()

    const { data, error } = await supabase
      .from('anniv_extras')
      .select('*')
      .eq('is_active', true)
      .order('category, price')

    if (error) throw error

    return { success: true, data: data ?? [] }
  } catch (error: any) {
    console.error('[anniversaires/getAnnivExtras] Error:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Récupère les lieux partenaires pour anniversaires custom
 */
export async function getPartnerVenues(
  city?: string
): Promise<ActionResult<any[]>> {
  try {
    // Validate input if provided
    if (city) {
      const validation = getVenuesSchema.safeParse({ city })
      if (!validation.success) {
        return { success: false, error: validation.error.errors[0].message }
      }
    }

    const { supabase } = await getAuthenticatedUser()

    let query = supabase
      .from('partner_venues')
      .select(`
        *,
        partners:partner_id (
          id,
          company_name,
          address,
          city,
          phone,
          logo_url,
          rating
        )
      `)

    if (city) {
      query = query.eq('partners.city', city)
    }

    const { data, error } = await query

    if (error) throw error

    return { success: true, data: data ?? [] }
  } catch (error: any) {
    console.error('[anniversaires/getPartnerVenues] Error:', error)
    return { success: false, error: error.message }
  }
}

/* ==========================================================================
   CALCULS
   ========================================================================== */

/**
 * Calcule le prix total d'une commande anniversaire
 */
export async function calculateAnnivPrice(
  input: CalculatePriceInput
): Promise<ActionResult<PriceCalculation>> {
  try {
    // Validate input
    const validation = calculatePriceSchema.safeParse(input)
    if (!validation.success) {
      return { success: false, error: validation.error.errors[0].message }
    }

    const { pack_id, guest_count, selected_extras } = validation.data
    const { supabase } = await getAuthenticatedUser()

    // Get pack
    const { data: pack, error: packError } = await supabase
      .from('anniv_packs')
      .select('*')
      .eq('id', pack_id)
      .single()

    if (packError) throw packError

    // Base price
    const packPrice = pack.base_price

    // Extra guests
    const extraGuests = Math.max(0, guest_count - pack.included_guests)
    const extraGuestsPrice = extraGuests * pack.additional_guest_price

    // Extras total
    let extrasTotalPrice = 0
    if (selected_extras && selected_extras.length > 0) {
      const { data: extras, error: extrasError } = await supabase
        .from('anniv_extras')
        .select('price')
        .in('id', selected_extras)

      if (extrasError) throw extrasError

      extrasTotalPrice = extras.reduce((sum, extra) => sum + Number(extra.price), 0)
    }

    // Total
    const subtotal = packPrice + extraGuestsPrice + extrasTotalPrice
    const total = subtotal // Discount applied later if Pass

    return {
      success: true,
      data: {
        pack_price: packPrice,
        extra_guests: extraGuests,
        extra_guests_price: extraGuestsPrice,
        extras_total_price: extrasTotalPrice,
        subtotal,
        discount_amount: 0,
        total_price: total,
      },
    }
  } catch (error: any) {
    console.error('[anniversaires/calculateAnnivPrice] Error:', error)
    return { success: false, error: error.message }
  }
}

/* ==========================================================================
   CRUD - COMMANDES
   ========================================================================== */

/**
 * Crée une nouvelle commande anniversaire
 */
export async function createAnnivOrder(
  input: CreateAnnivOrderInput
): Promise<ActionResult<AnnivOrder>> {
  try {
    // Validate input
    const validation = createAnnivOrderSchema.safeParse(input)
    if (!validation.success) {
      const errors = validation.error.errors.map(e => e.message).join(', ')
      return { success: false, error: errors }
    }

    const validatedInput = validation.data
    const { supabase, user } = await getAuthenticatedUser()

    if (!user) {
      return { success: false, error: 'Non authentifié' }
    }

    // Calculate price
    const priceCalc = await calculateAnnivPrice({
      pack_id: validatedInput.pack_id,
      guest_count: validatedInput.guest_count,
      selected_extras: validatedInput.selected_extras,
    })

    if (!priceCalc.success) {
      return { success: false, error: 'Erreur calcul prix' }
    }

    const {
      pack_price,
      extra_guests_price,
      extras_total_price,
      subtotal,
      discount_amount,
      total_price,
    } = priceCalc.data

    // Create order
    const { data: order, error: orderError } = await supabase
      .from('anniv_orders')
      .insert({
        parent_id: user.id,
        teen_id: validatedInput.teen_id,
        pack_id: validatedInput.pack_id,
        order_type: validatedInput.order_type,
        event_id: validatedInput.event_id,
        venue_id: validatedInput.venue_id,
        celebration_date: validatedInput.celebration_date,
        celebration_time: validatedInput.celebration_time,
        guest_count: validatedInput.guest_count,
        guest_names: validatedInput.guest_names,
        theme: validatedInput.theme,
        selected_extras: validatedInput.selected_extras,
        special_requests: validatedInput.special_requests,
        allergies_notes: validatedInput.allergies_notes,
        custom_message_dj: validatedInput.custom_message_dj,
        contact_phone: validatedInput.contact_phone,
        pack_price,
        extra_guests_price,
        extras_total_price,
        subtotal,
        discount_amount,
        total_price,
        status: 'pending',
        payment_status: 'pending',
      })
      .select()
      .single()

    if (orderError) throw orderError

    // Create extras relations
    if (validatedInput.selected_extras && validatedInput.selected_extras.length > 0) {
      const { data: extras, error: extrasError } = await supabase
        .from('anniv_extras')
        .select('*')
        .in('id', validatedInput.selected_extras)

      if (extrasError) throw extrasError

      const orderExtras = extras.map(extra => ({
        order_id: order.id,
        extra_id: extra.id,
        quantity: 1,
        unit_price: extra.price,
        total_price: extra.price,
      }))

      const { error: insertExtrasError } = await supabase
        .from('anniv_order_extras')
        .insert(orderExtras)

      if (insertExtrasError) throw insertExtrasError
    }

    // Generate QR code
    const qrCode = await QRCode.toDataURL(`ANNIV-${order.booking_reference}`)

    const { error: qrError } = await supabase
      .from('anniv_orders')
      .update({ qr_code: qrCode })
      .eq('id', order.id)

    if (qrError) console.warn('[anniversaires] QR code warning:', qrError)

    // Get pack name for email
    const { data: pack } = await supabase
      .from('anniv_packs')
      .select('name')
      .eq('id', validatedInput.pack_id)
      .single()

    // Get extras names for email
    let extrasNames: string[] = []
    if (validatedInput.selected_extras && validatedInput.selected_extras.length > 0) {
      const { data: extrasData } = await supabase
        .from('anniv_extras')
        .select('name')
        .in('id', validatedInput.selected_extras)

      if (extrasData) {
        extrasNames = extrasData.map(e => e.name)
      }
    }

    // Get user email for confirmation
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', user.id)
      .single()

    // Get teen info if provided
    let childName = 'Votre enfant'
    if (validatedInput.teen_id) {
      const { data: teen } = await supabase
        .from('profiles')
        .select('full_name, first_name')
        .eq('id', validatedInput.teen_id)
        .single()

      if (teen) {
        childName = teen.first_name || teen.full_name || childName
      }
    }

    // Send confirmation email
    const emailTo = profile?.email
    if (emailTo) {
      await sendBirthdayConfirmation({
        to: emailTo,
        parentName: profile?.full_name || 'Parent',
        childName,
        celebrationDate: new Date(validatedInput.celebration_date).toLocaleDateString('fr-FR', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        }),
        packageName: pack?.name || 'Formule Anniversaire',
        guestCount: validatedInput.guest_count,
        totalPrice: total_price,
        bookingReference: order.booking_reference,
        qrCodeUrl: qrCode,
        extras: extrasNames.length > 0 ? extrasNames : undefined
      })
    }

    revalidatePath('/mes-reservations')
    return { success: true, data: { ...order, qr_code: qrCode } }
  } catch (error: any) {
    console.error('[anniversaires/createAnnivOrder] Error:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Récupère toutes les commandes anniversaires du parent
 */
export async function getMyAnnivOrders(): Promise<ActionResult<any[]>> {
  try {
    const { supabase, user } = await getAuthenticatedUser()

    if (!user) {
      return { success: false, error: 'Non authentifié' }
    }

    const { data, error } = await supabase
      .from('anniv_orders')
      .select(`
        *,
        teen:teen_id (first_name, last_name, pseudo),
        pack:pack_id (name, pack_type),
        event:event_id (title, event_date),
        venue:venue_id (
          id,
          partner:partner_id (company_name, address)
        )
      `)
      .eq('parent_id', user.id)
      .order('celebration_date', { ascending: false })

    if (error) throw error

    return { success: true, data: data ?? [] }
  } catch (error: any) {
    console.error('[anniversaires/getMyAnnivOrders] Error:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Récupère une commande par ID
 */
export async function getAnnivOrderById(
  orderId: string
): Promise<ActionResult<any>> {
  try {
    const { supabase, user } = await getAuthenticatedUser()

    if (!user) {
      return { success: false, error: 'Non authentifié' }
    }

    const { data, error } = await supabase
      .from('anniv_orders')
      .select(`
        *,
        teen:teen_id (first_name, last_name, pseudo, avatar_url),
        pack:pack_id (name, pack_type, description, includes),
        event:event_id (title, event_date, venue_name, venue_address),
        venue:venue_id (
          id,
          partner:partner_id (company_name, address, city, phone)
        ),
        extras:anniv_order_extras (
          quantity,
          unit_price,
          total_price,
          extra:extra_id (name, description, category)
        )
      `)
      .eq('id', orderId)
      .eq('parent_id', user.id)
      .single()

    if (error) throw error

    return { success: true, data }
  } catch (error: any) {
    console.error('[anniversaires/getAnnivOrderById] Error:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Annule une commande anniversaire
 */
export async function cancelAnnivOrder(
  input: CancelOrderInput
): Promise<ActionResult<AnnivOrder>> {
  try {
    // Validate input
    const validation = cancelOrderSchema.safeParse(input)
    if (!validation.success) {
      return { success: false, error: validation.error.errors[0].message }
    }

    const { orderId, reason } = validation.data
    const { supabase, user } = await getAuthenticatedUser()

    if (!user) {
      return { success: false, error: 'Non authentifié' }
    }

    const { data, error } = await supabase
      .from('anniv_orders')
      .update({
        status: 'cancelled',
        cancelled_reason: reason,
        cancelled_at: new Date().toISOString(),
      })
      .eq('id', orderId)
      .eq('parent_id', user.id)
      .select()
      .single()

    if (error) throw error

    revalidatePath('/mes-reservations')
    return { success: true, data }
  } catch (error: any) {
    console.error('[anniversaires/cancelAnnivOrder] Error:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Met à jour le statut de paiement
 */
export async function updateAnnivPaymentStatus(
  input: UpdatePaymentStatusInput
): Promise<ActionResult<AnnivOrder>> {
  try {
    // Validate input
    const validation = updatePaymentStatusSchema.safeParse(input)
    if (!validation.success) {
      return { success: false, error: validation.error.errors[0].message }
    }

    const { orderId, paymentStatus, depositAmount } = validation.data
    const { supabase, user } = await getAuthenticatedUser()

    if (!user) {
      return { success: false, error: 'Non authentifié' }
    }

    const updateData: Record<string, any> = { payment_status: paymentStatus }

    if (depositAmount !== undefined) {
      updateData.deposit_amount = depositAmount
    }

    if (paymentStatus === 'paid') {
      updateData.status = 'confirmed'
      updateData.confirmed_at = new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('anniv_orders')
      .update(updateData)
      .eq('id', orderId)
      .eq('parent_id', user.id)
      .select()
      .single()

    if (error) throw error

    revalidatePath('/mes-reservations')
    return { success: true, data }
  } catch (error: any) {
    console.error('[anniversaires/updateAnnivPaymentStatus] Error:', error)
    return { success: false, error: error.message }
  }
}
