import Link from "next/link"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { StickerCard } from "@/components/ui/sticker-card"
import { SegmentedProgress } from "@/components/ui/progress"
import { CheckRound } from "@/components/ui/check-round"
import { Niv } from "@/components/brand"
import { ArrowRight } from "lucide-react"

/**
 * Wave 1A — écran d'attente ambassadeur (cible de /auth/redirect quand
 * `ambassadors.status` n'est pas `active`).
 */
export default async function AmbassadorAwaitingApprovalPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  return (
    <main className="flex min-h-screen items-center justify-center bg-paper p-6">
      <StickerCard className="w-full max-w-md items-center p-8 text-center">
        <Niv mood="calm" size={96} />

        <span className="eyebrow mt-4 tracking-[0.16em] text-pink">Candidature ambassadeur</span>
        <h1 className="mt-2 font-display text-2xl font-extrabold tracking-tight text-ink">
          On <em className="font-semibold italic text-pink">checke</em> ton profil.
        </h1>
        <p className="mt-2 text-sm text-mute">
          Ta candidature est entre nos mains. On te recontacte sous 48-72h, promis.
        </p>

        {/* Étapes : Reçu ✓ · En revue • · Validé */}
        <div className="mt-6 w-full">
          <SegmentedProgress steps={3} current={1} showLabel label="Étape 02 / 03" />
          <div className="mt-3 flex justify-between font-mono text-[11px] text-mute">
            <span className="text-ink">Reçu</span>
            <span className="text-pink">En revue</span>
            <span>Validé</span>
          </div>
        </div>

        {/* Confirmation candidature reçue */}
        <div className="mt-6 flex w-full items-center gap-3 rounded-xl border-2 border-line bg-white p-3 text-left">
          <CheckRound checked aria-label="Candidature reçue" disabled />
          <span className="text-sm text-ink-2">Candidature bien reçue</span>
        </div>

        {/* CTA utile */}
        <Button asChild variant="pink" className="mt-6 w-full">
          <Link href="/ambassador/comment-gagner">
            Découvre comment gagner
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
        <Link href="/auth/login" className="mt-4 font-mono text-xs text-mute underline">
          Retour à la connexion
        </Link>
      </StickerCard>
    </main>
  )
}
