/**
 * /teen/rides — Rides hub.
 *
 * V1.3-B mobile polish:
 * - Dock clearance hoisted to TeenLayout.
 * - h1 bumped to 4xl + italic to match teen surfaces.
 * - "Nouveau trajet" CTA gets shrink-0 + min-h-11 (44px touch).
 * - Long pickup/dropoff addresses truncate via line-clamp-1 to avoid overflow.
 * - Cards use design-system tokens via existing shadcn Card (which inherits
 *   border + bg-card from CSS variables) — no raw cyan/emerald hex.
 */

import { getUserRole } from "@/lib/auth/get-user-role"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { StatusBadge, type StatusVariant } from "@/components/ui/status-badge"
import { H1 } from "@/components/ui/headings"
import Link from "next/link"
import { Plus, MapPin, Car } from "lucide-react"
import { EmptyState } from "@/components/ui/states/empty-state"

export const dynamic = "force-dynamic"

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
    <div className="container mx-auto space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-info-soft to-success-soft">
            <Car className="h-6 w-6 text-black" aria-hidden />
          </div>
          <div className="min-w-0">
            <H1 className="text-4xl font-black tracking-tighter uppercase leading-none">
              Mes trajets
            </H1>
            <p className="mt-1 text-sm text-muted-foreground">
              Réservez vos trajets — chaque demande est validée par votre parent.
            </p>
          </div>
        </div>
        <Link href="/teen/rides/request" className="shrink-0">
          <Button className="min-h-11">
            <Plus className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Nouveau trajet</span>
            <span className="sm:hidden">Nouveau</span>
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>À venir</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {upcoming.length === 0 ? (
            <EmptyState
              size="small"
              icon={Car}
              title="Aucun trajet à venir"
              description="Réserve un trajet pour rejoindre tes amis ou aller à un événement."
              action={{ label: "Nouveau trajet", href: "/teen/rides/request" }}
            />
          ) : (
            upcoming.map((r) => <RideRow key={r.id} ride={r} />)
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Historique</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {history.length === 0 ? (
            <EmptyState
              size="small"
              icon={MapPin}
              title="Aucun trajet passé"
              description="Tes trajets terminés s'afficheront ici une fois ton premier ride complété."
            />
          ) : (
            history.map((r) => <RideRow key={r.id} ride={r} />)
          )}
        </CardContent>
      </Card>
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
  return (
    <div className="flex items-start justify-between gap-3 rounded-md border border-border p-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-2 text-sm font-medium text-foreground">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span className="line-clamp-2 break-words">
            {ride.pickup_address} → {ride.dropoff_address}
          </span>
        </div>
        <div className="mt-1 text-xs text-muted-foreground">
          {dt.toLocaleString("fr-FR")} · {ride.provider} · {ride.payment_method}
        </div>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <StatusBadge
          variant={statusVariant(ride.status)}
          size="sm"
          label={ride.status}
        />
        <span className="text-sm font-semibold tabular-nums text-foreground">
          {ride.actual_dh ?? ride.estimated_dh ?? "—"} DH
        </span>
      </div>
    </div>
  )
}

function statusVariant(status: string): StatusVariant {
  if (status === "completed") return "success"
  if (status === "cancelled" || status === "denied") return "danger"
  if (status === "in_progress" || status === "dispatched") return "info"
  if (status === "pending" || status === "approved") return "pending"
  return "neutral"
}
