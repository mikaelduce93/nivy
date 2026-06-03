import type { Metadata } from "next"
import { notFound } from "next/navigation"
import Link from "next/link"
import { Circle } from "lucide-react"

import { Niv, NivCoach, DarkSurface } from "@/components/brand"
import { StickerCard } from "@/components/ui/sticker-card"
import { SegmentedProgress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { MeshBackground } from "@/components/ui/effects/mesh-background"

export const metadata: Metadata = { title: "Bienvenue" }

// Refonte V1.5 (#108) — flows d'onboarding par rôle (partner, ambassadeur).
// V2 (#143 / A7) — checklist sticker + Niv + 1re action clé sur surface sombre.
const FLOWS: Record<
  string,
  { title: string; steps: string[]; start: string; coach: string; firstAction: string }
> = {
  partner: {
    title: "partenaire",
    steps: [
      "Compléter le profil entreprise",
      "Téléverser les documents KYC",
      "Configurer le RIB de paiement",
      "Créer ta première offre",
      "Configurer le scanner",
    ],
    start: "/partner",
    coach: "Bienvenue dans le crew partenaires ! On t'accompagne étape par étape — commence par tes documents KYC.",
    firstAction: "Téléverse tes documents KYC pour activer ton compte et débloquer tes offres.",
  },
  ambassador: {
    title: "ambassadeur",
    steps: [
      "Valider ton profil",
      "Récupérer ton lien de parrainage",
      "Partager à 3 familles",
      "Configurer tes retraits",
    ],
    start: "/ambassador",
    coach: "Ravi de t'avoir dans l'équipe ambassadeurs ! Ta première mission : récupérer ton lien de parrainage.",
    firstAction: "Récupère ton lien de parrainage et partage-le à 3 familles pour gagner tes premières récompenses.",
  },
}

export default async function RoleOnboardingPage({
  params,
}: {
  params: Promise<{ role: string }>
}) {
  const { role } = await params
  const flow = FLOWS[role]
  if (!flow) notFound()

  const total = flow.steps.length

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-paper p-6">
      <MeshBackground />
      <div className="relative z-10 w-full max-w-lg">
        <StickerCard className="gap-5 p-6 sm:p-8">
          <div className="flex flex-col items-center text-center">
            <Niv size={110} mood="hype" float />
            <p className="mt-4 eyebrow tracking-[0.16em]">Onboarding {flow.title}</p>
            <h1 className="font-display text-3xl font-extrabold tracking-tight">
              Bienvenue dans <em className="font-semibold italic text-pink">Nivy</em> !
            </h1>
            <p className="mt-2 text-mute">Quelques étapes pour démarrer.</p>
          </div>

          <NivCoach mood="calm" message={flow.coach} />

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <SegmentedProgress steps={total} current={0} className="flex-1" />
              <span className="ml-3 font-mono text-[11px] font-bold uppercase tracking-[0.14em] tabular-nums text-mute">
                0 / {total} étapes
              </span>
            </div>

            <ol className="space-y-2">
              {flow.steps.map((s) => (
                <li key={s}>
                  <div className="flex items-center gap-3 rounded-2xl border-2 border-ink bg-white px-4 py-3 shadow-stkr-sm transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-stkr-pink motion-reduce:translate-x-0 motion-reduce:translate-y-0">
                    <Circle className="size-5 shrink-0 text-mute" aria-hidden="true" />
                    <span className="flex-1 font-medium text-ink">{s}</span>
                    <span className="rounded-full border-2 border-line px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-mute">
                      À faire
                    </span>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          {/* 1re action clé sur surface sombre ponctuelle */}
          <DarkSurface tone="pink" shadow className="p-5">
            <p className="eyebrow tracking-[0.16em] text-pink">Première action</p>
            <p className="mt-2 text-sm text-paper/90">{flow.firstAction}</p>
            <Button asChild variant="pink" className="mt-4 w-full">
              <Link href={flow.start}>Commencer →</Link>
            </Button>
          </DarkSurface>
        </StickerCard>
      </div>
    </main>
  )
}
