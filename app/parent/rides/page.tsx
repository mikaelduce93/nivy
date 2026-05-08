import { getUserRole } from "@/lib/auth/get-user-role"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Eye, MapPin } from "lucide-react"

export const dynamic = "force-dynamic"

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
    <div className="container mx-auto p-4 md:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Trajets de mes ados</h1>
        <p className="text-muted-foreground text-sm">
          Suivez les trajets en direct, validez les demandes en attente.
        </p>
      </div>

      {loadError && (
        <div
          role="alert"
          className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200"
        >
          {loadError}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Actifs</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {active.length === 0 ? (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Aucun trajet actif.</p>
              <Link
                href="/parent/teens"
                className="inline-block text-xs text-emerald-400 hover:underline"
              >
                Configurer les autorisations transport →
              </Link>
            </div>
          ) : (
            active.map((r) => <ParentRow key={r.id} ride={r} />)
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Historique</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {past.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun trajet passé.</p>
          ) : (
            past.map((r) => <ParentRow key={r.id} ride={r} />)
          )}
        </CardContent>
      </Card>
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
}

function ParentRow({ ride }: RowProps) {
  const dt = new Date(ride.scheduled_for)
  return (
    <div className="flex items-start justify-between border rounded-md p-3">
      <div>
        <div className="text-sm font-medium flex items-center gap-2">
          <MapPin className="w-4 h-4" /> {ride.pickup_address} → {ride.dropoff_address}
        </div>
        <div className="text-xs text-muted-foreground mt-1">{dt.toLocaleString("fr-FR")}</div>
      </div>
      <div className="flex items-center gap-2">
        <Badge variant="outline">{ride.status}</Badge>
        <span className="text-sm font-semibold">
          {ride.actual_dh ?? ride.estimated_dh ?? "—"} DH
        </span>
        <Link href={`/parent/rides/${ride.id}`}>
          <Button size="sm" variant="ghost">
            <Eye className="w-4 h-4" />
          </Button>
        </Link>
      </div>
    </div>
  )
}
