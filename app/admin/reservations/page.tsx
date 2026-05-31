import { createClient } from "@/lib/supabase/server"
import { redirect } from 'next/navigation'
import { Search } from 'lucide-react'
import { Input } from "@/components/ui/input"
import Link from "next/link"
import BackButton from "@/components/admin/BackButton"
import { StatCard } from "@/components/admin/stat-card"
import { StickerCard } from "@/components/ui/sticker-card"
import { NivEmpty } from "@/components/brand"
import { ReservationsExportButton } from "./export-client"

const STATUS_FILTERS = [
  { value: "all", label: "Toutes" },
  { value: "paid", label: "Payées" },
  { value: "pending", label: "En attente" },
] as const

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

  const currentStatus = status || "all"

  return (
    <div className="container mx-auto px-4 sm:px-6 py-8 sm:py-10">
      <BackButton href="/admin" label="Retour au dashboard" />

      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <p className="eyebrow text-mute">Réservations</p>
          <h1 className="font-display text-4xl font-extrabold tracking-tight text-ink">
            Gérer les <em className="font-semibold italic text-pink">réservations</em>
          </h1>
          <p className="text-mute">Suivez et gérez toutes les réservations événements.</p>
        </div>
        <ReservationsExportButton rows={bookings ?? []} />
      </header>

      <section className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Total" value={stats.total} tone="paper" />
        <StatCard label="Confirmées" value={stats.confirmed} tone="lime" />
        <StatCard label="En attente" value={stats.pending} tone="gold" />
        <StatCard label="Annulées" value={stats.cancelled} tone="coral" />
      </section>

      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <form method="GET" className="relative flex-1 lg:max-w-md">
          {status && status !== "all" ? <input type="hidden" name="status" value={status} /> : null}
          <Search className="pointer-events-none absolute left-3 top-1/2 w-5 h-5 -translate-y-1/2 text-mute" />
          <Input
            name="search"
            defaultValue={search ?? ""}
            placeholder="Rechercher par référence, nom, email..."
            className="rounded-xl border-2 border-ink bg-white pl-10"
          />
        </form>

        <div className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map((f) => {
            const active = currentStatus === f.value
            const href = f.value === "all"
              ? (search ? `/admin/reservations?search=${encodeURIComponent(search)}` : "/admin/reservations")
              : `/admin/reservations?status=${f.value}${search ? `&search=${encodeURIComponent(search)}` : ""}`
            return (
              <Link
                key={f.value}
                href={href}
                className={`inline-flex min-h-touch items-center rounded-xl border-2 border-ink px-4 py-2 font-mono text-[12px] font-bold uppercase tracking-[0.12em] transition-all ${
                  active
                    ? "-translate-x-0.5 -translate-y-0.5 bg-ink text-paper shadow-stkr-pink"
                    : "bg-white text-mute hover:text-ink"
                }`}
              >
                {f.label}
              </Link>
            )
          })}
        </div>
      </div>

      {filteredBookings && filteredBookings.length > 0 ? (
        <div className="space-y-4">
          {filteredBookings.map((booking) => (
            <StickerCard key={booking.id} variant="hover" className="p-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="mb-3 flex flex-wrap items-center gap-3">
                    <h3 className="font-mono text-lg font-bold text-pink">{booking.booking_reference}</h3>
                    <StatusPill status={booking.status === "cancelled" ? "cancelled" : booking.payment_status} />
                  </div>

                  <div className="grid gap-4 text-sm sm:grid-cols-3">
                    <div>
                      <p className="eyebrow mb-1 text-mute">Parent</p>
                      <p className="font-semibold text-ink">
                        {booking.profiles?.prenom} {booking.profiles?.nom}
                      </p>
                      <p className="text-mute">{booking.profiles?.email}</p>
                      {booking.profiles?.telephone && <p className="text-mute">{booking.profiles.telephone}</p>}
                    </div>

                    <div>
                      <p className="eyebrow mb-1 text-mute">Événement</p>
                      <p className="font-semibold text-ink">{booking.events?.title}</p>
                      <p className="text-mute">
                        {booking.events?.event_date
                          ? new Date(booking.events.event_date).toLocaleDateString("fr-FR")
                          : "—"}
                      </p>
                      <p className="text-mute">{booking.events?.city}</p>
                    </div>

                    <div>
                      <p className="eyebrow mb-1 text-mute">Paiement</p>
                      <p className="font-mono text-lg font-bold text-teal tabular-nums">{booking.total_amount} DH</p>
                      {booking.payment_method && <p className="text-mute capitalize">{booking.payment_method}</p>}
                      <p className="text-xs text-mute">
                        {new Date(booking.created_at).toLocaleDateString("fr-FR")}
                      </p>
                    </div>
                  </div>
                </div>

                <Link
                  href={`/admin/reservations/${booking.id}`}
                  className="inline-flex min-h-touch shrink-0 items-center justify-center rounded-xl border-2 border-ink bg-white px-4 py-2 font-mono text-[12px] font-bold uppercase tracking-[0.12em] text-ink shadow-stkr-sm transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-stkr-pink"
                >
                  Détails
                </Link>
              </div>
            </StickerCard>
          ))}
        </div>
      ) : (
        <NivEmpty
          title="Aucune réservation"
          description="Les réservations apparaîtront ici dès qu'un parent réserve un événement."
        />
      )}
    </div>
  )
}

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
