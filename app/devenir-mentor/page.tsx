/**
 * Wave 3B.1 — /devenir-mentor landing.
 *
 * Per canon §1 row 7 + §8.1: mentor = first-class `auth.users.role='mentor'`,
 * NOT a `partner_type='mentor'` row. The intake therefore goes through the
 * canonical sign-up with `role=mentor`, then the post-signup `/mentor/apply`
 * form (existing route at /api/mentor/apply) collects bio + expertise + KYC.
 *
 * This page is informational only — it does NOT post to the partner wizard.
 */
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  GraduationCap,
  ArrowRight,
  CheckCircle2,
  ShieldCheck,
  Clock,
  AlertTriangle,
} from "lucide-react"

export const metadata = {
  title: "Devenir mentor — Nivy",
  description: "Inscris-toi en tant que mentor career / hobby pour les ados Nivy.",
}

export default function DevenirMentorPage() {
  return (
    <main className="min-h-screen bg-background text-ink">
      <div className="container mx-auto px-4 py-12 max-w-3xl space-y-8">
        <header className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-teal/20 border border-teal/30">
            <GraduationCap className="w-8 h-8 text-teal" />
          </div>
          <h1 className="text-4xl font-black tracking-tight">Devenir mentor Nivy</h1>
          <p className="text-mute">
            Carrière, hobby, sport, grand frère / grande sœur. Sessions individuelles avec des
            ados Nivy.
          </p>
        </header>

        <Card className="bg-card border-ink">
          <CardHeader>
            <CardTitle className="text-ink">Comment ça marche</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-3 text-sm text-ink-2">
              <li className="flex items-start gap-3">
                <span className="rounded-full bg-teal/20 text-teal text-xs font-bold w-6 h-6 inline-flex items-center justify-center flex-shrink-0">1</span>
                Tu crées un compte Nivy avec le rôle « mentor ».
              </li>
              <li className="flex items-start gap-3">
                <span className="rounded-full bg-teal/20 text-teal text-xs font-bold w-6 h-6 inline-flex items-center justify-center flex-shrink-0">2</span>
                Tu remplis ta candidature (expertise, bio, tarif).
              </li>
              <li className="flex items-start gap-3">
                <span className="rounded-full bg-teal/20 text-teal text-xs font-bold w-6 h-6 inline-flex items-center justify-center flex-shrink-0">3</span>
                Tu déposes ta CIN, casier judiciaire, diplôme — privé, jamais publié.
              </li>
              <li className="flex items-start gap-3">
                <span className="rounded-full bg-teal/20 text-teal text-xs font-bold w-6 h-6 inline-flex items-center justify-center flex-shrink-0">4</span>
                L&apos;équipe Nivy valide. Tu reçois un email d&apos;activation.
              </li>
            </ol>
            <div className="grid sm:grid-cols-3 gap-3 mt-6 text-xs text-mute">
              <span className="flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-teal" />KYC privé</span>
              <span className="flex items-center gap-2"><Clock className="w-4 h-4 text-gold" />Activation manuelle</span>
              <span className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-lime" />Casier judiciaire requis</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gold/10 border-gold/30">
          <CardContent className="p-4 flex gap-3">
            <AlertTriangle className="w-5 h-5 text-gold flex-shrink-0 mt-0.5" />
            <p className="text-sm text-gold">
              La première session avec un ado est attendue avec parent présent (politique par
              défaut). Pas de DM hors fenêtre de session.
            </p>
          </CardContent>
        </Card>

        <Button asChild className="w-full h-12 bg-teal hover:bg-teal text-ink font-bold">
          <Link href="/auth/sign-up?role=mentor">
            Créer un compte mentor
            <ArrowRight className="w-4 h-4 ml-2" />
          </Link>
        </Button>

        <p className="text-center text-xs text-mute">
          Tu travailles déjà pour un club / centre éducatif ?{" "}
          <Link href="/devenir-coach" className="underline">Devenir coach</Link>
          {" / "}
          <Link href="/devenir-teacher" className="underline">teacher</Link>
        </p>
      </div>
    </main>
  )
}
