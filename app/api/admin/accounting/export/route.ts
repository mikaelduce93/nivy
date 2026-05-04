import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    // Verify admin role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const format = searchParams.get('format') || 'csv' // csv or json

    // Get all transactions in date range
    let query = supabase
      .from('payment_transactions')
      .select(`
        *,
        bookings (
          booking_reference,
          total_amount,
          events (title)
        ),
        profiles:ambassador_id (full_name)
      `)
      .order('created_at', { ascending: false })

    if (startDate) {
      query = query.gte('created_at', startDate)
    }
    if (endDate) {
      query = query.lte('created_at', endDate)
    }

    const { data: transactions, error } = await query

    if (error) {
      console.error('[Accounting] Export error:', error)
      return NextResponse.json({ error: 'Erreur export' }, { status: 500 })
    }

    if (format === 'csv') {
      // Generate CSV
      const csv = generateCSV(transactions)
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="transactions-${Date.now()}.csv"`,
        },
      })
    }

    // Return JSON
    return NextResponse.json({ transactions })
  } catch (error) {
    console.error('[Accounting] Export error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

function generateCSV(transactions: any[]): string {
  const headers = [
    'Date',
    'Référence',
    'Méthode',
    'Montant',
    'Statut',
    'Réservation',
    'Événement',
    'Ambassadeur',
  ]

  const rows = transactions.map((t) => [
    new Date(t.created_at).toLocaleDateString('fr-FR'),
    t.reference,
    t.method,
    t.amount,
    t.status,
    t.bookings?.booking_reference || '',
    t.bookings?.events?.title || '',
    t.profiles?.full_name || '',
  ])

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
}
