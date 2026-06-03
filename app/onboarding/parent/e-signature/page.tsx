import { getUserRole } from "@/lib/auth/get-user-role"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { StickerCard } from "@/components/ui/sticker-card"
import { SegmentedProgress } from "@/components/ui/progress"
import { MeshBackground } from "@/components/ui/effects/mesh-background"
import { Button } from "@/components/ui/button"
import { DarkSurface, NivCoach } from "@/components/brand"
import { ShieldCheck, CheckCircle2 } from "lucide-react"
import Link from "next/link"
import { ParentSignatureClient } from "@/components/parent/e-signature-client"

/**
 * #51 — Parent onboarding step 1: e-signature (loi 09-08 / CNDP).
 *
 * Canonical onboarding route (canon §4.1: "E-signature CGU",
 * /onboarding/parent/e-signature, hard requirement: an e_signatures row with
 * signed_at NOT NULL). Mirrors the post-onboarding /parent/e-signature page
 * but chains into the parent onboarding router (/onboarding/parent) instead of
 * /parent/topup. Reuses the existing core (ParentSignatureClient →
 * /api/parent/e-signature/create); no new engine.
 */
async function getExistingSignature(parentId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from("e_signatures")
    .select("id, signed_at, parent_full_name")
    .eq("parent_id", parentId)
    .eq("terms_accepted", true)
    .order("signed_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  return data
}

export default async function ParentOnboardingESignaturePage() {
  const userInfo = await getUserRole()

  if (!userInfo || userInfo.role !== "parent") {
    redirect("/auth/redirect")
  }

  const existing = await getExistingSignature(userInfo.profileId)
  // After signing, the parent continues to the onboarding router which
  // finalises is_onboarded (gated on this signature existing).
  const redirectTo = "/onboarding/parent"

  return (
    <div className="relative min-h-screen bg-paper">
      <MeshBackground />

      <div className="container relative z-10 mx-auto max-w-3xl px-6 py-24">
        <div className="mb-8 space-y-3">
          <span className="eyebrow tracking-[0.16em] text-teal">
            Étape 1 / Inscription parent
          </span>
          <SegmentedProgress steps={3} current={0} />
          <h1 className="font-display text-3xl font-extrabold leading-tight tracking-tight text-ink">
            Votre <em className="font-semibold italic text-pink">autorisation</em> parentale
          </h1>
          <p className="text-mute">
            Première étape de votre inscription : nous vérifions votre identité
            et recueillons votre consentement signé électroniquement
            (loi 09-08 / CNDP) avant d&apos;activer votre espace parent.
          </p>
        </div>

        <NivCoach
          mood="calm"
          className="mb-6"
          message="On vous demande votre CIN uniquement pour confirmer que vous êtes bien le parent. Vos documents sont chiffrés et supprimés après 30 jours."
        />

        <DarkSurface tone="teal" shadow className="mb-6 p-5">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-6 w-6 shrink-0 text-teal" />
            <div>
              <span className="eyebrow tracking-[0.14em] text-paper/60">
                Valeur juridique
              </span>
              <p className="mt-1 text-sm text-paper/90">
                Cette signature électronique a la même valeur qu&apos;une
                signature manuscrite. Vos documents sont conservés conformément
                au RGPD / CNDP.
              </p>
            </div>
          </div>
        </DarkSurface>

        {existing ? (
          <StickerCard className="mb-6 gap-4 p-6">
            <h2 className="flex items-center gap-2 font-display text-lg font-extrabold text-ink">
              <CheckCircle2 className="h-5 w-5 text-lime" />
              Signature déjà enregistrée
            </h2>
            <p className="text-sm text-ink-2">
              Une autorisation parentale a été signée
              {existing.parent_full_name ? ` par ${existing.parent_full_name}` : ""}
              {" "}le {new Date(existing.signed_at).toLocaleDateString("fr-FR", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
              .
            </p>
            <Button asChild variant="lime" className="self-start">
              <Link href={redirectTo}>Continuer mon inscription</Link>
            </Button>
          </StickerCard>
        ) : null}

        <StickerCard className="gap-4 p-6">
          <h2 className="font-display text-lg font-extrabold text-ink">
            {existing ? "Renouveler la signature" : "Signer l'autorisation"}
          </h2>
          <ParentSignatureClient redirectTo={redirectTo} />
        </StickerCard>
      </div>
    </div>
  )
}
