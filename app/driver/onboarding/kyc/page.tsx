import Link from "next/link"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

/**
 * Wave 1A bare stub — driver KYC pending. Full driver candidature surface
 * (M2/M3) is out of scope here; this page exists so /auth/redirect has a
 * deterministic target for `driver` + non-approved kyc_status.
 */
export default async function DriverOnboardingKycPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8 text-center space-y-4">
      <h1 className="text-2xl font-bold">KYC chauffeur en attente</h1>
      <p className="text-gray-600 max-w-md">
        Votre dossier de chauffeur est en cours d&apos;examen. Vous recevrez
        une notification dès qu&apos;il sera approuvé.
      </p>
      <Link href="/auth/login" className="text-purple-600 underline">
        Retour à la connexion
      </Link>
    </main>
  )
}
