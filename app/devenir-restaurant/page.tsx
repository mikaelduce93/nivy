/**
 * Wave 3B.1 — /devenir-restaurant landing.
 *
 * Canon §1 row 5 + §7.1: dedicated landing for partner_type='food'. Funnel:
 * Landing → Wizard → KYC upload → admin review → activation.
 */
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Utensils, ArrowRight, CheckCircle2, ShieldCheck, Clock } from "lucide-react"
import { MinimalArchetypeWizard } from "@/components/partners/MinimalArchetypeWizard"

export const metadata = {
  title: "Devenir partenaire restaurant — Nivy",
  description: "Inscris ton restaurant ou ton service de food delivery sur Nivy.",
}

export default function DevenirRestaurantPage() {
  return (
    <main className="min-h-screen bg-ink text-ink">
      <div className="container mx-auto px-4 py-12 max-w-5xl space-y-12">
        <header className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-coral/20 border border-coral/30">
            <Utensils className="w-8 h-8 text-coral" />
          </div>
          <h1 className="text-4xl font-black tracking-tight">Devenir restaurant partenaire</h1>
          <p className="text-mute max-w-xl mx-auto">
            Reçois des commandes de jeunes Nivy: livraison, sur place ou à emporter. Menu géré
            depuis ton dashboard, paiements consolidés mensuellement.
          </p>
        </header>

        <Card className="bg-card border-ink">
          <CardHeader>
            <CardTitle className="text-ink">Comment ça marche</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-3 text-sm text-ink-2">
              <li className="flex items-start gap-3">
                <span className="rounded-full bg-coral/20 text-coral text-xs font-bold w-6 h-6 inline-flex items-center justify-center flex-shrink-0">1</span>
                Tu remplis ce formulaire (nom, contact, mot de passe).
              </li>
              <li className="flex items-start gap-3">
                <span className="rounded-full bg-coral/20 text-coral text-xs font-bold w-6 h-6 inline-flex items-center justify-center flex-shrink-0">2</span>
                Tu déposes tes pièces KYC depuis l&apos;espace partenaire (privé, jamais publié).
              </li>
              <li className="flex items-start gap-3">
                <span className="rounded-full bg-coral/20 text-coral text-xs font-bold w-6 h-6 inline-flex items-center justify-center flex-shrink-0">3</span>
                L&apos;équipe Nivy valide ton dossier (24-48h ouvrées).
              </li>
              <li className="flex items-start gap-3">
                <span className="rounded-full bg-coral/20 text-coral text-xs font-bold w-6 h-6 inline-flex items-center justify-center flex-shrink-0">4</span>
                Tu reçois un email d&apos;invitation pour te connecter à ton dashboard.
              </li>
            </ol>
            <div className="grid sm:grid-cols-3 gap-3 mt-6 text-xs text-mute">
              <span className="flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-teal" />KYC privé</span>
              <span className="flex items-center gap-2"><Clock className="w-4 h-4 text-gold" />Activation manuelle</span>
              <span className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-lime" />Pas de fake login</span>
            </div>
          </CardContent>
        </Card>

        <MinimalArchetypeWizard partnerType="food" archetypeLabel="restaurant" />

        <p className="text-center text-xs text-mute">
          Tu cherches un autre type de partenariat ?{" "}
          <Link href="/devenir-partenaire" className="underline">Voir tous les types</Link>
        </p>
      </div>
    </main>
  )
}
