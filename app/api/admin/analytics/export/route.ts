import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const { data: adminRole } = await supabase
    .from('admin_roles')
    .select('*')
    .eq('profile_id', user.id)
    .single()

  if (!adminRole) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')
  const city = searchParams.get('city')

  // Drift : plus de FK bookings→profiles ni de table children en live ;
  // seul l'embed events(*) est possible (bookings_event_id_fkey)
  let query = supabase
    .from('bookings')
    .select('*, events(*)')
    .order('created_at', { ascending: false })

  if (startDate) {
    query = query.gte('created_at', startDate)
  }
  if (endDate) {
    query = query.lte('created_at', endDate)
  }

  const { data: bookings } = await query

  if (!bookings) {
    return NextResponse.json({ error: 'Aucune donnée' }, { status: 404 })
  }

  // Filter by city if specified
  const filteredBookings = city
    ? bookings.filter((b) => b.events?.city === city)
    : bookings

  // Nom du réservataire : lookup séparé (pas de FK bookings.user_id→profiles)
  const userIds = [
    ...new Set(filteredBookings.map((b) => b.user_id).filter((id): id is string => !!id)),
  ]
  const { data: bookerProfiles } = userIds.length
    ? await supabase.from('profiles').select('id, full_name').in('id', userIds)
    : { data: [] }
  const fullNameById = new Map(
    (bookerProfiles ?? []).map((p): [string, string] => [p.id, p.full_name ?? ''])
  )

  // Generate CSV
  const headers = [
    'ID',
    'Date',
    'Événement',
    'Ville',
    'Utilisateur',
    'Montant',
    'Statut',
    'Méthode paiement',
  ]
  const rows = filteredBookings.map((b) => [
    b.id,
    b.created_at ? new Date(b.created_at).toLocaleDateString('fr-FR') : '',
    b.events?.title || '',
    b.events?.city || '',
    (b.user_id && fullNameById.get(b.user_id)) || '',
    b.total_amount + ' DH',
    b.payment_status,
    b.payment_method || 'stripe',
  ])

  const csv = [headers, ...rows].map((row) => row.join(',')).join('\n')

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="analytics-${new Date().toISOString().split('T')[0]}.csv"`,
    },
  })
}
