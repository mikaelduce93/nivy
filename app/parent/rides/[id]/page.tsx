import { getUserRole } from "@/lib/auth/get-user-role"
import { redirect, notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { RideMap } from "./ride-map"
import { RideActions } from "./ride-actions"

export const dynamic = "force-dynamic"

interface Props {
  params: Promise<{ id: string }>
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

  return (
    <div className="container mx-auto p-4 md:p-8 space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Détail du trajet</h1>
        <Badge variant="outline">{ride.status}</Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Itinéraire</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div>
            <strong>Départ :</strong> {ride.pickup_address}
          </div>
          <div>
            <strong>Arrivée :</strong> {ride.dropoff_address}
          </div>
          <div>
            <strong>Heure :</strong> {new Date(ride.scheduled_for).toLocaleString("fr-FR")}
          </div>
          <div>
            <strong>Provider :</strong> {ride.provider} · <strong>Paiement :</strong>{" "}
            {ride.payment_method}
          </div>
          <div>
            <strong>Coût :</strong> {ride.actual_dh ?? ride.estimated_dh ?? "—"} DH
          </div>
        </CardContent>
      </Card>

      {driver && (
        <Card>
          <CardHeader>
            <CardTitle>Chauffeur</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-1">
            <div>
              <strong>Nom :</strong> {driver.full_name}
            </div>
            <div>
              <strong>Téléphone :</strong> {driver.phone}
            </div>
            <div>
              <strong>Véhicule :</strong> {driver.vehicle_make} {driver.vehicle_model} —{" "}
              {driver.vehicle_plate}
            </div>
            <div>
              <strong>Note :</strong> {driver.rating ?? "n/a"}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Carte en direct</CardTitle>
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>

      <RideActions rideId={ride.id} status={ride.status} />
    </div>
  )
}
