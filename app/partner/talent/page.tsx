/**
 * Wave 3B.2 — event_talent (DJ / performer) dashboard.
 *
 * Honest read: shows the partner identity + a queue placeholder. The
 * `dj_bookings` table does NOT exist yet (canon §1 row 10 / §3 deferred);
 * we surface a truthful "setup pending" state instead of fabricating
 * upcoming gigs. Booking creation lands in Wave 3B.3 / Wave 4.
 */
import Link from "next/link"
import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Music, Calendar, Wallet, ShieldCheck } from "lucide-react"
import { getUserRole } from "@/lib/auth/get-user-role"
import { createClient } from "@/lib/supabase/server"
import { EmptyState } from "@/components/ui/states/empty-state"

export const dynamic = "force-dynamic"

export default async function PartnerTalentDashboardPage() {
  const userInfo = await getUserRole()
  if (!userInfo) redirect("/auth/login")
  if (userInfo.role !== "partner") redirect("/auth/redirect")

  const supabase = await createClient()
  const { data: partner } = await supabase
    .from("partners")
    .select("id, company_name, partner_type, status")
    .eq("email", userInfo.email)
    .maybeSingle()

  if (!partner || partner.partner_type !== "event_talent") {
    return (
      <main className="space-y-6">
        <h1 className="text-3xl font-black text-white">Espace talent</h1>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-10 text-center text-zinc-400">
            Cet espace est réservé aux partenaires de type DJ / performer.
          </CardContent>
        </Card>
      </main>
    )
  }

  return (
    <main className="space-y-6">
      <header>
        <h1 className="text-3xl font-black text-white flex items-center gap-3">
          <Music className="w-7 h-7 text-purple-400" />
          {partner.company_name}
        </h1>
        <p className="text-zinc-400 mt-1">Espace talent · Statut : {partner.status}</p>
      </header>

      <div className="grid sm:grid-cols-3 gap-4">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-5">
            <p className="text-xs text-zinc-400 uppercase tracking-wider">Gigs à venir</p>
            <p className="text-2xl font-black text-white mt-1">—</p>
            <p className="text-xs text-zinc-600 mt-2">Module non encore disponible.</p>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-5">
            <p className="text-xs text-zinc-400 uppercase tracking-wider">Demandes</p>
            <p className="text-2xl font-black text-white mt-1">—</p>
            <p className="text-xs text-zinc-600 mt-2">Module non encore disponible.</p>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-5">
            <p className="text-xs text-zinc-400 uppercase tracking-wider">Notation</p>
            <p className="text-2xl font-black text-white mt-1">—</p>
            <p className="text-xs text-zinc-600 mt-2">Pas encore de notations.</p>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Calendar className="w-5 h-5 text-zinc-400" />
            Demandes de booking
          </CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={Calendar}
            title="Module booking en cours de mise en place"
            description="La gestion des bookings (dj_bookings) sera ouverte après l'activation côté admin. Pour l'instant, complète ton dossier KYC pour être prêt."
            action={{ label: "Compléter mon KYC", href: "/partner/kyc" }}
          />
        </CardContent>
      </Card>

      <div className="grid sm:grid-cols-3 gap-4 text-xs">
        <Link href="/partner/kyc" className="block p-4 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-700">
          <ShieldCheck className="w-5 h-5 text-blue-400 mb-2" />
          <p className="font-bold text-white">KYC</p>
          <p className="text-zinc-500">Pièces du dossier</p>
        </Link>
        <Link href="/partner/payouts" className="block p-4 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-700">
          <Wallet className="w-5 h-5 text-emerald-400 mb-2" />
          <p className="font-bold text-white">Paiements</p>
          <p className="text-zinc-500">Historique virements</p>
        </Link>
        <Link href="/partner/settings" className="block p-4 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-700">
          <Music className="w-5 h-5 text-purple-400 mb-2" />
          <p className="font-bold text-white">Profil</p>
          <p className="text-zinc-500">Démos, dispo, contrats</p>
        </Link>
      </div>
    </main>
  )
}
