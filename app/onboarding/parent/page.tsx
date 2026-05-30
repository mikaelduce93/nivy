import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
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
    <main className="min-h-screen flex flex-col items-center justify-center p-8 text-center space-y-6">
      <h1 className="text-2xl font-bold">
        {firstName ? `Bienvenue, ${firstName} ! Autorisation signée ✓` : "Autorisation signée ✓"}
      </h1>
      <p className="text-mute max-w-md">
        Merci, votre consentement parental (loi 09-08 / CNDP) est enregistré.
        Vous pouvez maintenant accéder à votre espace parent.
      </p>
      <ParentOnboardingCompleteButton />
    </main>
  )
}
