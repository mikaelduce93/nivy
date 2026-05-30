/**
 * Wave 3B.1 — /devenir-coach landing.
 *
 * Per canon §1.1 + §8.2: coach = `partner_staff.role='coach'` inside a `club`
 * partner. Two paths:
 *   (a) Tu travailles déjà pour un club partenaire Nivy → tu rejoins via un
 *       code d'invitation envoyé par le club (UI dédiée à venir Wave 3B.2).
 *   (b) Tu es coach indépendant et tu veux ouvrir ton propre « club » Nivy →
 *       tu passes par le wizard partenaire en choisissant le type « club ».
 *
 * Pas de funnel direct via /api/partners/wizard/submit avec partner_type='coach'.
 */
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Dumbbell, ArrowRight, AlertTriangle } from "lucide-react"

export const metadata = {
  title: "Devenir coach partenaire — Nivy",
  description: "Rejoins Nivy en tant que coach sportif.",
}

export default function DevenirCoachPage() {
  return (
    <main className="min-h-screen bg-background text-ink">
      <div className="container mx-auto px-4 py-12 max-w-3xl space-y-8">
        <header className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-coral/20 border border-coral/30">
            <Dumbbell className="w-8 h-8 text-coral" />
          </div>
          <h1 className="text-4xl font-black tracking-tight">Devenir coach Nivy</h1>
          <p className="text-mute">
            Sport, fitness, danse, arts martiaux. Coach pour ados Nivy avec attribution XP.
          </p>
        </header>

        <Card className="bg-card border-ink">
          <CardHeader>
            <CardTitle className="text-ink">Tu travailles déjà pour un club Nivy ?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-ink-2">
            <p>
              Demande à ton club de t&apos;inviter via leur dashboard partenaire. Tu recevras
              un email avec un lien d&apos;activation. Pas besoin de remplir un dossier complet.
            </p>
            <p className="text-xs text-mute">
              Casier judiciaire à jour requis (canon §3.4 — politique sécurité ados).
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card border-ink">
          <CardHeader>
            <CardTitle className="text-ink">Tu veux créer ton propre club ?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-ink-2">
            <p>
              Inscris-toi via le formulaire partenaire en choisissant le type « club ». Tu
              ajouteras tes coachs (toi-même ou collaborateurs) après activation.
            </p>
            <Button asChild className="bg-coral hover:bg-coral text-ink">
              <Link href="/devenir-partenaire">
                Inscription club partenaire
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-gold/10 border-gold/30">
          <CardContent className="p-4 flex gap-3">
            <AlertTriangle className="w-5 h-5 text-gold flex-shrink-0 mt-0.5" />
            <p className="text-sm text-gold">
              Pas de DM hors créneau session. Pas de paiement direct ado → coach. Tout passe par
              Nivy + le club partenaire.
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
