import { NextResponse, NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { mobileMoneyService, MobileMoneyOperator } from '@/lib/payments/mobile-money'
import { withSecurity } from '@/lib/security/api-middleware'
import { getFeatureFlag } from '@/lib/features/flags'

export const POST = withSecurity(async (request: NextRequest) => {
  try {
    // Vérifier que le feature flag Mobile Money est activé
    const mobileMoneyEnabled = await getFeatureFlag('mobile_money_payment')
    if (!mobileMoneyEnabled) {
      return NextResponse.json(
        { error: 'Mobile Money payment is not available' },
        { status: 403 }
      )
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const { bookingId, operator, phone, amount, xpUsed } = await request.json()

    // Validate operator
    const validOperators: MobileMoneyOperator[] = ['orange_money', 'inwi_money', 'maroc_telecom_cash']
    if (!validOperators.includes(operator)) {
      return NextResponse.json({ error: 'Opérateur invalide' }, { status: 400 })
    }

    // Get booking
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('*, events(*)')
      .eq('id', bookingId)
      .eq('parent_id', user.id)
      .single()

    if (bookingError || !booking) {
      return NextResponse.json({ error: 'Réservation introuvable' }, { status: 404 })
    }

    if (booking.payment_status === 'paid') {
      return NextResponse.json({ error: 'Réservation déjà payée' }, { status: 400 })
    }

    // Determine amount to pay (considering XP if already applied)
    const amountToPay = amount || booking.amount_after_xp || booking.total_amount

    // Create payment transaction
    const reference = `MM${Date.now().toString(36).toUpperCase()}`

    const { data: transaction, error: transactionError } = await supabase
      .from('payment_transactions')
      .insert({
        booking_id: bookingId,
        amount: amountToPay,
        currency: 'MAD',
        provider: 'mobile_money',
        status: 'pending',
        reference,
        metadata: {
          operator,
          phone: mobileMoneyService.formatPhoneInternational(phone),
          xpUsed: xpUsed || 0,
        },
      })
      .select()
      .single()

    if (transactionError) {
      console.error('[MobileMoney] Transaction creation error:', transactionError)
      return NextResponse.json({ error: 'Erreur création transaction' }, { status: 500 })
    }

    // Initiate Mobile Money payment
    const result = await mobileMoneyService.initiatePayment({
      operator,
      phone,
      amount: amountToPay,
      reference,
      description: `Réservation ${booking.booking_reference}`,
      bookingId,
      xpUsed,
    })

    if (!result.success) {
      // Update transaction as failed
      await supabase
        .from('payment_transactions')
        .update({ status: 'failed', error_message: result.error })
        .eq('id', transaction.id)

      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    // Update transaction with payment code
    await supabase
      .from('payment_transactions')
      .update({
        provider_transaction_id: result.paymentId,
        metadata: {
          ...transaction.metadata,
          code: result.code,
          instructions: result.instructions,
          expiresAt: result.expiresAt?.toISOString(),
        }
      })
      .eq('id', transaction.id)

    // Update booking payment method
    await supabase
      .from('bookings')
      .update({
        payment_method: 'mobile_money',
        payment_reference: result.paymentId,
      })
      .eq('id', bookingId)

    // Get operator config for display
    const operatorConfig = mobileMoneyService.getOperatorConfig(operator)

    return NextResponse.json({
      success: true,
      paymentId: result.paymentId,
      code: result.code,
      instructions: result.instructions,
      expiresAt: result.expiresAt,
      transactionId: transaction.id,
      operator: {
        name: operatorConfig.name,
        color: operatorConfig.color,
        ussdCode: operatorConfig.ussdCode,
      },
    })
  } catch (error) {
    console.error('[MobileMoney] API error:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}, { rateLimit: 'api' })
