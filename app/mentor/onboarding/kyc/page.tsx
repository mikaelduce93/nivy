import Link from "next/link"
import { redirect } from "next/navigation"
import { Check } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { Niv, NivCoach } from "@/components/brand"
import { StickerCard } from "@/components/ui/sticker-card"
import { SegmentedProgress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"

/**
 * Écran d'attente après dépôt de candidature mentor : on vérifie le dossier.
 * Atterrissage pour les comptes `mentor` dont la vérification n'est pas encore
 * approuvée.
 */
export default async function MentorOnboardingKycPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <StickerCard className="w-full max-w-lg items-center gap-6 p-8 text-center">
        <Niv mood="calm" size={96} />

        <div>
          <p className="eyebrow tracking-[0.16em] text-pink">Candidature mentor</p>
          <h1 className="mt-1 font-display text-3xl font-extrabold tracking-tight text-ink">
            On vérifie ton <em className="font-semibold italic text-pink">dossier</em>
          </h1>
        </div>

        <SegmentedProgress steps={3} current={1} className="w-full" />
        <div className="grid w-full grid-cols-3 gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.1em]">
          <span className="text-ink">Soumis</span>
          <span className="text-pink">En revue</span>
          <span className="text-mute">Approuvé</span>
        </div>

        <div className="flex w-full items-center gap-3 rounded-xl border-2 border-lime bg-lime/10 p-3 text-left">
          <span className="grid size-6 shrink-0 place-items-center rounded-full border-2 border-lime bg-lime">
            <Check className="size-3.5 text-ink" strokeWidth={3} aria-hidden="true" />
          </span>
          <p className="text-sm font-bold text-ink">Dossier bien reçu</p>
        </div>

        <NivCoach
          mood="calm"
          className="w-full text-left"
          message="Salam coach, ton dossier est entre de bonnes mains. On te ping dès que c'est bon — compte 48 à 72h ouvrées."
        />

        <div className="w-full space-y-2 text-left text-sm text-mute">
          <p className="font-bold text-ink">Et après ?</p>
          <ul className="space-y-1.5">
            <li>· On vérifie ton identité et tes infos.</li>
            <li>· Tu reçois une notif dès l&apos;approbation.</li>
            <li>· Ton espace mentor s&apos;ouvre automatiquement.</li>
          </ul>
        </div>

        <div className="flex w-full flex-col gap-3 sm:flex-row">
          <Button asChild variant="outline" className="flex-1">
            <Link href="/aide">Contacter le support</Link>
          </Button>
          <Button asChild variant="ghost" className="flex-1">
            <Link href="/auth/login">Retour à la connexion</Link>
          </Button>
        </div>
      </StickerCard>
    </main>
  )
}
