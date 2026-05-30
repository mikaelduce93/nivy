/**
 * Wave 3B.1 — /devenir-organisateur landing for partner_type='event_organizer'.
 */
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar, CheckCircle2, ShieldCheck, Clock } from "lucide-react"
import { MinimalArchetypeWizard } from "@/components/partners/MinimalArchetypeWizard"

export const metadata = {
  title: "Devenir organisateur d'évènements — Nivy",
  description: "Inscris-toi en tant qu'organisateur d'évènements ou festival sur Nivy.",
}

export default function DevenirOrganisateurPage() {
  return (
    <main className="min-h-screen bg-ink text-ink">
      <div className="container mx-auto px-4 py-12 max-w-5xl space-y-12">
        <header className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gold/20 border border-gold/30">
            <Calendar className="w-8 h-8 text-gold" />
          </div>
          <h1 className="text-4xl font-black tracking-tight">Devenir organisateur partenaire</h1>
          <p className="text-mute max-w-xl mx-auto">
            Concerts, festivals, tournois sport, conférences. Crée tes events, vends tes billets
            via Nivy avec scan QR à l&apos;entrée.
          </p>
        </header>

        <Card className="bg-card border-ink">
          <CardHeader>
            <CardTitle className="text-ink">Ce que tu peux faire</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-ink-2">
              <li>• Créer des évènements (lieu, date, capacité, billets).</li>
              <li>• Lister tes évènements dans le feed Nivy.</li>
              <li>• Scanner les billets QR à l&apos;entrée (anti-fraude HMAC + nonce).</li>
              <li>• Recevoir tes paiements consolidés mensuellement.</li>
            </ul>
            <div className="grid sm:grid-cols-3 gap-3 mt-4 text-xs text-mute">
              <span className="flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-teal" />KYC privé</span>
              <span className="flex items-center gap-2"><Clock className="w-4 h-4 text-gold" />Activation manuelle</span>
              <span className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-lime" />Pas de fake login</span>
            </div>
          </CardContent>
        </Card>

        <MinimalArchetypeWizard partnerType="event_organizer" archetypeLabel="organisateur" />

        <p className="text-center text-xs text-mute">
          <Link href="/devenir-partenaire" className="underline">Autres partenariats</Link>
        </p>
      </div>
    </main>
  )
}
