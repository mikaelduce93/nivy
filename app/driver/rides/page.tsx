/**
 * Wave 3B.2 — driver rides list (real read on ride_bookings).
 *
 * Driver = first-class profiles.role per F2. Workspace lives under /driver/*.
 * We only show rides assigned to the calling driver. No fake completion.
 */
import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Car, MapPin, Clock } from "lucide-react"
import { getUserRole } from "@/lib/auth/get-user-role"
import { createClient } from "@/lib/supabase/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { EmptyState } from "@/components/ui/states/empty-state"

export const dynamic = "force-dynamic"

const FMT = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
})

export default async function DriverRidesPage() {
  const userInfo = await getUserRole()
  if (!userInfo) redirect("/auth/login")
  if (userInfo.role !== "driver") {
    return (
      <main className="space-y-6">
        <h1 className="text-3xl font-black text-white">Mes courses</h1>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-10 text-center text-red-400">
            Accès réservé aux chauffeurs.
          </CardContent>
        </Card>
      </main>
    )
  }

  const supabase = await createClient()
  const { data: driver } = await supabase
    .from("nivy_drivers")
    .select("id, full_name, kyc_status, is_active")
    .eq("user_id", userInfo.profileId)
    .maybeSingle()

  if (!driver) {
    return (
      <main className="space-y-6">
        <h1 className="text-3xl font-black text-white">Mes courses</h1>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-10">
            <EmptyState
              icon={Car}
              title="Profil chauffeur introuvable"
              description="Termine ton onboarding pour voir tes courses ici."
              action={{ label: "Onboarding KYC", href: "/driver/onboarding/kyc" }}
            />
          </CardContent>
        </Card>
      </main>
    )
  }

  const sr = createServiceRoleClient()
  const { data: ridesRaw } = await sr
    .from("ride_bookings")
    .select(
      "id, scheduled_for, pickup_address, dropoff_address, estimated_dh, actual_dh, status, completed_at, cancelled_at, created_at",
    )
    .eq("driver_id", driver.id)
    .order("scheduled_for", { ascending: false })
    .limit(50)
  const rides = (ridesRaw ?? []) as Array<{
    id: string
    scheduled_for: string | null
    pickup_address: string | null
    dropoff_address: string | null
    estimated_dh: number | string | null
    actual_dh: number | string | null
    status: string
    completed_at: string | null
    cancelled_at: string | null
    created_at: string
  }>

  return (
    <main className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-black text-white flex items-center gap-3">
          <Car className="w-7 h-7 text-emerald-400" />
          Mes courses
        </h1>
        <Badge className={driver.is_active && driver.kyc_status === "approved"
          ? "bg-emerald-500/20 text-emerald-300"
          : "bg-amber-500/20 text-amber-300"}>
          {driver.is_active && driver.kyc_status === "approved" ? "Actif" : `KYC ${driver.kyc_status}`}
        </Badge>
      </header>

      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-white">Historique</CardTitle>
        </CardHeader>
        <CardContent>
          {rides.length === 0 ? (
            <EmptyState
              icon={Car}
              title="Aucune course"
              description="Aucune course ne t'a été dispatchée pour l'instant. Quand une course t'est assignée, elle apparaît ici."
            />
          ) : (
            <ul className="space-y-3">
              {rides.map((r) => (
                <li
                  key={r.id}
                  className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-lg bg-zinc-800/40 border border-zinc-800"
                >
                  <div className="min-w-0">
                    <p className="font-bold text-white text-sm truncate">
                      <MapPin className="inline w-3 h-3 mr-1 text-zinc-400" />
                      {r.pickup_address ?? "—"} → {r.dropoff_address ?? "—"}
                    </p>
                    <p className="text-xs text-zinc-500 mt-1 flex items-center gap-2">
                      <Clock className="w-3 h-3" />
                      {r.scheduled_for ? FMT.format(new Date(r.scheduled_for)) : "—"}
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge variant="outline" className="capitalize">
                      {r.status}
                    </Badge>
                    <p className="text-xs text-zinc-400 mt-1 tabular-nums">
                      {r.actual_dh != null
                        ? `${Number(r.actual_dh).toFixed(0)} DH`
                        : r.estimated_dh != null
                        ? `≈ ${Number(r.estimated_dh).toFixed(0)} DH`
                        : ""}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </main>
  )
}
