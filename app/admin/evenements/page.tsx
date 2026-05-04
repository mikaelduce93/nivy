import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Calendar, Plus, Edit, Eye, Trash2, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import Link from "next/link"
import BackButton from "@/components/admin/BackButton"

export default async function AdminEventsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login?redirect=/admin/evenements")
  }

  const { data: adminRole } = await supabase.from("admin_roles").select("*").eq("profile_id", user.id).single()

  if (!adminRole) {
    redirect("/")
  }

  const { data: events } = await supabase.from("events").select("*").order("event_date", { ascending: false })

  const eventsWithStats = await Promise.all(
    (events || []).map(async (event) => {
      const { count: bookingsCount } = await supabase
        .from("bookings")
        .select("*", { count: "exact", head: true })
        .eq("event_id", event.id)

      const { data: revenue } = await supabase
        .from("bookings")
        .select("total_amount")
        .eq("event_id", event.id)
        .eq("payment_status", "paid")

      const totalRevenue = revenue?.reduce((sum, b) => sum + (b.total_amount || 0), 0) || 0

      return {
        ...event,
        bookings_count: bookingsCount || 0,
        revenue: totalRevenue,
      }
    }),
  )

  return (
    <div className="min-h-screen bg-zinc-950">
      <div className="container mx-auto px-6 py-32">
        <BackButton href="/admin" label="Retour au dashboard" />
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-black text-white mb-2">Gestion des événements</h1>
            <p className="text-zinc-400">Créez et gérez tous vos événements</p>
          </div>
          <Button asChild className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600">
            <Link href="/admin/evenements/creer">
              <Plus className="w-4 h-4 mr-2" />
              Créer un événement
            </Link>
          </Button>
        </div>

        {eventsWithStats && eventsWithStats.length > 0 ? (
          <div className="grid gap-6">
            {eventsWithStats.map((event) => {
              const isPast = new Date(event.event_date) < new Date()
              const isSoldOut = event.available_spots === 0

              return (
                <Card key={event.id} className="p-6 bg-zinc-900 border-zinc-800">
                  <div className="flex gap-6">
                    <div className="relative w-48 h-32 rounded-xl overflow-hidden flex-shrink-0">
                      <img
                        src={event.image_url || "/placeholder.svg?height=128&width=192&query=event"}
                        alt={event.title}
                        className="w-full h-full object-cover"
                      />
                      {isSoldOut && (
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                          <span className="text-white font-bold text-sm">COMPLET</span>
                        </div>
                      )}
                    </div>

                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="text-xl font-bold text-white mb-1">{event.title}</h3>
                          <p className="text-zinc-400 text-sm mb-2">{event.city}</p>
                          <div className="flex items-center gap-4 text-sm">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-cyan-400" />
                              <span className="text-zinc-300">
                                {new Date(event.event_date).toLocaleDateString("fr-FR")}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Users className="w-4 h-4 text-cyan-400" />
                              <span className="text-zinc-300">
                                {event.bookings_count} / {event.capacity}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {isPast && (
                            <div className="px-3 py-1 rounded-full bg-zinc-800 text-zinc-400 text-xs font-semibold">
                              PASSÉ
                            </div>
                          )}
                          {event.status === "published" && !isPast && (
                            <div className="px-3 py-1 rounded-full bg-green-500/20 text-green-400 text-xs font-semibold">
                              PUBLIÉ
                            </div>
                          )}
                          {event.status === "draft" && (
                            <div className="px-3 py-1 rounded-full bg-yellow-500/20 text-yellow-400 text-xs font-semibold">
                              BROUILLON
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-4 gap-4 mb-4">
                        <div className="bg-zinc-950 rounded-lg p-3">
                          <p className="text-xs text-zinc-500 mb-1">Prix standard</p>
                          <p className="text-lg font-bold text-cyan-400">{event.base_price} DH</p>
                        </div>
                        {event.vip_price && (
                          <div className="bg-zinc-950 rounded-lg p-3">
                            <p className="text-xs text-zinc-500 mb-1">Prix VIP</p>
                            <p className="text-lg font-bold text-purple-400">{event.vip_price} DH</p>
                          </div>
                        )}
                        <div className="bg-zinc-950 rounded-lg p-3">
                          <p className="text-xs text-zinc-500 mb-1">Réservations</p>
                          <p className="text-lg font-bold text-white">{event.bookings_count}</p>
                        </div>
                        <div className="bg-zinc-950 rounded-lg p-3">
                          <p className="text-xs text-zinc-500 mb-1">Revenus</p>
                          <p className="text-lg font-bold text-green-400">{event.revenue} DH</p>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          asChild
                          size="sm"
                          variant="outline"
                          className="bg-transparent border-cyan-500 text-cyan-400"
                        >
                          <Link href={`/evenements/${event.slug}`}>
                            <Eye className="w-4 h-4 mr-2" />
                            Voir
                          </Link>
                        </Button>
                        <Button
                          asChild
                          size="sm"
                          variant="outline"
                          className="bg-transparent border-blue-500 text-blue-400"
                        >
                          <Link href={`/admin/evenements/${event.id}/modifier`}>
                            <Edit className="w-4 h-4 mr-2" />
                            Modifier
                          </Link>
                        </Button>
                        <Button
                          asChild
                          size="sm"
                          variant="outline"
                          className="bg-transparent border-red-500 text-red-400"
                        >
                          <Link href={`/admin/evenements/${event.id}/supprimer`}>
                            <Trash2 className="w-4 h-4 mr-2" />
                            Supprimer
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        ) : (
          <Card className="p-12 text-center bg-zinc-900 border-zinc-800">
            <Calendar className="w-16 h-16 text-zinc-700 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Aucun événement</h3>
            <p className="text-zinc-400 mb-6">Créez votre premier événement pour commencer</p>
            <Button asChild className="bg-gradient-to-r from-cyan-500 to-blue-500">
              <Link href="/admin/evenements/creer">
                <Plus className="w-4 h-4 mr-2" />
                Créer un événement
              </Link>
            </Button>
          </Card>
        )}
      </div>
    </div>
  )
}
