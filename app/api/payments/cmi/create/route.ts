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

    // Get booking
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('*, events(*), profiles(*)')
      .eq('id', bookingId)
      .eq('parent_id', user.id)
      .single()

    if (bookingError || !booking) {
      return NextResponse.json({ error: 'Réservation introuvable' }, { status: 404 })
    }

    if (booking.payment_status === 'paid') {
      return NextResponse.json({ error: 'Réservation déjà payée' }, { status: 400 })
    }

    // Create payment transaction record
    const reference = `CMI${Date.now().toString(36).toUpperCase()}`
    
    const { data: transaction, error: transactionError } = await supabase
      .from('payment_transactions')
      .insert({
        booking_id: bookingId,
        amount: booking.total_amount,
        method: 'cmi',
        status: 'pending',
        reference,
        cmi_order_id: reference,
      })
      .select()
      .single()

    if (transactionError) {
      console.error('[CMI] Transaction creation error:', transactionError)
      return NextResponse.json({ error: 'Erreur création transaction' }, { status: 500 })
    }

    // Create CMI payment
    const cmiResult = await cmiGateway.createPayment({
      amount: booking.total_amount,
      orderId: reference,
      customerEmail: booking.profiles.email,
      customerPhone: booking.profiles.phone,
      description: `Réservation ${booking.booking_reference} - ${booking.events.title}`,
      callbackUrl: `${process.env.NEXT_PUBLIC_APP_URL}/reservation/confirmation`,
    })

    if (!cmiResult.success) {
      // Update transaction as failed
      await supabase
        .from('payment_transactions')
        .update({ status: 'failed', error_message: cmiResult.error })
        .eq('id', transaction.id)

      return NextResponse.json({ error: cmiResult.error }, { status: 500 })
    }

    // Update transaction with CMI details
    await supabase
      .from('payment_transactions')
      .update({ 
        status: 'processing',
        metadata: { paymentUrl: cmiResult.paymentUrl }
      })
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
