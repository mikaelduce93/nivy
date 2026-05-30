import { createClient } from "@/lib/supabase/server"
import { redirect } from 'next/navigation'
import { Ticket, Search, Download, Filter } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import Link from "next/link"
import BackButton from "@/components/admin/BackButton"

export default async function AdminBookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; search?: string }>
}) {
  const { status, search } = await searchParams
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login?redirect=/admin/reservations")
  }

  const { data: adminRole } = await supabase.from("admin_roles").select("*").eq("profile_id", user.id).single()

  if (!adminRole) {
    redirect("/")
  }

  let query = supabase
    .from("bookings")
    .select(`
      *,
      profiles!bookings_parent_id_fkey (prenom, nom, email, telephone),
      events (title, event_date, city)
    `)
    .order("created_at", { ascending: false })

  if (status && status !== "all") {
    query = query.eq("payment_status", status)
  }

  const { data: bookings } = await query

  const filteredBookings = bookings?.filter((booking) => {
    if (!search) return true
    const searchLower = search.toLowerCase()
    return (
      booking.booking_reference?.toLowerCase().includes(searchLower) ||
      booking.profiles?.prenom?.toLowerCase().includes(searchLower) ||
      booking.profiles?.nom?.toLowerCase().includes(searchLower) ||
      booking.profiles?.email?.toLowerCase().includes(searchLower) ||
      booking.events?.title?.toLowerCase().includes(searchLower)
    )
  })

  const stats = {
    total: bookings?.length || 0,
    confirmed: bookings?.filter((b) => b.payment_status === "paid").length || 0,
    pending: bookings?.filter((b) => b.payment_status === "pending").length || 0,
    cancelled: bookings?.filter((b) => b.status === "cancelled").length || 0,
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-32">
        <BackButton href="/admin" label="Retour au dashboard" />
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-black text-ink mb-2">Gestion des réservations</h1>
            <p className="text-mute">Suivez et gérez toutes les réservations</p>
          </div>
          <Button
            onClick={() => {
              if (!bookings || bookings.length === 0) {
                return
              }
              const csv = [
                ['Référence', 'Parent', 'Email', 'Téléphone', 'Événement', 'Date événement', 'Ville', 'Montant', 'Statut paiement', 'Méthode', 'Date réservation'].join(','),
                ...bookings.map((b) =>
                  [
                    b.booking_reference || '',
                    `${b.profiles?.prenom || ''} ${b.profiles?.nom || ''}`,
                    b.profiles?.email || '',
                    b.profiles?.telephone || '',
                    b.events?.title || '',
                    b.events?.event_date ? new Date(b.events.event_date).toLocaleDateString('fr-FR') : '',
                    b.events?.city || '',
                    b.total_amount || 0,
                    b.payment_status || '',
                    b.payment_method || '',
                    new Date(b.created_at).toLocaleDateString('fr-FR'),
                  ].join(',')
                ),
              ].join('\n')
              const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
              const url = window.URL.createObjectURL(blob)
              const a = document.createElement('a')
              a.href = url
              a.download = `reservations-${new Date().toISOString().split('T')[0]}.csv`
              document.body.appendChild(a)
              a.click()
              document.body.removeChild(a)
              window.URL.revokeObjectURL(url)
            }}
            className="bg-gradient-to-r from-lime to-lime hover:from-lime hover:to-lime text-ink"
          >
            <Download className="w-4 h-4 mr-2" />
            Exporter CSV
          </Button>
        </div>

        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <Card className="p-4 bg-card border-ink">
            <p className="text-mute text-sm mb-1">Total</p>
            <p className="text-3xl font-black text-ink">{stats.total}</p>
          </Card>
          <Card className="p-4 bg-card border-lime/30">
            <p className="text-mute text-sm mb-1">Confirmées</p>
            <p className="text-3xl font-black text-lime">{stats.confirmed}</p>
          </Card>
          <Card className="p-4 bg-card border-gold/30">
            <p className="text-mute text-sm mb-1">En attente</p>
            <p className="text-3xl font-black text-gold">{stats.pending}</p>
          </Card>
          <Card className="p-4 bg-card border-destructive/30">
            <p className="text-mute text-sm mb-1">Annulées</p>
            <p className="text-3xl font-black text-destructive">{stats.cancelled}</p>
          </Card>
        </div>

        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-mute" />
            <Input
              placeholder="Rechercher par référence, nom, email..."
              className="pl-10 bg-card border-ink"
            />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="bg-transparent border-ink">
              <Filter className="w-4 h-4 mr-2" />
              Filtres
            </Button>
            <Button variant="outline" className="bg-transparent border-ink">
              <Download className="w-4 h-4 mr-2" />
              Exporter
            </Button>
          </div>
        </div>

        {filteredBookings && filteredBookings.length > 0 ? (
          <div className="space-y-4">
            {filteredBookings.map((booking) => (
              <Card key={booking.id} className="p-6 bg-card border-ink">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <h3 className="text-lg font-bold text-ink">{booking.booking_reference}</h3>
                      <div
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          booking.payment_status === "paid"
                            ? "bg-lime/20 text-lime"
                            : booking.payment_status === "pending"
                              ? "bg-gold/20 text-gold"
                              : "bg-destructive/20 text-destructive"
                        }`}
                      >
                        {booking.payment_status === "paid"
                          ? "PAYÉ"
                          : booking.payment_status === "pending"
                            ? "EN ATTENTE"
                            : "ANNULÉ"}
                      </div>
                    </div>

                    <div className="grid md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-mute mb-1">Parent</p>
                        <p className="text-ink font-semibold">
                          {booking.profiles?.prenom} {booking.profiles?.nom}
                        </p>
                        <p className="text-mute">{booking.profiles?.email}</p>
                        {booking.profiles?.telephone && <p className="text-mute">{booking.profiles.telephone}</p>}
                      </div>

                      <div>
                        <p className="text-mute mb-1">Événement</p>
                        <p className="text-ink font-semibold">{booking.events?.title}</p>
                        <p className="text-mute">
                          {new Date(booking.events?.event_date).toLocaleDateString("fr-FR")}
                        </p>
                        <p className="text-mute">{booking.events?.city}</p>
                      </div>

                      <div>
                        <p className="text-mute mb-1">Paiement</p>
                        <p className="text-teal font-bold text-lg">{booking.total_amount} DH</p>
                        {booking.payment_method && <p className="text-mute capitalize">{booking.payment_method}</p>}
                        <p className="text-mute text-xs">
                          {new Date(booking.created_at).toLocaleDateString("fr-FR")}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <Button
                      asChild
                      size="sm"
                      variant="outline"
                      className="bg-transparent border-teal text-teal"
                    >
                      <Link href={`/admin/reservations/${booking.id}`}>Détails</Link>
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-12 text-center bg-card border-ink">
            <Ticket className="w-16 h-16 text-ink mx-auto mb-4" />
            <h3 className="text-xl font-bold text-ink mb-2">Aucune réservation</h3>
            <p className="text-mute">Les réservations apparaîtront ici</p>
          </Card>
        )}
      </div>
    </div>
  )
}
