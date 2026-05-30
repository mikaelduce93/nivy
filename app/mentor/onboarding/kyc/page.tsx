import Link from "next/link"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

/**
 * Wave 1A bare stub — mentor KYC pending. Full mentor candidature surface
 * (M1/M5/M6) is out of scope. This stub exists so /auth/redirect can land
 * `mentor` users with non-approved KYC somewhere instead of /onboarding.
 */
export default async function MentorOnboardingKycPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8 text-center space-y-4">
      <h1 className="text-2xl font-bold">KYC mentor en attente</h1>
      <p className="text-mute max-w-md">
        Votre dossier de mentor est en cours d&apos;examen. Vous recevrez une
        notification dès qu&apos;il sera approuvé.
      </p>
      <Link href="/auth/login" className="text-pink underline">
        Retour à la connexion
      </Link>
    </main>
  )
}
