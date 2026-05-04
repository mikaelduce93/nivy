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
    <div className="min-h-screen bg-zinc-950">
      <div className="container mx-auto px-6 py-32">
        <BackButton href="/admin" label="Retour au dashboard" />
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-black text-white mb-2">Gestion des réservations</h1>
            <p className="text-zinc-400">Suivez et gérez toutes les réservations</p>
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
            className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white"
          >
            <Download className="w-4 h-4 mr-2" />
            Exporter CSV
          </Button>
        </div>

        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <Card className="p-4 bg-zinc-900 border-zinc-800">
            <p className="text-zinc-400 text-sm mb-1">Total</p>
            <p className="text-3xl font-black text-white">{stats.total}</p>
          </Card>
          <Card className="p-4 bg-zinc-900 border-green-500/30">
            <p className="text-zinc-400 text-sm mb-1">Confirmées</p>
            <p className="text-3xl font-black text-green-400">{stats.confirmed}</p>
          </Card>
          <Card className="p-4 bg-zinc-900 border-yellow-500/30">
            <p className="text-zinc-400 text-sm mb-1">En attente</p>
            <p className="text-3xl font-black text-yellow-400">{stats.pending}</p>
          </Card>
          <Card className="p-4 bg-zinc-900 border-red-500/30">
            <p className="text-zinc-400 text-sm mb-1">Annulées</p>
            <p className="text-3xl font-black text-red-400">{stats.cancelled}</p>
          </Card>
        </div>

        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
            <Input
              placeholder="Rechercher par référence, nom, email..."
              className="pl-10 bg-zinc-900 border-zinc-800"
            />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="bg-transparent border-zinc-800">
              <Filter className="w-4 h-4 mr-2" />
              Filtres
            </Button>
            <Button variant="outline" className="bg-transparent border-zinc-800">
              <Download className="w-4 h-4 mr-2" />
              Exporter
            </Button>
          </div>
        </div>

        {filteredBookings && filteredBookings.length > 0 ? (
          <div className="space-y-4">
            {filteredBookings.map((booking) => (
              <Card key={booking.id} className="p-6 bg-zinc-900 border-zinc-800">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <h3 className="text-lg font-bold text-white">{booking.booking_reference}</h3>
                      <div
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          booking.payment_status === "paid"
                            ? "bg-green-500/20 text-green-400"
                            : booking.payment_status === "pending"
                              ? "bg-yellow-500/20 text-yellow-400"
                              : "bg-red-500/20 text-red-400"
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
                        <p className="text-zinc-500 mb-1">Parent</p>
                        <p className="text-white font-semibold">
                          {booking.profiles?.prenom} {booking.profiles?.nom}
                        </p>
                        <p className="text-zinc-400">{booking.profiles?.email}</p>
                        {booking.profiles?.telephone && <p className="text-zinc-400">{booking.profiles.telephone}</p>}
                      </div>

                      <div>
                        <p className="text-zinc-500 mb-1">Événement</p>
                        <p className="text-white font-semibold">{booking.events?.title}</p>
                        <p className="text-zinc-400">
                          {new Date(booking.events?.event_date).toLocaleDateString("fr-FR")}
                        </p>
                        <p className="text-zinc-400">{booking.events?.city}</p>
                      </div>

                      <div>
                        <p className="text-zinc-500 mb-1">Paiement</p>
                        <p className="text-cyan-400 font-bold text-lg">{booking.total_amount} DH</p>
                        {booking.payment_method && <p className="text-zinc-400 capitalize">{booking.payment_method}</p>}
                        <p className="text-zinc-500 text-xs">
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
                      className="bg-transparent border-cyan-500 text-cyan-400"
                    >
                      <Link href={`/admin/reservations/${booking.id}`}>Détails</Link>
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-12 text-center bg-zinc-900 border-zinc-800">
            <Ticket className="w-16 h-16 text-zinc-700 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Aucune réservation</h3>
            <p className="text-zinc-400">Les réservations apparaîtront ici</p>
          </Card>
        )}
      </div>
    </div>
  )
}
