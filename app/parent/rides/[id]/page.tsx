import { getUserRole } from "@/lib/auth/get-user-role"
import { redirect, notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import Link from "next/link"
import { ArrowLeft, MapPin, Phone, Car, Star } from "lucide-react"
import { Button } from "@/components/ui/button"
import { StickerCard } from "@/components/ui/sticker-card"
import { StatusBadge, type StatusVariant } from "@/components/ui/status-badge"
import { DarkSurface, NivCoach } from "@/components/brand"
import { RideMap } from "./ride-map"
import { RideActions } from "./ride-actions"

export const dynamic = "force-dynamic"

interface Props {
  params: Promise<{ id: string }>
}

// Charte : statut DB → libellé FR + variante + pulse pour le live.
const RIDE_STATUS: Record<string, { label: string; variant: StatusVariant; live?: boolean }> = {
  requested: { label: "En attente", variant: "warning" },
  approved: { label: "Validé", variant: "info" },
  dispatched: { label: "En route", variant: "info", live: true },
  in_progress: { label: "En cours", variant: "info", live: true },
  completed: { label: "Terminé", variant: "success" },
  cancelled: { label: "Annulé", variant: "neutral" },
  denied: { label: "Refusé", variant: "danger" },
}

// Libellés FR pour provider / méthode de paiement (étaient affichés bruts).
const PROVIDER_LABELS: Record<string, string> = {
  internal: "Nivy",
  nivy: "Nivy",
  careem: "Careem",
  yango: "Yango",
  indrive: "InDrive",
}
const PAYMENT_LABELS: Record<string, string> = {
  card: "Carte bancaire",
  coins: "Coins",
  cash: "Espèces",
  wallet: "Portefeuille",
  topup: "Solde rechargé",
}

function mapLabel(map: Record<string, string>, raw: string | null | undefined): string {
  if (!raw) return "—"
  return map[raw] ?? raw.replace(/_/g, " ")
}

export default async function ParentRideDetailPage({ params }: Props) {
  const userInfo = await getUserRole()
  if (!userInfo || userInfo.role !== "parent") redirect("/login")
  const { id } = await params
  const supabase = await createClient()

  const { data: ride } = await supabase
    .from("ride_bookings")
    .select(
      "id,status,pickup_address,dropoff_address,pickup_lat,pickup_lng,dropoff_lat,dropoff_lng,scheduled_for,estimated_dh,actual_dh,driver_id,teen_id,parent_id,payment_method,provider"
    )
    .eq("id", id)
    .maybeSingle()
  if (!ride || ride.parent_id !== userInfo.profileId) notFound()

  const { data: tracks } = await supabase
    .from("ride_tracks")
    .select("lat,lng,speed,heading,captured_at")
    .eq("ride_id", id)
    .order("captured_at", { ascending: true })
    .limit(500)

  const { data: driver } = ride.driver_id
    ? await supabase
        .from("nivy_drivers")
        .select("full_name,phone,vehicle_make,vehicle_model,vehicle_plate,rating")
        .eq("id", ride.driver_id)
        .maybeSingle()
    : { data: null }

  const status = RIDE_STATUS[ride.status] ?? {
    label: ride.status.replace(/_/g, " "),
    variant: "neutral" as StatusVariant,
  }
  const isLive = Boolean(status.live)
  const amount = ride.actual_dh ?? ride.estimated_dh

  return (
    <div className="container mx-auto p-4 md:p-8 space-y-6 max-w-4xl">
      <Button variant="ghost" asChild className="text-mute hover:text-ink">
        <Link href="/parent/rides">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Tous les trajets
        </Link>
      </Button>

      {/* En-tête surface sombre : statut + coût hero */}
      <DarkSurface tone={isLive ? "lime" : "teal"} shadow className="p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-3">
            <p className="eyebrow tracking-[0.16em] text-paper/60">TRAJET</p>
            <StatusBadge variant={status.variant} label={status.label} pulse={isLive} />
            <p className="flex items-center gap-2 font-display text-lg font-bold text-paper">
              <MapPin className="h-5 w-5 shrink-0 text-lime" aria-hidden="true" />
              <span>{ride.pickup_address} → {ride.dropoff_address}</span>
            </p>
            <p className="font-mono text-xs text-paper/60">
              {new Date(ride.scheduled_for).toLocaleString("fr-FR")}
            </p>
          </div>
          <div className="text-right">
            <p className="eyebrow tracking-[0.16em] text-paper/60">Coût</p>
            <p className="mt-1 font-display text-4xl font-extrabold tabular-nums text-lime">
              {amount ?? "—"}
              <span className="ml-1.5 font-mono text-base font-medium text-paper/60">DH</span>
            </p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 border-t border-paper/15 pt-4">
          <div>
            <p className="eyebrow text-[10px] text-paper/50">Service</p>
            <p className="mt-0.5 font-mono text-sm text-paper">{mapLabel(PROVIDER_LABELS, ride.provider)}</p>
          </div>
          <div>
            <p className="eyebrow text-[10px] text-paper/50">Paiement</p>
            <p className="mt-0.5 font-mono text-sm text-paper">{mapLabel(PAYMENT_LABELS, ride.payment_method)}</p>
          </div>
        </div>
      </DarkSurface>

      {/* Carte chauffeur — identité rassurante */}
      {driver && (
        <StickerCard className="p-5">
          <p className="eyebrow mb-3 text-mute">Chauffeur</p>
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <p className="font-display text-lg font-bold text-ink">{driver.full_name}</p>
              <p className="flex items-center gap-2 text-sm text-ink-2">
                <Car className="h-4 w-4 text-mute" aria-hidden="true" />
                {driver.vehicle_make} {driver.vehicle_model}
              </p>
              <p className="flex items-center gap-2 text-sm text-ink-2">
                <Phone className="h-4 w-4 text-mute" aria-hidden="true" />
                <span className="font-mono">{driver.phone}</span>
              </p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <span className="inline-flex items-center gap-1 rounded-full border-2 border-ink bg-gold/20 px-2.5 py-1 font-mono text-xs font-bold text-ink">
                <Star className="h-3 w-3 text-gold" aria-hidden="true" />
                {driver.rating ?? "—"}
              </span>
              <span className="rounded-xl border-2 border-ink bg-paper px-3 py-1.5 font-mono text-sm font-bold tabular-nums text-ink">
                {driver.vehicle_plate}
              </span>
            </div>
          </div>
        </StickerCard>
      )}

      {/* Carte en direct — héros pleine largeur */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="eyebrow text-pink">{isLive ? "EN DIRECT" : "ITINÉRAIRE"}</p>
          {isLive && <StatusBadge variant="info" label="Suivi GPS actif" pulse size="sm" />}
        </div>
        {isLive && (
          <NivCoach
            mood="calm"
            tone="paper"
            message="Je suis le trajet pour toi. Tu peux contacter le chauffeur à tout moment."
          />
        )}
        <StickerCard className="overflow-hidden p-0">
          <RideMap
            tracks={tracks ?? []}
            pickup={
              ride.pickup_lat && ride.pickup_lng
                ? { lat: Number(ride.pickup_lat), lng: Number(ride.pickup_lng) }
                : null
            }
            dropoff={
              ride.dropoff_lat && ride.dropoff_lng
                ? { lat: Number(ride.dropoff_lat), lng: Number(ride.dropoff_lng) }
                : null
            }
          />
        </StickerCard>
      </section>

      <RideActions rideId={ride.id} status={ride.status} />
    </div>
  )
}
