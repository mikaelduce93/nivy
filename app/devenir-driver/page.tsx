/**
 * Wave 3B.1 — /devenir-driver landing.
 *
 * Per canon §1 row 6 + founder ruling F2: driver = first-class
 * `profiles.role='driver'`, NOT a partner_type. Intake routes to canonical
 * sign-up with `role=driver`, then a post-signup KYC + vehicle docs flow
 * (deferred to Wave 3B.2 — driver dashboard build-out).
 *
 * This page is informational + CTA to sign-up; no partner wizard post.
 */
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Car, ArrowRight, CheckCircle2, ShieldCheck, Clock } from "lucide-react"

export const metadata = {
  title: "Devenir chauffeur partenaire — Nivy",
  description: "Inscris-toi en tant que chauffeur Nivy.",
}

export default function DevenirDriverPage() {
  return (
    <main className="min-h-screen bg-black text-white">
      <div className="container mx-auto px-4 py-12 max-w-3xl space-y-8">
        <header className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/30">
            <Car className="w-8 h-8 text-emerald-400" />
          </div>
          <h1 className="text-4xl font-black tracking-tight">Devenir chauffeur Nivy</h1>
          <p className="text-zinc-400">
            Trajets pour ados Nivy à Casablanca. Pool propre — vérifié, parent-friendly,
            paiements consolidés.
          </p>
        </header>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white">Pré-requis non négociables</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-zinc-300">
              <li>• CIN du chauffeur</li>
              <li>• Permis de conduire en cours de validité</li>
              <li>• Carte grise du véhicule</li>
              <li>• Assurance véhicule en cours</li>
              <li>• Casier judiciaire (3 mois max)</li>
              <li>• RIB pour paiement</li>
            </ul>
            <div className="grid sm:grid-cols-3 gap-3 mt-4 text-xs text-zinc-400">
              <span className="flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-blue-400" />KYC privé</span>
              <span className="flex items-center gap-2"><Clock className="w-4 h-4 text-amber-400" />Activation manuelle</span>
              <span className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400" />Casier judiciaire requis</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white">Statut Wave 3B.1</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-zinc-400">
            <p>
              Le funnel d&apos;inscription chauffeur s&apos;ouvre en deux temps : créer ton
              compte chauffeur maintenant ; le formulaire complet d&apos;upload des pièces
              véhicule + KYC arrive avec le dashboard chauffeur (Wave 3B.2).
            </p>
            <p className="text-xs text-zinc-500">
              Pas de connexion immédiate aux courses tant que le KYC n&apos;est pas approuvé.
            </p>
          </CardContent>
        </Card>

        <Button asChild className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
          <Link href="/auth/sign-up?role=driver">
            Créer un compte chauffeur
            <ArrowRight className="w-4 h-4 ml-2" />
          </Link>
        </Button>
      </div>
    </main>
  )
}
