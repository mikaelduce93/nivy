import { NextResponse, NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cmiGateway } from '@/lib/payments/cmi'
import { withSecurity } from '@/lib/security/api-middleware'

export const POST = withSecurity(async (request: NextRequest) => {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const { bookingId } = await request.json()

    // Get booking (bookings link to the payer via user_id; no profiles relation in schema)
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('*, events(*)')
      .eq('id', bookingId)
      .eq('user_id', user.id)
      .single()

    if (bookingError || !booking) {
      return NextResponse.json({ error: 'Réservation introuvable' }, { status: 404 })
    }

    if (booking.payment_status === 'paid') {
      return NextResponse.json({ error: 'Réservation déjà payée' }, { status: 400 })
    }

    // Create payment transaction record
    const reference = `CMI${Date.now().toString(36).toUpperCase()}`
    
    // payment_transactions is now a PSP/wallet ledger: no booking_id/amount/method columns.
    // Booking linkage travels in the CMI order metadata (see bookingId below).
    const { data: transaction, error: transactionError } = await supabase
      .from('payment_transactions')
      .insert({
        parent_id: user.id,
        amount_dh: booking.total_amount ?? 0,
        amount_coins: 0,
        status: 'pending',
        psp_provider: 'cmi',
        psp_reference: reference,
      })
      .select()
      .single()

    if (transactionError) {
      console.error('[CMI] Transaction creation error:', transactionError)
      return NextResponse.json({ error: 'Erreur création transaction' }, { status: 500 })
    }

    // Create CMI payment
    const cmiResult = await cmiGateway.createPayment({
      amount: booking.total_amount ?? 0,
      orderId: reference,
      customerEmail: user.email ?? '',
      description: `Réservation ${booking.booking_reference ?? ''} - ${booking.events?.title ?? ''}`,
      callbackUrl: `${process.env.NEXT_PUBLIC_APP_URL}/reservation/confirmation`,
      bookingId,
    })

    if (!cmiResult.success) {
      // Update transaction as failed
      await supabase
        .from('payment_transactions')
        .update({ status: 'failed', failure_reason: cmiResult.error })
        .eq('id', transaction.id)

      return NextResponse.json({ error: cmiResult.error }, { status: 500 })
    }

    // Update transaction with CMI details
    await supabase
      .from('payment_transactions')
      // no metadata column in schema; paymentUrl is returned to the client below
      .update({ status: 'processing' })
      .eq('id', transaction.id)

    return NextResponse.json({
      success: true,
      paymentUrl: cmiResult.paymentUrl,
      orderId: cmiResult.orderId,
    })
  } catch (error) {
    console.error('[CMI] API error:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}, { rateLimit: 'api' })
