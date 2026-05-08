import Link from "next/link"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

/**
 * Wave 1A bare stub — driver dashboard placeholder. Full driver workspace
 * is M2/CANON-LIFE-007 (gated by F42). This stub exists so /auth/redirect
 * can land an approved driver somewhere instead of /onboarding.
 */
export default async function DriverDashboardStubPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8 text-center space-y-4">
      <h1 className="text-2xl font-bold">Espace chauffeur</h1>
      <p className="text-gray-600 max-w-md">
        Le tableau de bord chauffeur est en cours de construction.
      </p>
      <Link href="/auth/login" className="text-sm text-gray-500 underline">
        Retour à la connexion
      </Link>
    </main>
  )
}
