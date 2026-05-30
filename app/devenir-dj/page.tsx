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
    <main className="min-h-screen bg-ink text-ink">
      <div className="container mx-auto px-4 py-12 max-w-5xl space-y-12">
        <header className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-pink/20 border border-pink/30">
            <Music className="w-8 h-8 text-pink" />
          </div>
          <h1 className="text-4xl font-black tracking-tight">Devenir DJ / performer partenaire</h1>
          <p className="text-mute max-w-xl mx-auto">
            Sois booké pour les events Nivy. Gigs payés, contrats signés en ligne, calendrier
            partagé avec les organisateurs partenaires.
          </p>
        </header>

        <Card className="bg-card border-ink">
          <CardHeader>
            <CardTitle className="text-ink">Pré-requis</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-ink-2">
            <p>Tu dois pouvoir fournir : CIN (représentant), RIB pour paiement, et au moins un démo / extrait performance.</p>
            <p>L&apos;activation passe par une revue admin. Pas de connexion immédiate.</p>
            <div className="grid sm:grid-cols-3 gap-3 mt-4 text-xs text-mute">
              <span className="flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-teal" />KYC privé</span>
              <span className="flex items-center gap-2"><Clock className="w-4 h-4 text-gold" />Activation manuelle</span>
              <span className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-lime" />Pas de fake login</span>
            </div>
          </CardContent>
        </Card>

        <MinimalArchetypeWizard partnerType="event_talent" archetypeLabel="DJ / performer" />

        <p className="text-center text-xs text-mute">
          <Link href="/devenir-partenaire" className="underline">Autres partenariats</Link>
        </p>
      </div>
    </main>
  )
}
