/**
 * Wave 3B.2 — driver rides list (real read on ride_bookings).
 *
 * Driver = first-class profiles.role per F2. Workspace lives under /driver/*.
 * We only show rides assigned to the calling driver. No fake completion.
 */
import { redirect } from "next/navigation"
import { Car, MapPin, Clock } from "lucide-react"
import { getUserRole } from "@/lib/auth/get-user-role"
import { createClient } from "@/lib/supabase/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { StickerCard } from "@/components/ui/sticker-card"
import { NivEmpty } from "@/components/brand"

export const dynamic = "force-dynamic"

const FMT = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
})

/** Statut course → tag mono FR (zéro code anglais visible). */
const STATUS_FR: Record<string, { label: string; cls: string }> = {
  completed: { label: "Terminée", cls: "bg-lime text-on-bright" },
  dispatched: { label: "Dispatchée", cls: "bg-teal text-paper" },
  accepted: { label: "Acceptée", cls: "bg-teal text-paper" },
  in_progress: { label: "En cours", cls: "bg-gold text-ink" },
  pending: { label: "En attente", cls: "bg-gold text-ink" },
  cancelled: { label: "Annulée", cls: "bg-ink text-paper" },
  canceled: { label: "Annulée", cls: "bg-ink text-paper" },
  no_show: { label: "Absence", cls: "bg-ink text-paper" },
}

function statusFr(status: string) {
  return STATUS_FR[status] ?? { label: "À traiter", cls: "bg-ink/10 text-ink" }
}

export default async function DriverRidesPage() {
  const userInfo = await getUserRole()
  if (!userInfo) redirect("/auth/login")
  if (userInfo.role !== "driver") {
    return (
      <main className="space-y-6">
        <h1 className="font-display text-3xl font-extrabold tracking-tight text-ink">Mes courses</h1>
        <StickerCard className="p-10 text-center text-destructive">
          Accès réservé aux chauffeurs.
        </StickerCard>
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
        <h1 className="font-display text-3xl font-extrabold tracking-tight text-ink">Mes courses</h1>
        <NivEmpty
          mood="calm"
          title="Profil chauffeur introuvable"
          description="Termine ton onboarding pour voir tes courses ici."
          action={
            <a
              href="/driver/onboarding/kyc"
              className="inline-flex h-11 items-center rounded-xl border-2 border-ink bg-pink px-5 text-sm font-semibold text-ink transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-stkr-md"
            >
              Onboarding KYC
            </a>
          }
        />
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

  const driverActive = driver.is_active && driver.kyc_status === "approved"

  return (
    <main className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Courses</p>
          <h1 className="mt-1 font-display text-3xl font-extrabold tracking-tight text-ink">
            Mes <em className="font-semibold italic text-pink">courses</em>
          </h1>
        </div>
        <span
          className={
            driverActive
              ? "rounded-full border-2 border-ink bg-lime px-3 py-1 font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-on-bright"
              : "rounded-full border-2 border-ink bg-gold px-3 py-1 font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-ink"
          }
        >
          {driverActive ? "Actif" : `KYC ${driver.kyc_status}`}
        </span>
      </header>

      {rides.length === 0 ? (
        <NivEmpty
          mood="calm"
          title="Aucune course"
          description="Aucune course ne t'a été dispatchée pour l'instant. Dès qu'une course t'est assignée, elle s'affiche ici."
        />
      ) : (
        <ul className="space-y-3">
          {rides.map((r) => {
            const s = statusFr(r.status)
            return (
              <li key={r.id}>
                <StickerCard variant="hover" className="p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 truncate text-sm font-bold text-ink">
                      <MapPin className="size-3.5 shrink-0 text-pink" aria-hidden="true" />
                      {r.pickup_address ?? "—"} → {r.dropoff_address ?? "—"}
                    </p>
                    <p className="mt-1 flex items-center gap-2 font-mono text-xs text-mute">
                      <Clock className="size-3" aria-hidden="true" />
                      {r.scheduled_for ? FMT.format(new Date(r.scheduled_for)) : "—"}
                    </p>
                  </div>
                  <div className="text-right">
                    <span
                      className={`inline-block rounded-full border-2 border-ink px-2.5 py-0.5 font-mono text-[11px] font-bold uppercase tracking-[0.1em] ${s.cls}`}
                    >
                      {s.label}
                    </span>
                    <p className="mt-1 font-mono text-sm font-bold tabular-nums text-ink">
                      {r.actual_dh != null
                        ? `${Number(r.actual_dh).toFixed(0)} DH`
                        : r.estimated_dh != null
                        ? `≈ ${Number(r.estimated_dh).toFixed(0)} DH`
                        : ""}
                    </p>
                    </div>
                  </div>
                </StickerCard>
              </li>
            )
          })}
        </ul>
      )}
    </main>
  )
}
