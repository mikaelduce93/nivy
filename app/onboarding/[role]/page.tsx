import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { Niv } from "@/components/brand/niv"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle2, Circle } from "lucide-react"

export const metadata: Metadata = { title: "Bienvenue" }

// Refonte V1.5 (#108) — flows d'onboarding par rôle (partner, ambassadeur).
// Checklist first-run (partner-ecosystem §2 stage 8), reprend le langage de
// l'onboarding ado (progress + Niv + cartes).
const FLOWS: Record<string, { title: string; steps: string[] }> = {
  partner: {
    title: "partenaire",
    steps: ["Compléter le profil entreprise", "Téléverser les documents KYC", "Configurer le RIB de paiement", "Créer ta première offre", "Configurer le scanner"],
  },
  ambassador: {
    title: "ambassadeur",
    steps: ["Valider ton profil", "Récupérer ton lien de parrainage", "Partager à 3 familles", "Configurer tes retraits"],
  },
}

export default async function RoleOnboardingPage({ params }: { params: Promise<{ role: string }> }) {
  const { role } = await params
  const flow = FLOWS[role]
  if (!flow) notFound()

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <Card className="w-full max-w-lg p-8 gap-6">
        <div className="flex flex-col items-center text-center px-6">
          <Niv size={110} mood="hype" float />
          <p className="eyebrow mt-4">Onboarding {flow.title}</p>
          <h1 className="text-3xl font-extrabold tracking-tight">
            Bienvenue dans <span className="text-pink italic">Nivy</span> !
          </h1>
          <p className="text-mute mt-2">Quelques étapes pour démarrer.</p>
        </div>

        <ol className="space-y-2 px-6">
          {flow.steps.map((s, i) => (
            <li key={s} className="flex items-center gap-3 rounded-xl border-2 border-ink bg-card px-4 py-3">
              {i === 0 ? <CheckCircle2 className="w-5 h-5 text-lime shrink-0" /> : <Circle className="w-5 h-5 text-mute shrink-0" />}
              <span className="font-medium text-ink">{s}</span>
            </li>
          ))}
        </ol>

        <div className="px-6">
          <Button variant="pink" className="w-full">Commencer →</Button>
        </div>
      </Card>
    </div>
  )
}
