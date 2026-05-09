/**
 * Wave 3B.1 — /devenir-dj landing for partner_type='event_talent'.
 * Replaces the legacy /djs/candidature flow over time. Canonical funnel.
 */
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Music, CheckCircle2, ShieldCheck, Clock } from "lucide-react"
import { MinimalArchetypeWizard } from "@/components/partners/MinimalArchetypeWizard"

export const metadata = {
  title: "Devenir DJ partenaire — Nivy",
  description: "Inscris-toi en tant que DJ ou performer sur Nivy.",
}

export default function DevenirDjPage() {
  return (
    <main className="min-h-screen bg-black text-white">
      <div className="container mx-auto px-4 py-12 max-w-5xl space-y-12">
        <header className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-purple-500/20 border border-purple-500/30">
            <Music className="w-8 h-8 text-purple-400" />
          </div>
          <h1 className="text-4xl font-black tracking-tight">Devenir DJ / performer partenaire</h1>
          <p className="text-zinc-400 max-w-xl mx-auto">
            Sois booké pour les events Nivy. Gigs payés, contrats signés en ligne, calendrier
            partagé avec les organisateurs partenaires.
          </p>
        </header>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white">Pré-requis</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-zinc-300">
            <p>Tu dois pouvoir fournir : CIN (représentant), RIB pour paiement, et au moins un démo / extrait performance.</p>
            <p>L&apos;activation passe par une revue admin. Pas de connexion immédiate.</p>
            <div className="grid sm:grid-cols-3 gap-3 mt-4 text-xs text-zinc-400">
              <span className="flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-blue-400" />KYC privé</span>
              <span className="flex items-center gap-2"><Clock className="w-4 h-4 text-amber-400" />Activation manuelle</span>
              <span className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400" />Pas de fake login</span>
            </div>
          </CardContent>
        </Card>

        <MinimalArchetypeWizard partnerType="event_talent" archetypeLabel="DJ / performer" />

        <p className="text-center text-xs text-zinc-500">
          <Link href="/devenir-partenaire" className="underline">Autres partenariats</Link>
        </p>
      </div>
    </main>
  )
}
