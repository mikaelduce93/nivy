/**
 * Wave 3B.1 — /devenir-teacher landing.
 *
 * Per canon §1.1 + §8.2: teacher = `partner_staff.role='teacher'` inside an
 * `education` partner. Same two-path model as coach (join existing centre OR
 * create your own).
 */
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { BookOpen, ArrowRight, AlertTriangle } from "lucide-react"

export const metadata = {
  title: "Devenir enseignant partenaire — Nivy",
  description: "Rejoins Nivy en tant qu'enseignant ou tuteur.",
}

export default function DevenirTeacherPage() {
  return (
    <main className="min-h-screen bg-ink text-ink">
      <div className="container mx-auto px-4 py-12 max-w-3xl space-y-8">
        <header className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gold/20 border border-gold/30">
            <BookOpen className="w-8 h-8 text-gold" />
          </div>
          <h1 className="text-4xl font-black tracking-tight">Devenir enseignant Nivy</h1>
          <p className="text-mute">
            Soutien scolaire, langues, musique, arts. Cours individuels ou collectifs avec
            attribution XP + validation de notes.
          </p>
        </header>

        <Card className="bg-card border-ink">
          <CardHeader>
            <CardTitle className="text-ink">Tu travailles déjà pour un centre Nivy ?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-ink-2">
            <p>
              Demande à ton centre de t&apos;inviter via leur dashboard partenaire. Tu recevras
              un email avec un lien d&apos;activation.
            </p>
            <p className="text-xs text-mute">
              Casier judiciaire à jour + diplôme requis (canon §3.4).
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card border-ink">
          <CardHeader>
            <CardTitle className="text-ink">Tu veux ouvrir ton propre centre ?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-ink-2">
            <p>
              Inscris-toi via le formulaire partenaire en choisissant le type « éducation ».
              Tu ajouteras tes enseignants après activation.
            </p>
            <Button asChild className="bg-gold hover:bg-gold text-ink">
              <Link href="/devenir-partenaire">
                Inscription centre éducatif
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-gold/10 border-gold/30">
          <CardContent className="p-4 flex gap-3">
            <AlertTriangle className="w-5 h-5 text-gold flex-shrink-0 mt-0.5" />
            <p className="text-sm text-gold">
              La validation des notes ado par un enseignant doit pointer sur ton compte
              enseignant (canon §6 F8 — pas sur un compte parent).
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
