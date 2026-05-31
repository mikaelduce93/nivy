/**
 * /teen/rides — Rides hub.
 *
 * Refonte V2 (#158) — charte paper :
 * - Hero éditorial tutoyé (eyebrow mono + <em> rose).
 * - Trajets en <StickerCard> ; statuts FR en pills mono.
 * - États vides via <NivEmpty> (Niv calm).
 * - Préserve getUserRole/ride_bookings query + le split upcoming/history.
 */

import { getUserRole } from "@/lib/auth/get-user-role"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { StickerCard } from "@/components/ui/sticker-card"
import { NivEmpty } from "@/components/brand"
import Link from "next/link"
import { Plus, MapPin, Car } from "lucide-react"

export const dynamic = "force-dynamic"

// Libellé + ton FR mono par statut (présentation seulement).
const RIDE_STATUS: Record<string, { label: string; cls: string }> = {
  completed: { label: "Terminé", cls: "bg-lime/15 text-ink border-ink" },
  cancelled: { label: "Annulé", cls: "bg-muted text-mute border-ink" },
  denied: { label: "Refusé", cls: "bg-destructive/15 text-destructive border-ink" },
  in_progress: { label: "En route", cls: "bg-teal/15 text-ink border-ink" },
  dispatched: { label: "En route", cls: "bg-teal/15 text-ink border-ink" },
  pending: { label: "En attente", cls: "bg-gold/15 text-ink border-ink" },
  approved: { label: "Validé", cls: "bg-teal/15 text-ink border-ink" },
}

// Libellés FR des modes de paiement / fournisseurs (présentation seulement —
// jamais le slug DB brut, ex. "split_with_parent").
const PAYMENT_LABELS: Record<string, string> = {
  coins: "Coins ⊙",
  dh: "DH",
  cash: "Espèces",
  card: "Carte",
  split_with_parent: "Partagé parent",
  parent: "Payé par le parent",
}
const PROVIDER_LABELS: Record<string, string> = {
  careem: "Careem",
  yango: "Yango",
  heetch: "Heetch",
  indrive: "inDrive",
  nivy: "Nivy",
  internal: "Nivy",
}

export default async function TeenRidesPage() {
  const userInfo = await getUserRole()
  if (!userInfo || userInfo.role !== "teen") redirect("/login")
  const supabase = await createClient()

  const { data: rides } = await supabase
    .from("ride_bookings")
    .select(
      "id,status,pickup_address,dropoff_address,scheduled_for,provider,payment_method,estimated_dh,actual_dh,created_at"
    )
    .eq("teen_id", userInfo.profileId)
    .order("scheduled_for", { ascending: false })
    .limit(50)

  const now = new Date().toISOString()
  const upcoming = (rides ?? []).filter(
    (r) => r.scheduled_for >= now && !["completed", "cancelled", "denied"].includes(r.status)
  )
  const history = (rides ?? []).filter(
    (r) => r.scheduled_for < now || ["completed", "cancelled", "denied"].includes(r.status)
  )

  return (
    <div className="container mx-auto space-y-8 pt-6">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border-2 border-ink bg-teal/20">
            <Car className="h-7 w-7 text-ink" aria-hidden />
          </div>
          <div className="min-w-0">
            <p className="eyebrow tracking-[0.16em]">Mobilité</p>
            <h1 className="font-display text-4xl font-extrabold tracking-tight">
              Tes <em className="font-semibold italic text-pink">trajets</em>
            </h1>
            <p className="mt-1 text-sm text-mute">
              Réserve ton trajet, ton parent valide avant que ça parte.
            </p>
          </div>
        </div>
        <Link href="/teen/rides/request" className="shrink-0">
          <Button variant="pink" className="min-h-11">
            <Plus className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Nouveau trajet</span>
            <span className="sm:hidden">Nouveau</span>
          </Button>
        </Link>
      </div>

      <section className="space-y-3">
        <h2 className="font-mono text-[12px] font-bold uppercase tracking-[0.16em] text-mute">
          À venir
        </h2>
        {upcoming.length === 0 ? (
          <NivEmpty
            mood="calm"
            title="Aucun trajet à venir"
            description="Réserve un trajet pour rejoindre tes amis ou aller à un événement."
            action={
              <Button asChild variant="pink" className="min-h-11">
                <Link href="/teen/rides/request">Nouveau trajet</Link>
              </Button>
            }
          />
        ) : (
          <div className="space-y-3">
            {upcoming.map((r) => (
              <RideRow key={r.id} ride={r} />
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-mono text-[12px] font-bold uppercase tracking-[0.16em] text-mute">
          Historique
        </h2>
        {history.length === 0 ? (
          <NivEmpty
            mood="calm"
            title="Aucun trajet passé"
            description="Tes trajets terminés s'afficheront ici une fois ton premier ride complété."
          />
        ) : (
          <div className="space-y-3">
            {history.map((r) => (
              <RideRow key={r.id} ride={r} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

interface RideRowProps {
  ride: {
    id: string
    status: string
    pickup_address: string
    dropoff_address: string
    scheduled_for: string
    estimated_dh: number | null
    actual_dh: number | null
    payment_method: string
    provider: string
  }
}

function RideRow({ ride }: RideRowProps) {
  const dt = new Date(ride.scheduled_for)
  const status = RIDE_STATUS[ride.status] ?? {
    label: ride.status,
    cls: "bg-muted text-mute border-ink",
  }
  return (
    <StickerCard className="gap-0 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-2 text-sm font-bold text-ink">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <span className="line-clamp-2 break-words">
              {ride.pickup_address} → {ride.dropoff_address}
            </span>
          </div>
          <div className="mt-1 font-mono text-xs text-mute">
            {[
              dt.toLocaleString("fr-FR"),
              ride.provider ? (PROVIDER_LABELS[ride.provider] ?? ride.provider) : null,
              ride.payment_method
                ? (PAYMENT_LABELS[ride.payment_method] ?? ride.payment_method)
                : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <span
            className={`inline-flex items-center rounded-full border-2 px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.1em] ${status.cls}`}
          >
            {status.label}
          </span>
          <span className="font-mono text-sm font-bold tabular-nums text-ink">
            {ride.actual_dh ?? ride.estimated_dh ?? "—"} DH
          </span>
        </div>
      </div>
    </StickerCard>
  )
}
