import Link from "next/link"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

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
    <main className="min-h-screen flex flex-col items-center justify-center p-8 text-center space-y-4">
      <h1 className="text-2xl font-bold">Salut Teen</h1>
      <p className="text-gray-600 max-w-md">
        Continue ton onboarding pour débloquer ton tableau de bord.
      </p>
      <Link
        href="/onboarding/interests"
        className="rounded-full bg-purple-600 px-6 py-3 text-white"
      >
        Démarrer
      </Link>
      <Link href="/auth/login" className="text-sm text-gray-500 underline">
        Retour à la connexion
      </Link>
    </main>
  )
}
