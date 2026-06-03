/**
 * Wave 3B.2 — driver earnings (computed from ride_bookings, no fake totals).
 *
 * No separate `driver_earnings` table exists yet. We honestly compute the
 * driver's gross from `ride_bookings.actual_dh WHERE status='completed'`.
 * Net / commission split is not displayed yet because the canonical
 * driver-commission RPC isn't shipped — we surface that explicitly.
 */
import Link from "next/link"
import { redirect } from "next/navigation"
import { Wallet, AlertTriangle } from "lucide-react"
import { getUserRole } from "@/lib/auth/get-user-role"
import { createClient } from "@/lib/supabase/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { StickerCard } from "@/components/ui/sticker-card"
import { Button } from "@/components/ui/button"
import { StatHero, NivEmpty } from "@/components/brand"

export const dynamic = "force-dynamic"

export default async function DriverEarningsPage() {
  const userInfo = await getUserRole()
  if (!userInfo) redirect("/auth/login")
  if (userInfo.role !== "driver") {
    return (
      <main className="space-y-6">
        <h1 className="font-display text-3xl font-extrabold tracking-tight text-ink">Mes paiements</h1>
        <StickerCard className="p-10 text-center text-destructive">
          Accès réservé aux chauffeurs.
        </StickerCard>
      </main>
    )
  }

  const supabase = await createClient()
  const { data: driver } = await supabase
    .from("nivy_drivers")
    .select("id, full_name, kyc_status")
    .eq("user_id", userInfo.profileId)
    .maybeSingle()

  if (!driver) {
    return (
      <main className="space-y-6">
        <h1 className="font-display text-3xl font-extrabold tracking-tight text-ink">Mes paiements</h1>
        <NivEmpty
          mood="calm"
          title="Profil chauffeur introuvable"
          description="Termine ton onboarding pour voir tes paiements."
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
  const since30 = new Date(Date.now() - 30 * 86400_000).toISOString()
  const sinceMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()

  const { data: completed } = await sr
    .from("ride_bookings")
    .select("actual_dh, completed_at")
    .eq("driver_id", driver.id)
    .eq("status", "completed")
    .not("actual_dh", "is", null)
    .gte("completed_at", since30)

  const list = (completed ?? []) as Array<{ actual_dh: number | string | null; completed_at: string | null }>
  const grossLast30 = list.reduce((s, r) => s + Number(r.actual_dh ?? 0), 0)
  const grossThisMonth = list
    .filter((r) => r.completed_at && r.completed_at >= sinceMonth)
    .reduce((s, r) => s + Number(r.actual_dh ?? 0), 0)
  const completedCount = list.length

  return (
    <main className="space-y-6">
      <header>
        <p className="eyebrow">Paiements</p>
        <h1 className="mt-1 font-display text-3xl font-extrabold tracking-tight text-ink">
          Mes <em className="font-semibold italic text-pink">paiements</em>
        </h1>
        <p className="mt-1 text-mute">Brut estimé sur les courses complétées. Net après commission Nivy à venir.</p>
      </header>

      <StatHero
        eyebrow="Brut ce mois"
        value={grossThisMonth.toFixed(0)}
        unit="DH"
        tone="lime"
        size="lg"
        icon={<Wallet className="size-6" aria-hidden="true" />}
        meta="Cumul des courses marquées « completed » ce mois-ci."
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <StickerCard className="p-5">
          <p className="eyebrow">Brut · 30 j</p>
          <p className="mt-1 font-mono text-3xl font-bold tabular-nums text-ink">
            {grossLast30.toFixed(0)} <span className="text-base text-mute">DH</span>
          </p>
        </StickerCard>
        <StickerCard className="p-5">
          <p className="eyebrow">Courses · 30 j</p>
          <p className="mt-1 font-mono text-3xl font-bold tabular-nums text-ink">{completedCount}</p>
        </StickerCard>
      </div>

      <StickerCard className="border-gold p-4">
        <div className="flex gap-3">
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-gold" aria-hidden="true" />
          <div className="space-y-1 text-sm text-ink-2">
            <p className="font-display font-bold text-ink">Net &amp; commission Nivy pas encore détaillés</p>
            <p className="text-xs">
              Le module de paiement chauffeur (commission %, virements consolidés mensuels)
              arrive avec Wave 3B.3. Les chiffres ci-dessus sont des bruts calculés à partir
              des courses marquées « completed », pas un solde dû.
            </p>
          </div>
        </div>
      </StickerCard>

      <section className="space-y-3">
        <p className="eyebrow">Versements</p>
        <NivEmpty
          mood="calm"
          title="Aucun versement à afficher"
          description="Le pipeline de paiement chauffeur n'est pas encore en prod. On n'affiche aucun « payé » tant qu'un vrai virement n'est pas enregistré — zéro chiffre bidon."
        />
      </section>
    </main>
  )
}
