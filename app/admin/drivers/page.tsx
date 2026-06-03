import { getUserRole } from "@/lib/auth/get-user-role"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { StickerCard } from "@/components/ui/sticker-card"
import { StatusBadge, type StatusVariant } from "@/components/ui/status-badge"
import { StatCard } from "@/components/admin/stat-card"
import { NivEmpty } from "@/components/brand"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export const dynamic = "force-dynamic"

export default async function AdminDriversPage() {
  // Accès : `getUserRole()` renvoie `role` = profiles.role, qui vaut "admin"
  // pour TOUS les sous-rôles back-office (super_admin / moderator / support,
  // portés par admin_roles.role). Ce gate admet donc déjà les trois rôles de
  // modération — il est iso aux autres files de l'issue. Pas de changement RLS.
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
    <div className="container mx-auto space-y-8 p-4 md:p-8">
      <header>
        <p className="eyebrow tracking-[0.16em]">Chauffeurs · KYC</p>
        <h1 className="mt-2 font-display text-4xl font-extrabold tracking-tight text-ink md:text-5xl">
          Flotte des <em className="font-semibold italic text-pink">chauffeurs</em>
        </h1>
        <p className="mt-2 text-sm text-mute">
          Validez les KYC et gérez la flotte de chauffeurs partenaires.
        </p>
      </header>

      {loadError && (
        <div
          role="alert"
          className="rounded-2xl border-2 border-ink bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive shadow-stkr-sm"
        >
          {loadError}
        </div>
      )}

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="En attente" value={queue.length} tone="gold" />
        <StatCard label="Actifs" value={active.length} tone="lime" />
        <StatCard label="Suspendus" value={other.length} tone="coral" />
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-xl font-extrabold text-ink">
          File d&apos;attente KYC ({queue.length})
        </h2>
        {queue.length === 0 ? (
          <NivEmpty
            mood="calm"
            title="File KYC vide"
            description="Aucune demande de validation en attente."
          />
        ) : (
          <div className="space-y-3">
            {queue.map((d) => (
              <DriverRow key={d.id} d={d} />
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-xl font-extrabold text-ink">
          Chauffeurs actifs ({active.length})
        </h2>
        {active.length === 0 ? (
          <NivEmpty
            mood="calm"
            title="Aucun chauffeur actif"
            description="Les chauffeurs validés et en service apparaîtront ici."
          />
        ) : (
          <div className="space-y-3">
            {active.map((d) => (
              <DriverRow key={d.id} d={d} />
            ))}
          </div>
        )}
      </section>

      {other.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-display text-xl font-extrabold text-ink">
            Suspendus ({other.length})
          </h2>
          <div className="space-y-3">
            {other.map((d) => (
              <DriverRow key={d.id} d={d} />
            ))}
          </div>
        </section>
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
    <StickerCard variant="hover" className="p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full border-2 border-ink bg-paper font-display text-sm font-extrabold text-ink">
              {d.full_name.charAt(0).toUpperCase()}
            </span>
            <span className="font-display font-extrabold text-ink">{d.full_name}</span>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-md border-2 border-ink bg-paper px-2 py-0.5 font-mono text-ink-2">
              {d.phone}
            </span>
            <span className="rounded-md border-2 border-ink bg-paper px-2 py-0.5 font-mono text-ink-2">
              {d.vehicle_make ?? "—"} {d.vehicle_model ?? ""}
            </span>
            {d.vehicle_plate && (
              <span className="rounded-md border-2 border-ink bg-paper px-2 py-0.5 font-mono uppercase tracking-[0.12em] text-ink-2">
                {d.vehicle_plate}
              </span>
            )}
          </div>
          <div className="mt-1 text-xs text-mute">
            Villes : {(d.service_cities ?? []).join(", ") || "—"}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge
            variant={kycVariant(d.kyc_status)}
            label={`KYC : ${d.kyc_status}`}
            size="sm"
            className="font-mono uppercase tracking-[0.16em]"
          />
          {d.is_active && (
            <StatusBadge
              variant="success"
              label="Actif"
              size="sm"
              className="font-mono uppercase tracking-[0.16em]"
            />
          )}
          <Link href={`/admin/drivers/${d.id}`}>
            <Button size="sm" variant="outline">
              Voir
            </Button>
          </Link>
        </div>
      </div>
    </StickerCard>
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
