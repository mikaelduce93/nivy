import Link from "next/link"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

/**
 * Wave 1A bare-minimum stub — parent onboarding entry point.
 * Full wizard chain (e-signature → add-teen → topup → spend-mode) is M7,
 * tracked separately. This stub exists so /auth/redirect has a deterministic
 * target for `parent` + `is_onboarded=false`.
 */
export default async function ParentOnboardingStubPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8 text-center space-y-4">
      <h1 className="text-2xl font-bold">Bienvenue parent</h1>
      <p className="text-gray-600 max-w-md">
        L&apos;assistant d&apos;onboarding parent est en cours de construction
        (Wave 1B). Cette page est un placeholder identitaire.
      </p>
      <Link href="/auth/login" className="text-purple-600 underline">
        Retour à la connexion
      </Link>
    </main>
  )
}
