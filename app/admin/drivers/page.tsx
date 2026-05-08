import { getUserRole } from "@/lib/auth/get-user-role"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { H1 } from "@/components/ui/headings"
import { StatusBadge, type StatusVariant } from "@/components/ui/status-badge"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export const dynamic = "force-dynamic"

export default async function AdminDriversPage() {
  const userInfo = await getUserRole()
  if (!userInfo || userInfo.role !== "admin") redirect("/login")
  const supabase = await createClient()

  // Polish-F: wrap with try/catch so RLS / network failures surface as a
  // banner instead of silently rendering "Aucune demande / Aucun chauffeur".
  let drivers: any[] = []
  let loadError: string | null = null
  try {
    const { data, error } = await supabase
      .from("nivy_drivers")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100)
    if (error) {
      console.error("[admin/drivers] error:", error)
      loadError = "Impossible de charger la liste des chauffeurs."
    } else {
      drivers = data ?? []
    }
  } catch (err) {
    console.error("[admin/drivers] threw:", err)
    loadError = "Impossible de charger la liste des chauffeurs."
  }

  const queue = drivers.filter((d) => d.kyc_status === "pending")
  const active = drivers.filter(
    (d) => d.kyc_status === "approved" && d.is_active === true
  )
  const other = drivers.filter(
    (d) => !(d.kyc_status === "pending") && !(d.kyc_status === "approved" && d.is_active === true)
  )

  return (
    <div className="container mx-auto p-4 md:p-8 space-y-6">
      <div>
        <H1 className="text-2xl">Chauffeurs Nivy</H1>
        <p className="text-muted-foreground text-sm">
          Validez les KYC et gérez la flotte de chauffeurs partenaires.
        </p>
      </div>

      {loadError && (
        <div
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          {loadError}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>File d&apos;attente KYC ({queue.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {queue.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune demande en attente.</p>
          ) : (
            queue.map((d) => <DriverRow key={d.id} d={d} />)
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Chauffeurs actifs ({active.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {active.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun chauffeur actif.</p>
          ) : (
            active.map((d) => <DriverRow key={d.id} d={d} />)
          )}
        </CardContent>
      </Card>

      {other.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Autres ({other.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {other.map((d) => (
              <DriverRow key={d.id} d={d} />
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

interface RowProps {
  d: {
    id: string
    full_name: string
    phone: string
    vehicle_make: string | null
    vehicle_model: string | null
    vehicle_plate: string | null
    kyc_status: string
    is_active: boolean
    rating: number | null
    service_cities: string[] | null
  }
}

function DriverRow({ d }: RowProps) {
  return (
    <div className="flex items-start justify-between border rounded-md p-3">
      <div>
        <div className="text-sm font-medium">{d.full_name}</div>
        <div className="text-xs text-muted-foreground">
          {d.phone} · {d.vehicle_make ?? "—"} {d.vehicle_model ?? ""}{" "}
          {d.vehicle_plate ? `(${d.vehicle_plate})` : ""}
        </div>
        <div className="text-xs text-muted-foreground">
          Villes : {(d.service_cities ?? []).join(", ") || "—"}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <StatusBadge
          variant={kycVariant(d.kyc_status)}
          label={`KYC : ${d.kyc_status}`}
          size="sm"
        />
        {d.is_active && <Badge variant="secondary">actif</Badge>}
        <Link href={`/admin/drivers/${d.id}`}>
          <Button size="sm" variant="outline">
            Voir
          </Button>
        </Link>
      </div>
    </div>
  )
}

function kycVariant(status: string): StatusVariant {
  switch (status) {
    case "approved":
      return "success"
    case "rejected":
      return "danger"
    case "pending":
      return "pending"
    default:
      return "neutral"
  }
}
