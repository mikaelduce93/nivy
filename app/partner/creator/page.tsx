/**
 * Wave 3B.2 — creator dashboard (sponsored content economy).
 *
 * Real read on `creator_engagement` (engagement signals exist). Sponsored
 * brief inbox + payout are deferred (sponsored_posts table not yet in DB);
 * we surface honest "setup pending" copy instead of fabricated metrics.
 */
import Link from "next/link"
import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Sparkles, Mail, Wallet, ShieldCheck } from "lucide-react"
import { getUserRole } from "@/lib/auth/get-user-role"
import { createClient } from "@/lib/supabase/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { EmptyState } from "@/components/ui/states/empty-state"

export const dynamic = "force-dynamic"

export default async function PartnerCreatorDashboardPage() {
  const userInfo = await getUserRole()
  if (!userInfo) redirect("/auth/login")
  if (userInfo.role !== "partner") redirect("/auth/redirect")

  const supabase = await createClient()
  const { data: partner } = await supabase
    .from("partners")
    .select("id, company_name, partner_type, status")
    .eq("email", userInfo.email)
    .maybeSingle()

  if (!partner || partner.partner_type !== "creator") {
    return (
      <Card className="bg-card border-ink">
        <CardContent className="p-10 text-center text-mute">
          Cet espace est réservé aux partenaires de type créateur.
        </CardContent>
      </Card>
    )
  }

  // Real engagement signals (canonical table). We aggregate counts only —
  // never fabricate revenue or campaign numbers.
  const sr = createServiceRoleClient()
  const { count: engagementCount } = await sr
    .from("creator_engagement")
    .select("*", { count: "exact", head: true })
    .eq("partner_id", partner.id)

  return (
    <main className="space-y-6">
      <header>
        <h1 className="text-3xl font-black text-ink flex items-center gap-3">
          <Sparkles className="w-7 h-7 text-pink" />
          {partner.company_name}
        </h1>
        <p className="text-mute mt-1">Espace créateur · Statut : {partner.status}</p>
      </header>

      <div className="grid sm:grid-cols-3 gap-4">
        <Card className="bg-card border-ink">
          <CardContent className="p-5">
            <p className="text-xs text-mute uppercase tracking-wider">Signaux d&apos;engagement</p>
            <p className="text-2xl font-black text-ink mt-1 tabular-nums">
              {engagementCount ?? 0}
            </p>
            <p className="text-xs text-mute mt-2">Total enregistré sur ton profil.</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-ink">
          <CardContent className="p-5">
            <p className="text-xs text-mute uppercase tracking-wider">Briefs reçus</p>
            <p className="text-2xl font-black text-ink mt-1">—</p>
            <p className="text-xs text-mute mt-2">Module brief en cours de mise en place.</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-ink">
          <CardContent className="p-5">
            <p className="text-xs text-mute uppercase tracking-wider">Paiements</p>
            <p className="text-2xl font-black text-ink mt-1">—</p>
            <p className="text-xs text-mute mt-2">Aucun paiement à ce stade.</p>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-card border-ink">
        <CardHeader>
          <CardTitle className="text-ink flex items-center gap-2">
            <Mail className="w-5 h-5 text-mute" />
            Briefs sponsorisés
          </CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={Mail}
            title="Pas encore de briefs"
            description="Le système de briefs sponsorisés (sponsored_posts) sera ouvert après la première campagne marque pilotée par l'équipe Nivy. Aucune campagne active à ce jour."
            action={{ label: "Voir mes briefs", href: "/partner/creator/briefs" }}
          />
        </CardContent>
      </Card>

      <div className="grid sm:grid-cols-3 gap-4 text-xs">
        <Link href="/partner/kyc" className="block p-4 rounded-lg bg-card border border-ink hover:border-ink">
          <ShieldCheck className="w-5 h-5 text-teal mb-2" />
          <p className="font-bold text-ink">KYC</p>
          <p className="text-mute">Pièces du dossier</p>
        </Link>
        <Link href="/partner/payouts" className="block p-4 rounded-lg bg-card border border-ink hover:border-ink">
          <Wallet className="w-5 h-5 text-lime mb-2" />
          <p className="font-bold text-ink">Paiements</p>
          <p className="text-mute">Virements mensuels</p>
        </Link>
        <Link href="/partner/settings" className="block p-4 rounded-lg bg-card border border-ink hover:border-ink">
          <Sparkles className="w-5 h-5 text-pink mb-2" />
          <p className="font-bold text-ink">Profil</p>
          <p className="text-mute">Plateformes, audience</p>
        </Link>
      </div>
    </main>
  )
}
