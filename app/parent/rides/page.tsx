import { getUserRole } from "@/lib/auth/get-user-role"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { StickerCard } from "@/components/ui/sticker-card"
import { StatusBadge, type StatusVariant } from "@/components/ui/status-badge"
import { DarkSurface, NivEmpty } from "@/components/brand"
import Link from "next/link"
import { MapPin } from "lucide-react"

export const dynamic = "force-dynamic"

// Charte : statut DB → libellé FR + variante <StatusBadge>. Le live (en cours)
// porte le pulse.
const RIDE_STATUS: Record<string, { label: string; variant: StatusVariant; pulse?: boolean }> = {
  requested: { label: "En attente", variant: "warning" },
  approved: { label: "Validé", variant: "info" },
  dispatched: { label: "En route", variant: "info", pulse: true },
  in_progress: { label: "En cours", variant: "info", pulse: true },
  completed: { label: "Terminé", variant: "success" },
  cancelled: { label: "Annulé", variant: "neutral" },
  denied: { label: "Refusé", variant: "danger" },
}

function rideStatus(raw: string) {
  return RIDE_STATUS[raw] ?? { label: raw.replace(/_/g, " "), variant: "neutral" as StatusVariant }
}

export default async function ParentRidesPage() {
  const userInfo = await getUserRole()
  if (!userInfo || userInfo.role !== "parent") redirect("/login")
  const supabase = await createClient()

  // Polish-F: wrap with try/catch + capture error, surface as a banner.
  // Previously a silent `(rides ?? [])` would mask RLS / network failures
  // as a permanently-empty list.
  type RideRow = {
    id: string
    status: string
    pickup_address: string
    dropoff_address: string
    scheduled_for: string
    estimated_dh: number | null
    actual_dh: number | null
    driver_id?: string | null
    teen_id?: string | null
  }
  let rides: RideRow[] = []
  let loadError: string | null = null
  try {
    const { data, error } = await supabase
      .from("ride_bookings")
      .select(
        "id,status,pickup_address,dropoff_address,scheduled_for,estimated_dh,actual_dh,driver_id,teen_id"
      )
      .eq("parent_id", userInfo.profileId)
      .order("scheduled_for", { ascending: false })
      .limit(50)
    if (error) {
      console.error("[parent/rides] ride_bookings error:", error)
      loadError = "Impossible de charger les trajets pour le moment."
    } else {
      rides = (data ?? []) as RideRow[]
    }
  } catch (err) {
    console.error("[parent/rides] ride_bookings threw:", err)
    loadError = "Impossible de charger les trajets pour le moment."
  }

  const active = rides.filter((r) =>
    ["requested", "approved", "dispatched", "in_progress"].includes(r.status)
  )
  const past = rides.filter((r) =>
    ["completed", "cancelled", "denied"].includes(r.status)
  )

  return (
    <div className="container mx-auto p-4 md:p-8 space-y-8">
      {/* Header éditorial */}
      <header>
        <p className="eyebrow text-pink">TRANSPORT · TRAJETS</p>
        <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
          Où est <em className="font-semibold italic text-pink">ton ado</em> ?
        </h1>
        <p className="mt-2 text-sm text-mute">
          Suis les trajets en direct, valide les demandes en attente.
        </p>
      </header>

      {loadError && (
        <div
          role="alert"
          className="rounded-xl border-2 border-destructive bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          {loadError}
        </div>
      )}

      <section className="space-y-3">
        <h2 className="eyebrow text-mute">Trajets actifs</h2>
        {active.length === 0 ? (
          <NivEmpty
            title="Aucun trajet actif"
            description="Tout est calme — ton crew est bien arrivé 🚗"
            action={
              <Button asChild variant="pink">
                <Link href="/parent/teens">Configurer les autorisations transport</Link>
              </Button>
            }
          />
        ) : (
          active.map((r) => <ParentRow key={r.id} ride={r} live />)
        )}
      </section>

      <section className="space-y-3">
        <h2 className="eyebrow text-mute">Historique</h2>
        {past.length === 0 ? (
          <NivEmpty title="Aucun trajet passé" description="L'historique des trajets s'affichera ici." />
        ) : (
          past.map((r) => <ParentRow key={r.id} ride={r} />)
        )}
      </section>
    </div>
  )
}

interface RowProps {
  ride: {
    id: string
    status: string
    pickup_address: string
    dropoff_address: string
    scheduled_for: string
    estimated_dh: number | null
    actual_dh: number | null
  }
  live?: boolean
}

function ParentRow({ ride, live = false }: RowProps) {
  const dt = new Date(ride.scheduled_for)
  const status = rideStatus(ride.status)
  const amount = ride.actual_dh ?? ride.estimated_dh

  // Trajet actif = surface sombre night, itinéraire en gros, bouton « Suivre ».
  if (live) {
    return (
      <DarkSurface tone="lime" shadow className="p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 space-y-2">
            <StatusBadge variant={status.variant} label={status.label} pulse={status.pulse} size="sm" />
            <p className="flex items-center gap-2 font-display text-base font-bold text-paper">
              <MapPin className="h-4 w-4 shrink-0 text-lime" aria-hidden="true" />
              <span className="truncate">{ride.pickup_address} → {ride.dropoff_address}</span>
            </p>
            <p className="font-mono text-xs text-paper/60">{dt.toLocaleString("fr-FR")}</p>
          </div>
          <div className="flex items-center gap-4">
            <span className="font-mono text-base font-semibold tabular-nums text-paper">
              {amount ?? "—"} DH
            </span>
            <Button asChild variant="pink" size="sm">
              <Link href={`/parent/rides/${ride.id}`}>Suivre en direct</Link>
            </Button>
          </div>
        </div>
      </DarkSurface>
    )
  }

  return (
    <StickerCard variant="hover" className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-sm font-semibold text-ink">
            <MapPin className="h-4 w-4 shrink-0 text-mute" aria-hidden="true" />
            <span className="truncate">{ride.pickup_address} → {ride.dropoff_address}</span>
          </p>
          <p className="mt-1 font-mono text-xs text-mute">{dt.toLocaleString("fr-FR")}</p>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge variant={status.variant} label={status.label} size="sm" />
          <span className="font-mono text-sm font-semibold tabular-nums text-ink">
            {amount ?? "—"} DH
          </span>
          <Button asChild variant="outline" size="sm">
            <Link href={`/parent/rides/${ride.id}`}>Voir</Link>
          </Button>
        </div>
      </div>
    </StickerCard>
  )
}
