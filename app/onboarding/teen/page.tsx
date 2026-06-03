import Link from "next/link"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { StickerCard } from "@/components/ui/sticker-card"
import { Button } from "@/components/ui/button"
import { SegmentedProgress } from "@/components/ui/progress"
import { MeshBackground } from "@/components/ui/effects/mesh-background"
import { Niv } from "@/components/brand"

/**
 * Wave 1A stub. Real teen onboarding chain is
 * /onboarding/interests → /onboarding/goals → /onboarding/learning-style →
 * /onboarding/complete. This page exists so /auth/redirect has a stable
 * landing for `teen` + `is_onboarded=false` — it nudges the user into the
 * existing chain.
 */
export default async function TeenOnboardingStubPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center bg-paper p-6">
      <MeshBackground />

      <StickerCard className="relative z-10 w-full max-w-md items-center gap-5 p-8 text-center">
        <Niv mood="hype" size={128} float />

        <div className="space-y-3">
          <span className="eyebrow tracking-[0.16em] text-pink">Onboarding ado</span>
          <h1 className="font-display text-3xl font-extrabold leading-tight tracking-tight text-ink">
            Yallah, on configure ton <em className="font-semibold italic text-pink">crew</em>
          </h1>
          <p className="text-sm text-mute">
            Quelques étapes rapides et ton espace est prêt. On apprend ce qui te
            fait kiffer, on cale tes objectifs, et c&apos;est parti.
          </p>
        </div>

        <div className="w-full space-y-2 text-left">
          <SegmentedProgress steps={4} current={0} />
          <div className="grid grid-cols-2 gap-x-3 gap-y-1 font-mono text-[11px] uppercase tracking-[0.12em] text-mute">
            <span>1 · Centres d&apos;intérêt</span>
            <span>2 · Objectifs</span>
            <span>3 · Style</span>
            <span>4 · C&apos;est prêt</span>
          </div>
        </div>

        <Button variant="pink" size="lg" className="w-full" asChild>
          <Link href="/onboarding/interests">Démarrer mon profil →</Link>
        </Button>

        <Link href="/auth/login" className="text-sm text-mute underline">
          Retour à la connexion
        </Link>
      </StickerCard>
    </main>
  )
}
