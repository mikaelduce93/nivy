import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { withSecurity } from '@/lib/security/api-middleware'

/**
 * Cash ("ambassadeur") payment intent for a reservation (issue #42).
 *
 * Marks the booking as awaiting a cash settlement (payment_method='cash',
 * payment_status='pending') and returns instructions.
 *
 * NOTE: it does NOT write public.payment_transactions. Despite the issue's
 * suggestion, that table is a coin-TOP-UP ledger — its CHECK constraints
 * require amount_coins > 0 and psp_provider in
 * (stripe|cmi|cashplus|wafacash|m2t|manual), so a 0-coin DH booking payment
 * with psp_provider='cash' can't be represented there without polluting the
 * data. The booking row is the source of truth for the cash intent; the
 * ambassador↔settlement ledger (the old, absent cash_settlements) is a
 * separate feature.
 */
export const POST = withSecurity(async (request: NextRequest) => {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const { bookingId, ambassadorId } = await request.json()
    if (!bookingId) {
      return NextResponse.json({ error: 'bookingId requis' }, { status: 400 })
    }

    // #42 — bookings owner column is user_id (no parent_id).
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('id, total_amount, payment_status')
      .eq('id', bookingId)
      .eq('user_id', user.id)
      .single()

    if (bookingError || !booking) {
      return NextResponse.json({ error: 'Réservation introuvable' }, { status: 404 })
    }
    if (booking.payment_status === 'paid') {
      return NextResponse.json({ error: 'Réservation déjà payée' }, { status: 400 })
    }

    // Optional: validate the ambassador for richer instructions.
    let ambassadorName: string | null = null
    if (ambassadorId) {
      const { data: ambassador } = await supabase
        .from('profiles')
        .select('full_name, role')
        .eq('id', ambassadorId)
        .eq('role', 'ambassador')
        .maybeSingle()
      ambassadorName = ambassador?.full_name ?? null
    }

    const reference = `CASH${Date.now().toString(36).toUpperCase()}`

    const { error: updateError } = await supabase
      .from('bookings')
      .update({
        payment_method: 'cash',
        payment_status: 'pending',
        updated_at: new Date().toISOString(),
      })
      .eq('id', bookingId)

    if (updateError) {
      console.error('[Cash] Booking update error:', updateError)
      return NextResponse.json({ error: 'Erreur enregistrement paiement cash' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      reference,
      bookingId,
      ambassadorName,
      instructions: ambassadorName
        ? `Veuillez remettre ${booking.total_amount} DH en espèces à ${ambassadorName}. Conservez le reçu.`
        : `Veuillez régler ${booking.total_amount} DH en espèces auprès d'un ambassadeur Nivy. Conservez le reçu.`,
    })
  } catch (error) {
    console.error('[Cash] API error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}, { rateLimit: 'api' })
