/**
 * Driver dashboard — hub agrégeant les lectures déjà honnêtes de
 * `/driver/earnings` et `/driver/rides` (aucune donnée fabriquée).
 *
 * Brut = `ride_bookings.actual_dh WHERE status='completed'` sur le mois.
 * On ne touche à aucune requête éco : mêmes lectures `nivy_drivers` /
 * `ride_bookings` (service-role) que les écrans frères, rendu charte seulement.
 */
import Link from "next/link"
import { redirect } from "next/navigation"
import { Car, Wallet, ArrowRight, ShieldCheck } from "lucide-react"
import { getUserRole } from "@/lib/auth/get-user-role"
import { createClient } from "@/lib/supabase/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { StickerCard } from "@/components/ui/sticker-card"
import { Button } from "@/components/ui/button"
import { Niv, StatHero, NivEmpty } from "@/components/brand"

export const dynamic = "force-dynamic"

export default async function DriverDashboardStubPage() {
  const userInfo = await getUserRole()
  if (!userInfo) redirect("/auth/login")

  const supabase = await createClient()
  const { data: driver } = await supabase
    .from("nivy_drivers")
    .select("id, full_name, kyc_status")
    .eq("user_id", userInfo.profileId)
    .maybeSingle()

  if (!driver) {
    return (
      <main className="space-y-6">
        <header>
          <p className="eyebrow">Chauffeur</p>
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-ink">
            Espace <em className="font-semibold italic text-pink">chauffeur</em>
          </h1>
        </header>
        <NivEmpty
          mood="calm"
          title="Profil chauffeur introuvable"
          description="Termine ton onboarding pour débloquer ton tableau de bord, tes courses et tes paiements."
          action={
            <Button asChild variant="pink">
              <Link href="/driver/onboarding/kyc">Onboarding KYC</Link>
            </Button>
          }
        />
      </main>
    )
  }

  const sr = createServiceRoleClient()
  const sinceMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
  const since30 = new Date(Date.now() - 30 * 86400_000).toISOString()

  const { data: completed } = await sr
    .from("ride_bookings")
    .select("actual_dh, completed_at")
    .eq("driver_id", driver.id)
    .eq("status", "completed")
    .not("actual_dh", "is", null)
    .gte("completed_at", since30)

  const list = (completed ?? []) as Array<{ actual_dh: number | string | null; completed_at: string | null }>
  const grossThisMonth = list
    .filter((r) => r.completed_at && r.completed_at >= sinceMonth)
    .reduce((s, r) => s + Number(r.actual_dh ?? 0), 0)
  const completedCount = list.length

  const kycApproved = driver.kyc_status === "approved"

  return (
    <main className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Chauffeur</p>
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-ink">
            Salut{driver.full_name ? ` ${driver.full_name.split(" ")[0]}` : ""},{" "}
            <em className="font-semibold italic text-pink">bonne route</em>
          </h1>
          <p className="mt-1 text-mute">Ton mois en un coup d&apos;œil : brut, courses et statut.</p>
        </div>
        <span
          className={
            kycApproved
              ? "rounded-full border-2 border-ink bg-lime px-3 py-1 font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-on-bright"
              : "rounded-full border-2 border-ink bg-gold px-3 py-1 font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-ink"
          }
        >
          {kycApproved ? "KYC validé" : "KYC en cours"}
        </span>
      </header>

      <div className="flex justify-center sm:hidden">
        <Niv mood="happy" size={96} />
      </div>

      <StatHero
        eyebrow="Brut ce mois"
        value={grossThisMonth.toFixed(0)}
        unit="DH"
        tone="lime"
        size="lg"
        icon={<Wallet className="size-6" aria-hidden="true" />}
        meta="Brut estimé sur tes courses complétées. Net après commission Nivy à venir."
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <StickerCard className="p-5">
          <p className="eyebrow">Courses · 30 j</p>
          <p className="mt-1 font-display text-3xl font-extrabold tabular-nums text-ink">
            {completedCount}
          </p>
          <p className="mt-1 text-sm text-mute">courses complétées</p>
        </StickerCard>
        <StickerCard className="p-5">
          <p className="eyebrow">Statut KYC</p>
          <p className="mt-1 flex items-center gap-2 font-display text-2xl font-extrabold text-ink">
            <ShieldCheck className={kycApproved ? "size-6 text-lime" : "size-6 text-gold"} aria-hidden="true" />
            {kycApproved ? "Validé" : "En vérification"}
          </p>
          <p className="mt-1 text-sm text-mute">
            {kycApproved ? "Tu peux recevoir des courses." : "On finalise la vérif de tes papiers."}
          </p>
        </StickerCard>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Button asChild variant="pink" size="lg" className="justify-between">
          <Link href="/driver/rides">
            <span className="flex items-center gap-2">
              <Car className="size-5" aria-hidden="true" />
              Mes courses
            </span>
            <ArrowRight className="size-5" aria-hidden="true" />
          </Link>
        </Button>
        <Button asChild variant="outline" size="lg" className="justify-between">
          <Link href="/driver/earnings">
            <span className="flex items-center gap-2">
              <Wallet className="size-5" aria-hidden="true" />
              Mes paiements
            </span>
            <ArrowRight className="size-5" aria-hidden="true" />
          </Link>
        </Button>
      </div>
    </main>
  )
}
