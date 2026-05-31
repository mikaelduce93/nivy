import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Plus, Edit, Eye, Trash2, Users, Coins } from "lucide-react"
import { Button } from "@/components/ui/button"
import { StickerCard } from "@/components/ui/sticker-card"
import { SegmentedProgress } from "@/components/ui/progress"
import { NivEmpty } from "@/components/brand"
import Image from "next/image"
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
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-16">
        <BackButton href="/admin" label="Retour au dashboard" />
        <div className="mb-8 mt-4 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow tracking-[0.16em] text-pink">Admin · Programmation</p>
            <h1 className="mt-2 font-display text-4xl font-extrabold tracking-tight text-ink">
              Tes <em className="font-semibold italic text-pink">événements</em>
            </h1>
            <p className="mt-2 text-mute">Crée, suis et remplis chaque date.</p>
          </div>
          <Button
            asChild
            className="rounded-full border-2 border-ink bg-ink text-paper shadow-stkr-pink hover:bg-ink hover:text-paper"
          >
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
              const fillRatio =
                event.capacity > 0
                  ? Math.min(1, event.bookings_count / event.capacity)
                  : 0

              return (
                <StickerCard key={event.id} variant="hover" className="p-6">
                  <div className="flex flex-col gap-6 md:flex-row">
                    <div className="relative h-32 w-full flex-shrink-0 overflow-hidden rounded-xl border-2 border-ink md:w-48">
                      <Image
                        src={event.image_url || "/placeholder.svg?height=128&width=192&query=event"}
                        alt={event.title}
                        fill
                        sizes="192px"
                        className="object-cover"
                        loading="lazy"
                      />
                      {isSoldOut && (
                        <div className="absolute inset-0 bg-ink/60 flex items-center justify-center">
                          <span className="font-mono text-sm font-bold uppercase tracking-[0.16em] text-paper">
                            Complet
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex-1">
                      <div className="mb-3 flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="eyebrow tracking-[0.14em] text-mute">
                            {event.city} · {new Date(event.event_date).toLocaleDateString("fr-FR")}
                          </p>
                          <h3 className="mt-1 font-display text-xl font-extrabold tracking-tight text-ink">
                            {event.title}
                          </h3>
                          <div className="mt-2 flex items-center gap-2 text-sm">
                            <Users className="w-4 h-4 text-teal" />
                            <span className="font-mono text-ink-2">
                              {event.bookings_count} / {event.capacity}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {isPast && (
                            <span className="rounded-full border-2 border-ink bg-white px-3 py-1 font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-mute">
                              Passé
                            </span>
                          )}
                          {event.status === "published" && !isPast && (
                            <span className="rounded-full border-2 border-ink bg-ink px-3 py-1 font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-paper">
                              Publié
                            </span>
                          )}
                          {event.status === "draft" && (
                            <span className="rounded-full border-2 border-ink bg-white px-3 py-1 font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-gold">
                              Brouillon
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Taux de remplissage */}
                      <SegmentedProgress
                        steps={10}
                        current={Math.round(fillRatio * 10)}
                        size="md"
                        className="mb-4"
                      />

                      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                        <div className="rounded-xl border-2 border-ink bg-white p-3">
                          <p className="eyebrow text-mute">Prix standard</p>
                          <p className="mt-1 font-mono text-lg font-bold text-teal">{event.base_price} DH</p>
                        </div>
                        {event.vip_price && (
                          <div className="rounded-xl border-2 border-ink bg-white p-3">
                            <p className="eyebrow text-mute">Prix VIP</p>
                            <p className="mt-1 font-mono text-lg font-bold text-pink">{event.vip_price} DH</p>
                          </div>
                        )}
                        <div className="rounded-xl border-2 border-ink bg-white p-3">
                          <p className="eyebrow text-mute">Réservations</p>
                          <p className="mt-1 font-mono text-lg font-bold text-ink">{event.bookings_count}</p>
                        </div>
                        <div className="rounded-xl border-2 border-ink bg-white p-3">
                          <p className="eyebrow text-mute">Revenus</p>
                          <p className="mt-1 flex items-center gap-1 font-display text-lg font-extrabold text-coral">
                            <Coins className="h-4 w-4" />
                            {event.revenue} DH
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Button
                          asChild
                          size="sm"
                          variant="outline"
                          className="border-2 border-ink bg-transparent text-ink"
                        >
                          <Link href={`/agenda/${event.slug}`}>
                            <Eye className="w-4 h-4 mr-2" />
                            Voir
                          </Link>
                        </Button>
                        <Button
                          asChild
                          size="sm"
                          variant="outline"
                          className="border-2 border-ink bg-transparent text-ink"
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
                          className="border-2 border-ink bg-transparent text-coral"
                        >
                          <Link href={`/admin/evenements/${event.id}/supprimer`}>
                            <Trash2 className="w-4 h-4 mr-2" />
                            Supprimer
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </div>
                </StickerCard>
              )
            })}
          </div>
        ) : (
          <NivEmpty
            title="Aucun événement pour l'instant"
            description="Crée ta première date pour lancer la billetterie."
            action={
              <Button
                asChild
                className="rounded-full border-2 border-ink bg-ink text-paper shadow-stkr-pink hover:bg-ink hover:text-paper"
              >
                <Link href="/admin/evenements/creer">
                  <Plus className="w-4 h-4 mr-2" />
                  Créer un événement
                </Link>
              </Button>
            }
          />
        )}
      </div>
    </div>
  )
}
