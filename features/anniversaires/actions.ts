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

    // Schéma lean réel : anniv_packs(price_dh, capacity) — pas de display_order
    // ni pack_type. On trie par created_at et on ignore le filtre `type`.
    const { data, error } = await supabase
      .from('anniv_packs')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: true })

    if (error) throw error

    // Adapter le schéma lean au type AnnivPack attendu par l'UI.
    const packs: AnnivPack[] = (data ?? []).map((p: any) => ({
      id: p.id,
      name: p.name,
      pack_type: (type ?? 'event') as 'event' | 'custom',
      description: p.description ?? null,
      includes: [],
      base_price: Number(p.price_dh ?? 0),
      included_guests: Number(p.capacity ?? 0),
      additional_guest_price: 0,
      display_order: 0,
      is_active: !!p.is_active,
    }))

    return { success: true, data: packs }
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

    const { data: p, error } = await supabase
      .from('anniv_packs')
      .select('*')
      .eq('id', packId)
      .single()

    if (error) throw error

    const pack: AnnivPack = {
      id: p.id,
      name: p.name,
      pack_type: 'event',
      description: p.description ?? null,
      includes: [],
      base_price: Number(p.price_dh ?? 0),
      included_guests: Number(p.capacity ?? 0),
      additional_guest_price: 0,
      display_order: 0,
      is_active: !!p.is_active,
    }

    return { success: true, data: pack }
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

    // Schéma lean réel : anniv_extras(price_dh) — pas de category. Tri par nom.
    const { data, error } = await supabase
      .from('anniv_extras')
      .select('*')
      .eq('is_active', true)
      .order('name', { ascending: true })

    if (error) throw error

    const extras: AnnivExtra[] = (data ?? []).map((e: any) => ({
      id: e.id,
      name: e.name,
      description: null,
      category: '',
      price: Number(e.price_dh ?? 0),
      is_active: !!e.is_active,
    }))

    return { success: true, data: extras }
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

    // Prix de base (price_dh). Pas de tarif par invité supplémentaire dans le
    // schéma lean (capacity est une limite, pas un tarif progressif).
    const packPrice = Number(pack.price_dh ?? 0)
    const extraGuests = Math.max(0, guest_count - Number(pack.capacity ?? guest_count))
    const extraGuestsPrice = 0

    // Extras (price_dh)
    let extrasTotalPrice = 0
    if (selected_extras && selected_extras.length > 0) {
      const { data: extras, error: extrasError } = await supabase
        .from('anniv_extras')
        .select('price_dh')
        .in('id', selected_extras)

      if (extrasError) throw extrasError

      extrasTotalPrice = (extras ?? []).reduce((sum, extra: any) => sum + Number(extra.price_dh ?? 0), 0)
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

    const { total_price } = priceCalc.data

    // Schéma lean réel : anniv_orders(parent_id, teen_id, pack_id, party_date,
    // guest_count, total_dh, notes, status). Les champs riches (thème, lieu,
    // extras, allergies, contact…) n'ont pas de colonne — on conserve l'essentiel
    // dans `notes` pour ne rien perdre côté admin.
    const notesParts = [
      validatedInput.theme ? `Thème: ${validatedInput.theme}` : null,
      validatedInput.special_requests ? `Demandes: ${validatedInput.special_requests}` : null,
      validatedInput.allergies_notes ? `Allergies: ${validatedInput.allergies_notes}` : null,
      validatedInput.custom_message_dj ? `Message DJ: ${validatedInput.custom_message_dj}` : null,
      validatedInput.contact_phone ? `Contact: ${validatedInput.contact_phone}` : null,
    ].filter(Boolean)

    // Create order
    const { data: order, error: orderError } = await supabase
      .from('anniv_orders')
      .insert({
        parent_id: user.id,
        teen_id: validatedInput.teen_id,
        pack_id: validatedInput.pack_id,
        party_date: validatedInput.celebration_date,
        guest_count: validatedInput.guest_count,
        total_dh: total_price,
        notes: notesParts.length > 0 ? notesParts.join(' · ') : null,
        status: 'pending',
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

      // anniv_order_extras lean : (order_id, extra_id, quantity) uniquement.
      const orderExtras = extras.map(extra => ({
        order_id: order.id,
        extra_id: extra.id,
        quantity: 1,
      }))

      const { error: insertExtrasError } = await supabase
        .from('anniv_order_extras')
        .insert(orderExtras)

      if (insertExtrasError) throw insertExtrasError
    }

    // anniv_orders n'a ni qr_code ni booking_reference dans le schéma lean ;
    // on encode l'id pour le QR du mail/retour, sans persistance DB.
    const qrCode = await QRCode.toDataURL(`ANNIV-${order.id}`)

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
        bookingReference: order.id,
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
