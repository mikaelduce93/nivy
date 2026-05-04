import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { toDataURL } from "qrcode"

export const runtime = "nodejs"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const bookingId = searchParams.get('bookingId')

  if (!bookingId) {
    return NextResponse.json({ error: 'Missing bookingId' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: booking, error } = await supabase
    .from('bookings')
    .select(`
      *,
      events (*),
      booking_tickets (
        *,
        children (*)
      )
    `)
    .eq('id', bookingId)
    .eq('parent_id', user.id)
    .single()

  if (error || !booking) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
  }

  // Generate QR code as data URL
  const qrCodeDataUrl = await toDataURL(booking.booking_reference, {
    width: 300,
    margin: 2,
  })

  // Simple HTML to PDF conversion (in production, use a proper library like puppeteer or pdfkit)
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; }
          .header { text-align: center; margin-bottom: 40px; }
          .qr-code { text-align: center; margin: 40px 0; }
          .qr-code img { width: 300px; height: 300px; }
          .details { margin: 20px 0; }
          .details table { width: 100%; border-collapse: collapse; }
          .details td { padding: 10px; border-bottom: 1px solid #ddd; }
          .details td:first-child { font-weight: bold; width: 200px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Teens Party Morocco</h1>
          <h2>${booking.events.title}</h2>
          <p>Référence: ${booking.booking_reference}</p>
        </div>
        
        <div class="qr-code">
          <img src="${qrCodeDataUrl}" alt="QR Code" />
          <p>Présentez ce code à l'entrée</p>
        </div>
        
        <div class="details">
          <table>
            <tr>
              <td>Date</td>
              <td>${new Date(booking.events.event_date).toLocaleDateString('fr-FR', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric'
              })}</td>
            </tr>
            <tr>
              <td>Heure</td>
              <td>${booking.events.event_time || '20:00'}</td>
            </tr>
            <tr>
              <td>Lieu</td>
              <td>${booking.events.venue_name}, ${booking.events.city}</td>
            </tr>
            <tr>
              <td>Billets</td>
              <td>${booking.booking_tickets?.length || 1}</td>
            </tr>
            <tr>
              <td>Total payé</td>
              <td>${booking.total_amount} DH</td>
            </tr>
          </table>
        </div>
        
        <div style="margin-top: 40px; padding: 20px; background: #f5f5f5; border-radius: 8px;">
          <h3>Consignes importantes</h3>
          <ul>
            <li>Arrivez 15 minutes avant le début</li>
            <li>Pièce d'identité obligatoire</li>
            <li>Événement 100% sans alcool</li>
            <li>Dress code: ${booking.events.dress_code || 'Tenue de soirée'}</li>
          </ul>
        </div>
      </body>
    </html>
  `

  // For now, return HTML (in production, convert to PDF)
  return new NextResponse(html, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="ticket-${booking.booking_reference}.pdf"`,
    },
  })
}
