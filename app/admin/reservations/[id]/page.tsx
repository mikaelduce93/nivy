import type { Metadata } from "next"
import Link from "next/link"
import { redirect, notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { StickerCard } from "@/components/ui/sticker-card"
import { StatHero } from "@/components/brand"
import { Button } from "@/components/ui/button"
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Mail,
  Phone,
  User,
  CreditCard,
} from "lucide-react"

export const metadata: Metadata = { title: "Détail réservation — Admin" }

function StatusPill({ status }: { status?: string | null }) {
  const map: Record<string, { label: string; cls: string }> = {
    paid: { label: "Payé", cls: "bg-lime/15 text-lime" },
    pending: { label: "En attente", cls: "bg-gold/15 text-gold" },
    cancelled: { label: "Annulé", cls: "bg-coral/15 text-coral" },
  }
  const it = map[status ?? ""] ?? { label: (status ?? "—").toUpperCase(), cls: "bg-white text-mute" }
  return (
    <span className={`inline-flex items-center rounded-full border-2 border-ink px-3 py-1 font-mono text-[11px] font-bold uppercase tracking-[0.1em] ${it.cls}`}>
      {it.label}
    </span>
  )
}

export default async function AdminReservationDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
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

  // bookings n'a pas de FK vers profiles (seulement event_id) — on résout le
  // réservant (user_id) par une requête séparée plutôt qu'un embed cassé.
  const { data: booking } = await supabase
    .from("bookings")
    .select(`
      *,
      events (title, event_date, city)
    `)
    .eq("id", id)
    .single()

  if (!booking) {
    notFound()
  }

  let booker: { full_name: string | null; email: string | null } | null = null
  if (booking.user_id) {
    const { data: bk } = await supabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", booking.user_id)
      .maybeSingle()
    booker = (bk as { full_name: string | null; email: string | null } | null) ?? null
  }

  const effectiveStatus = booking.status === "cancelled" ? "cancelled" : booking.payment_status

  return (
    <div className="container mx-auto space-y-8 px-4 sm:px-6 py-8 sm:py-10">
      <div className="space-y-2">
        <Button variant="ghost" size="sm" asChild className="-ml-2 mb-1">
          <Link href="/admin/reservations">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Réservations
          </Link>
        </Button>
        <p className="eyebrow text-mute">Réservation</p>
        <h1 className="font-display text-3xl font-extrabold tracking-tight text-ink">
          Réservation <em className="font-mono not-italic text-pink">{booking.booking_reference}</em>
        </h1>
        <p className="text-sm text-mute">
          Réservée le {new Date(booking.created_at).toLocaleDateString("fr-FR", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Événement */}
          <StickerCard className="gap-4 p-6">
            <h2 className="flex items-center gap-2 font-display text-lg font-bold text-ink">
              <Calendar className="h-5 w-5 text-pink" />
              Événement
            </h2>
            <p className="font-display text-xl font-bold text-ink">{booking.events?.title || "Événement inconnu"}</p>
            <div className="flex flex-wrap gap-4 text-sm text-mute">
              <span className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                {booking.events?.event_date
                  ? new Date(booking.events.event_date).toLocaleDateString("fr-FR", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })
                  : "—"}
              </span>
              {booking.events?.city && (
                <span className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  {booking.events.city}
                </span>
              )}
            </div>
          </StickerCard>

          {/* Parent */}
          <StickerCard className="gap-3 p-6">
            <h2 className="flex items-center gap-2 font-display text-lg font-bold text-ink">
              <User className="h-5 w-5 text-teal" />
              Parent
            </h2>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-ink bg-teal/15">
                <User className="h-5 w-5 text-teal" />
              </div>
              <p className="font-bold text-ink">
                {booker?.full_name || "—"}
              </p>
            </div>
            {booker?.email && (
              <div className="flex items-center gap-3 text-mute">
                <Mail className="h-4 w-4" />
                <a href={`mailto:${booker.email}`} className="transition-colors hover:text-ink">
                  {booker.email}
                </a>
              </div>
            )}
            {booking.profiles?.telephone && (
              <div className="flex items-center gap-3 text-mute">
                <Phone className="h-4 w-4" />
                <a href={`tel:${booking.profiles.telephone}`} className="transition-colors hover:text-ink">
                  {booking.profiles.telephone}
                </a>
              </div>
            )}
          </StickerCard>

          {/* Actions — aucune route de modération de réservation n'existe à ce
              jour ; surfacées désactivées plutôt que d'inventer de la logique. */}
          <StickerCard className="gap-3 p-6">
            <h2 className="font-display text-lg font-bold text-ink">Actions admin</h2>
            <p className="text-sm text-mute">
              La modération des réservations (relance paiement, check-in, annulation) n'est pas encore branchée côté serveur.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" disabled>Relancer le paiement</Button>
              <Button variant="outline" disabled>Marquer présent</Button>
              <Button variant="outline" disabled className="text-coral">Annuler</Button>
            </div>
          </StickerCard>
        </div>

        {/* Sidebar — paiement dominant */}
        <div className="space-y-6">
          <StatHero
            eyebrow="Paiement"
            tone="teal"
            value={booking.total_amount?.toLocaleString() ?? 0}
            unit="DH"
            icon={<CreditCard className="h-5 w-5" />}
          >
            <div className="flex items-center justify-between">
              <StatusPill status={effectiveStatus} />
              {booking.payment_method && (
                <span className="font-mono text-xs uppercase tracking-[0.1em] text-paper/60 capitalize">
                  {booking.payment_method}
                </span>
              )}
            </div>
            {booking.paid_at && (
              <p className="mt-3 text-xs text-paper/60">
                Payé le {new Date(booking.paid_at).toLocaleDateString("fr-FR")}
              </p>
            )}
          </StatHero>

          <StickerCard className="gap-3 p-6">
            <span className="eyebrow text-mute">Récapitulatif</span>
            <div className="flex justify-between text-sm">
              <span className="text-mute">Statut réservation</span>
              <span className="font-medium text-ink capitalize">{booking.status || "—"}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-mute">Statut paiement</span>
              <span className="font-medium text-ink capitalize">{booking.payment_status || "—"}</span>
            </div>
            {booking.xp_used ? (
              <div className="flex justify-between text-sm">
                <span className="text-mute">XP utilisés</span>
                <span className="font-mono font-medium text-gold tabular-nums">{booking.xp_used}</span>
              </div>
            ) : null}
          </StickerCard>
        </div>
      </div>
    </div>
  )
}
