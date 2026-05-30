/**
 * Wave 3B.1 — /devenir-createur landing for partner_type='creator' (sponsored
 * content economy, distinct from ambassador per canon §8.3 / F3 ratification).
 */
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Sparkles, CheckCircle2, ShieldCheck, Clock } from "lucide-react"
import { MinimalArchetypeWizard } from "@/components/partners/MinimalArchetypeWizard"

export const metadata = {
  title: "Devenir créateur partenaire — Nivy",
  description: "Inscris-toi en tant que créateur de contenu sponsorisé sur Nivy.",
}

export default function DevenirCreateurPage() {
  return (
    <main className="min-h-screen bg-ink text-ink">
      <div className="container mx-auto px-4 py-12 max-w-5xl space-y-12">
        <header className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-pink/20 border border-pink/30">
            <Sparkles className="w-8 h-8 text-pink" />
          </div>
          <h1 className="text-4xl font-black tracking-tight">Devenir créateur partenaire</h1>
          <p className="text-mute max-w-xl mx-auto">
            Pour Instagram / TikTok / YouTube / Twitch. Propose des collaborations sponsorisées
            avec des marques partenaires Nivy. Briefs, contrats, paiements gérés en ligne.
          </p>
          <p className="text-xs text-mute max-w-xl mx-auto">
            Tu cherches plutôt à parrainer des amis et toucher une commission ? C&apos;est le programme{" "}
            <Link href="/devenir-ambassadeur" className="underline text-pink">
              ambassadeur
            </Link>
            .
          </p>
        </header>

        <Card className="bg-card border-ink">
          <CardHeader>
            <CardTitle className="text-ink">Pré-requis</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-ink-2">
            <p>Compte sur au moins une plateforme principale, audience minimale revue cas par cas.</p>
            <p>CIN + RIB pour paiement. Activation par revue admin.</p>
            <div className="grid sm:grid-cols-3 gap-3 mt-4 text-xs text-mute">
              <span className="flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-teal" />KYC privé</span>
              <span className="flex items-center gap-2"><Clock className="w-4 h-4 text-gold" />Activation manuelle</span>
              <span className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-lime" />Pas de fake login</span>
            </div>
          </CardContent>
        </Card>

        <MinimalArchetypeWizard partnerType="creator" archetypeLabel="créateur" />
      </div>
    </main>
  )
}
