import Link from "next/link"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

/**
 * Wave 1A bare stub — partner awaiting approval. Full
 * <PartnerAwaitingApproval /> banner lives at /partner already; this page
 * is the canonical landing target per /auth/redirect when partner status
 * is not 'active'.
 */
export default async function PartnerAwaitingApprovalPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8 text-center space-y-4">
      <h1 className="text-2xl font-bold">Demande partenaire en attente</h1>
      <p className="text-gray-600 max-w-md">
        Votre dossier partenaire est en cours d&apos;examen par notre équipe.
        Vous recevrez un email dès qu&apos;il sera approuvé.
      </p>
      <Link href="/auth/login" className="text-purple-600 underline">
        Retour à la connexion
      </Link>
    </main>
  )
}
