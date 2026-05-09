/**
 * Wave 3B.2 — driver earnings (computed from ride_bookings, no fake totals).
 *
 * No separate `driver_earnings` table exists yet. We honestly compute the
 * driver's gross from `ride_bookings.actual_dh WHERE status='completed'`.
 * Net / commission split is not displayed yet because the canonical
 * driver-commission RPC isn't shipped — we surface that explicitly.
 */
import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Wallet, TrendingUp, AlertTriangle } from "lucide-react"
import { getUserRole } from "@/lib/auth/get-user-role"
import { createClient } from "@/lib/supabase/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { EmptyState } from "@/components/ui/states/empty-state"

export const dynamic = "force-dynamic"

export default async function DriverEarningsPage() {
  const userInfo = await getUserRole()
  if (!userInfo) redirect("/auth/login")
  if (userInfo.role !== "driver") {
    return (
      <main className="space-y-6">
        <h1 className="text-3xl font-black text-white">Mes paiements</h1>
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
    .select("id, full_name, kyc_status")
    .eq("user_id", userInfo.profileId)
    .maybeSingle()

  if (!driver) {
    return (
      <main className="space-y-6">
        <h1 className="text-3xl font-black text-white">Mes paiements</h1>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-10">
            <EmptyState
              icon={Wallet}
              title="Profil chauffeur introuvable"
              description="Termine ton onboarding pour voir tes paiements."
              action={{ label: "Onboarding KYC", href: "/driver/onboarding/kyc" }}
            />
          </CardContent>
        </Card>
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
        <h1 className="text-3xl font-black text-white flex items-center gap-3">
          <Wallet className="w-7 h-7 text-emerald-400" />
          Mes paiements
        </h1>
        <p className="text-zinc-400 mt-1">Brut estimé sur les courses complétées. Net après commission Nivy à venir.</p>
      </header>

      <div className="grid sm:grid-cols-3 gap-4">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-5">
            <p className="text-xs text-zinc-400 uppercase tracking-wider">Brut · ce mois</p>
            <p className="text-2xl font-black text-white mt-1 tabular-nums">{grossThisMonth.toFixed(0)} DH</p>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-5">
            <p className="text-xs text-zinc-400 uppercase tracking-wider">Brut · 30 j</p>
            <p className="text-2xl font-black text-white mt-1 tabular-nums">{grossLast30.toFixed(0)} DH</p>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-5">
            <p className="text-xs text-zinc-400 uppercase tracking-wider">Courses · 30 j</p>
            <p className="text-2xl font-black text-white mt-1 tabular-nums">{completedCount}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-amber-500/10 border-amber-500/30">
        <CardContent className="p-4 flex gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-amber-200 space-y-1">
            <p className="font-bold">Net & commission Nivy non encore détaillés</p>
            <p className="text-xs">
              Le module de paiement chauffeur (commission %, virements consolidés mensuels)
              arrive avec Wave 3B.3. Les chiffres ci-dessus sont des bruts calculés à partir
              des courses marquées « completed », pas un solde dû.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-zinc-400" />
            Versements
          </CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={Wallet}
            title="Aucun versement à afficher"
            description="Le pipeline de paiement chauffeur n'est pas encore en production. Aucun « payé » n'est affiché tant qu'un virement réel n'a pas été enregistré."
          />
        </CardContent>
      </Card>
    </main>
  )
}
