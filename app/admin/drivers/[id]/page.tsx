import { getUserRole } from "@/lib/auth/get-user-role"
import { redirect, notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { H1 } from "@/components/ui/headings"
import { StatusBadge, type StatusVariant } from "@/components/ui/status-badge"
import { DriverActions } from "./driver-actions"

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

export const dynamic = "force-dynamic"

interface Props {
  params: Promise<{ id: string }>
}

export default async function AdminDriverDetailPage({ params }: Props) {
  const userInfo = await getUserRole()
  if (!userInfo || userInfo.role !== "admin") redirect("/login")
  const { id } = await params
  const supabase = await createClient()
  const { data: d } = await supabase
    .from("nivy_drivers")
    .select("*")
    .eq("id", id)
    .maybeSingle()
  if (!d) notFound()
  return (
    <div className="container mx-auto p-4 md:p-8 max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <H1 className="text-2xl">{d.full_name}</H1>
        <StatusBadge
          variant={kycVariant(d.kyc_status)}
          label={`KYC : ${d.kyc_status}`}
        />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Informations</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-1">
          <div>
            <strong>Téléphone :</strong> {d.phone}
          </div>
          <div>
            <strong>Véhicule :</strong> {d.vehicle_make} {d.vehicle_model} ({d.vehicle_plate})
          </div>
          <div>
            <strong>Villes :</strong> {(d.service_cities ?? []).join(", ") || "—"}
          </div>
          <div>
            <strong>Actif :</strong> {d.is_active ? "oui" : "non"}
          </div>
          <div>
            <strong>Note :</strong> {d.rating ?? "n/a"}
          </div>
          {d.kyc_documents_url && (
            <div>
              <strong>Documents :</strong> {d.kyc_documents_url}
            </div>
          )}
        </CardContent>
      </Card>
      <DriverActions driverId={d.id} kycStatus={d.kyc_status} />
    </div>
  )
}
