import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { withSecurity } from '@/lib/security/api-middleware'

export const POST = withSecurity(async (request: NextRequest) => {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const { bookingId, ambassadorId } = await request.json()

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

    // Verify ambassador exists and is active
    const { data: ambassador, error: ambassadorError } = await supabase
      .from('profiles')
      .select('id, full_name, role')
      .eq('id', ambassadorId)
      .eq('role', 'ambassador')
      .single()

    if (ambassadorError || !ambassador) {
      return NextResponse.json({ error: 'Ambassadeur invalide' }, { status: 400 })
    }

    // Create payment transaction
    const reference = `CASH${Date.now().toString(36).toUpperCase()}`
    
    const { data: transaction, error: transactionError } = await supabase
      .from('payment_transactions')
      .insert({
        booking_id: bookingId,
        amount: booking.total_amount,
        method: 'cash_ambassador',
        status: 'pending',
        reference,
        ambassador_id: ambassadorId,
      })
      .select()
      .single()

    if (transactionError) {
      console.error('[Cash] Transaction creation error:', transactionError)
      return NextResponse.json({ error: 'Erreur création transaction' }, { status: 500 })
    }

    // Create cash settlement record
    await supabase
      .from('cash_settlements')
      .insert({
        ambassador_id: ambassadorId,
        payment_transaction_id: transaction.id,
        booking_id: bookingId,
        amount: booking.total_amount,
        status: 'received',
      })

    return NextResponse.json({
      success: true,
      reference,
      transactionId: transaction.id,
      ambassadorName: ambassador.full_name,
      instructions: `Veuillez remettre ${booking.total_amount} DH en espèces à ${ambassador.full_name}. Conservez le reçu fourni par l'ambassadeur.`,
    })
  } catch (error) {
    console.error('[Cash] API error:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}, { rateLimit: 'api' })
