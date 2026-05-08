import Link from "next/link"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

/**
 * Wave 1A bare stub — ambassador awaiting approval landing target for
 * /auth/redirect when `ambassadors.status` is not `active`.
 */
export default async function AmbassadorAwaitingApprovalPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8 text-center space-y-4">
      <h1 className="text-2xl font-bold">Candidature ambassadeur en attente</h1>
      <p className="text-gray-600 max-w-md">
        Votre candidature ambassadeur est en cours d&apos;examen. Nous vous
        recontacterons sous peu.
      </p>
      <Link href="/auth/login" className="text-purple-600 underline">
        Retour à la connexion
      </Link>
    </main>
  )
}
