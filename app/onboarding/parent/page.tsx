import { redirect } from "next/navigation"
import { ShieldCheck } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { StickerCard } from "@/components/ui/sticker-card"
import { SegmentedProgress } from "@/components/ui/progress"
import { CheckRound } from "@/components/ui/check-round"
import { MeshBackground } from "@/components/ui/effects/mesh-background"
import { Niv, DarkSurface } from "@/components/brand"
import { ParentOnboardingCompleteButton } from "./complete-button"

/**
 * Parent onboarding router.
 *
 * #51 — this page is now the post-signature step of the parent wizard. The
 * middleware sends a not-onboarded parent to /onboarding/parent/e-signature
 * first; once the loi 09-08 / CNDP consent is signed they land here to
 * finalise onboarding. If they reach here WITHOUT a signed e_signatures row,
 * we send them back to the e-signature step (the /api/parent/onboarding/
 * complete endpoint also hard-gates on the signature).
 *
 * (Future wizard steps — add-teen → topup → spend-mode — chain in here.)
 */
export default async function ParentOnboardingStubPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_onboarded, full_name")
    .eq("id", user.id)
    .maybeSingle()

  if (profile?.is_onboarded) redirect("/parent")

  // #52 — continuity from the pre-account wizard / signup: greet by first name
  // (profiles.full_name, set from the signup prenom; falls back to user
  // metadata) instead of a generic title.
  const firstName =
    (profile?.full_name?.trim().split(/\s+/)[0] ||
      (user.user_metadata?.prenom as string | undefined) ||
      "").trim()

  // #51 — no signed autorisation parentale yet → back to the e-signature step.
  const { data: signature } = await supabase
    .from("e_signatures")
    .select("id")
    .eq("parent_id", user.id)
    .eq("terms_accepted", true)
    .not("signed_at", "is", null)
    .limit(1)
    .maybeSingle()

  if (!signature) redirect("/onboarding/parent/e-signature")

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center bg-paper p-6">
      <MeshBackground />

      <StickerCard className="relative z-10 w-full max-w-md gap-6 p-8">
        <div className="space-y-3">
          <span className="eyebrow tracking-[0.16em] text-teal">Espace parent</span>
          <SegmentedProgress steps={2} current={1} />
          <div className="flex justify-between font-mono text-[11px] uppercase tracking-[0.12em] text-mute">
            <span>1 · Signature</span>
            <span>2 · Finalisation</span>
          </div>
        </div>

        <div className="flex items-start gap-4">
          <Niv mood="proud" size={88} className="shrink-0" />
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <CheckRound checked disabled aria-hidden />
              <h1 className="font-display text-2xl font-extrabold leading-tight tracking-tight text-ink">
                {firstName ? (
                  <>
                    Bravo, <em className="font-semibold italic text-pink">{firstName}</em> !
                  </>
                ) : (
                  <>
                    Autorisation <em className="font-semibold italic text-pink">signée</em>
                  </>
                )}
              </h1>
            </div>
            <p className="text-sm text-mute">
              Votre consentement parental est enregistré. Plus qu&apos;une étape
              pour ouvrir votre espace parent.
            </p>
          </div>
        </div>

        <DarkSurface tone="teal" shadow className="p-4">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-teal" />
            <div>
              <span className="eyebrow tracking-[0.14em] text-paper/60">
                Valeur juridique
              </span>
              <p className="mt-1 text-sm text-paper/90">
                Votre autorisation a la même valeur qu&apos;une signature
                manuscrite et est conservée conformément à la loi 09-08 / CNDP.
              </p>
            </div>
          </div>
        </DarkSurface>

        <ParentOnboardingCompleteButton />
      </StickerCard>
    </main>
  )
}
