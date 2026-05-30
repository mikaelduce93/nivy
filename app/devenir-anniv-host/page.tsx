/**
 * Wave 3B.1 — /devenir-anniv-host landing.
 *
 * Per canon §1 row 12: birthday host = flag (`accepts_birthday=true`) on
 * existing venue or food partner, NOT a new partner_type. We surface a
 * dedicated landing for marketing visibility; the actual sign-up routes
 * the prospect to the canonical venue or food wizard with the flag set.
 */
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Cake, ArrowRight } from "lucide-react"
import { MinimalArchetypeWizard } from "@/components/partners/MinimalArchetypeWizard"

export const metadata = {
  title: "Devenir lieu d'anniversaires partenaire — Nivy",
  description: "Inscris ton lieu pour accueillir des anniversaires d'ados.",
}

export default function DevenirAnnivHostPage() {
  return (
    <main className="min-h-screen bg-ink text-ink">
      <div className="container mx-auto px-4 py-12 max-w-5xl space-y-12">
        <header className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-pink/20 border border-pink/30">
            <Cake className="w-8 h-8 text-pink" />
          </div>
          <h1 className="text-4xl font-black tracking-tight">Devenir lieu d&apos;anniversaires</h1>
          <p className="text-mute max-w-xl mx-auto">
            Tu as un lieu (lounge, restaurant, espace évènementiel) qui peut accueillir des
            anniversaires d&apos;ados ? Configure tes packs (capacité, prix, options) et reçois
            les demandes via Nivy.
          </p>
        </header>

        <Card className="bg-card border-ink">
          <CardHeader>
            <CardTitle className="text-ink">Tu es déjà partenaire venue ou restaurant ?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-ink-2">
            <p>
              Active simplement l&apos;option « anniversaires » dans tes paramètres. Pas besoin
              d&apos;une seconde inscription.
            </p>
            <Link href="/partner/settings" className="inline-flex items-center text-pink underline">
              Gérer mes paramètres partenaire
              <ArrowRight className="w-4 h-4 ml-1" />
            </Link>
          </CardContent>
        </Card>

        <Card className="bg-card border-ink">
          <CardHeader>
            <CardTitle className="text-ink">Nouvelle inscription</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-ink-2">
            <p>
              Si tu n&apos;as pas encore de fiche partenaire, choisis le type principal
              (restaurant ou venue). Le flag « anniversaires » sera activé après revue admin.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/devenir-restaurant">
                <span className="inline-flex items-center px-4 py-2 rounded-lg bg-coral/20 text-coral hover:bg-coral/30">
                  Inscription restaurant
                  <ArrowRight className="w-4 h-4 ml-1" />
                </span>
              </Link>
              <Link href="/devenir-partenaire">
                <span className="inline-flex items-center px-4 py-2 rounded-lg bg-pink/20 text-pink hover:bg-pink/30">
                  Inscription venue
                  <ArrowRight className="w-4 h-4 ml-1" />
                </span>
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-ink">
          <CardHeader>
            <CardTitle className="text-ink">Ou inscription rapide en tant que venue</CardTitle>
          </CardHeader>
          <CardContent>
            <MinimalArchetypeWizard
              partnerType="venue"
              archetypeLabel="venue (lieu d'anniversaires)"
              metadata={{ accepts_birthday: true }}
            />
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
