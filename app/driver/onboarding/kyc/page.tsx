import Link from "next/link"
import { redirect } from "next/navigation"
import { FileCheck2, IdCard, FileText, ShieldCheck } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { StickerCard } from "@/components/ui/sticker-card"
import { SegmentedProgress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { NivCoach } from "@/components/brand"

/**
 * Driver KYC — écran d'attente handoff (présentation seule).
 * Le gating reste identique : pas de session → /auth/login.
 */
export default async function DriverOnboardingKycPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  const pieces = [
    { icon: IdCard, label: "Permis de conduire" },
    { icon: FileText, label: "Carte grise du véhicule" },
    { icon: ShieldCheck, label: "Attestation d'assurance" },
  ]

  return (
    <main className="mx-auto flex max-w-lg flex-col gap-6 py-6">
      <header className="text-center">
        <p className="eyebrow">Candidature chauffeur</p>
        <h1 className="mt-1 font-display text-3xl font-extrabold tracking-tight text-ink">
          On vérifie tes <em className="font-semibold italic text-pink">papiers</em>
        </h1>
      </header>

      <NivCoach
        mood="calm"
        message="Wesh ! Ton dossier est bien arrivé. On checke tes documents, c'est rapide — pas besoin de relancer, on te ping dès que c'est bon."
      />

      <StickerCard className="gap-5 p-6">
        <div>
          <SegmentedProgress steps={3} current={1} showLabel label="Étape 02 / 03" size="md" />
          <div className="mt-3 flex items-center justify-between font-mono text-[11px] font-bold uppercase tracking-[0.14em]">
            <span className="text-mute">Documents ✓</span>
            <span className="text-pink">Vérification</span>
            <span className="text-mute">Validé</span>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-xl border-2 border-line bg-paper/60 p-4">
          <FileCheck2 className="size-6 shrink-0 text-teal" aria-hidden="true" />
          <p className="text-sm text-ink-2">
            Délai habituel : <span className="font-semibold text-ink">24 à 48 h</span>. On te notifie dès que ton compte est activé.
          </p>
        </div>

        <div>
          <p className="eyebrow mb-2">Pièces reçues</p>
          <ul className="space-y-2">
            {pieces.map(({ icon: Icon, label }) => (
              <li
                key={label}
                className="flex items-center gap-3 rounded-xl border-2 border-line bg-white p-3"
              >
                <span className="grid size-9 shrink-0 place-items-center rounded-full border-2 border-ink bg-lime">
                  <Icon className="size-4 text-on-bright" aria-hidden="true" />
                </span>
                <span className="font-mono text-xs font-bold uppercase tracking-[0.08em] text-ink-2">
                  {label}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </StickerCard>

      <div className="flex flex-col gap-3">
        <Button asChild variant="pink" size="lg">
          <Link href="/driver/dashboard">Voir mon espace chauffeur</Link>
        </Button>
        <Button asChild variant="ghost" size="sm">
          <Link href="/auth/login">Retour à la connexion</Link>
        </Button>
      </div>
    </main>
  )
}
