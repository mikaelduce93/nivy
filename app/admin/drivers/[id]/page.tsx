import { getUserRole } from "@/lib/auth/get-user-role"
import { redirect, notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { StickerCard } from "@/components/ui/sticker-card"
import { DarkSurface } from "@/components/brand"
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
  // Accès iso à la liste : `role` (profiles.role) vaut "admin" pour tous les
  // sous-rôles back-office (super_admin / moderator / support). Pas de RLS.
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
    <div className="container mx-auto max-w-4xl space-y-8 p-4 md:p-8">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="eyebrow tracking-[0.16em]">Chauffeur · KYC</p>
          <h1 className="mt-2 font-display text-4xl font-extrabold tracking-tight text-ink md:text-5xl">
            {d.full_name}
          </h1>
        </div>
        <StatusBadge
          variant={kycVariant(d.kyc_status)}
          label={`KYC : ${d.kyc_status}`}
          className="font-mono uppercase tracking-[0.16em]"
        />
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <StickerCard className="gap-3 p-6 lg:col-span-3">
          <h2 className="font-display text-xl font-extrabold text-ink">Informations</h2>
          <dl className="space-y-3 text-sm">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <dt className="eyebrow tracking-[0.14em] text-mute">Téléphone</dt>
              <dd className="font-mono text-ink">{d.phone}</dd>
            </div>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <dt className="eyebrow tracking-[0.14em] text-mute">Véhicule</dt>
              <dd className="font-mono text-ink">
                {d.vehicle_make} {d.vehicle_model} ({d.vehicle_plate})
              </dd>
            </div>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <dt className="eyebrow tracking-[0.14em] text-mute">Villes</dt>
              <dd className="text-ink">{(d.service_cities ?? []).join(", ") || "—"}</dd>
            </div>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <dt className="eyebrow tracking-[0.14em] text-mute">Actif</dt>
              <dd className="font-mono text-ink">{d.is_active ? "oui" : "non"}</dd>
            </div>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <dt className="eyebrow tracking-[0.14em] text-mute">Note</dt>
              <dd className="font-mono text-ink">{d.rating ?? "n/a"}</dd>
            </div>
            {d.kyc_documents_url && (
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <dt className="eyebrow tracking-[0.14em] text-mute">Documents</dt>
                <dd>
                  <a
                    href={d.kyc_documents_url}
                    target="_blank"
                    rel="noreferrer"
                    className="font-medium text-teal underline-offset-4 hover:underline"
                  >
                    Ouvrir les pièces KYC →
                  </a>
                </dd>
              </div>
            )}
          </dl>
        </StickerCard>

        <DarkSurface tone="gold" shadow className="p-6 lg:col-span-2">
          <p className="eyebrow tracking-[0.16em] text-paper/60">Décision KYC</p>
          <p className="mt-2 mb-4 text-sm text-paper/80">
            Acte sensible — vérifiez les pièces avant de trancher.
          </p>
          <DriverActions driverId={d.id} kycStatus={d.kyc_status} />
        </DarkSurface>
      </div>
    </div>
  )
}
