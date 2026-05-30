/**
 * Wave 3B.2 — event_talent bookings list (truthful empty state).
 *
 * `dj_bookings` table is not in the canonical DB yet (canon §1 row 10 + §3
 * deferred to Wave 3B.3 / Wave 4). This page renders an honest "setup
 * pending" state — never fake data.
 */
import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar } from "lucide-react"
import { getUserRole } from "@/lib/auth/get-user-role"
import { createClient } from "@/lib/supabase/server"
import { EmptyState } from "@/components/ui/states/empty-state"

export const dynamic = "force-dynamic"

export default async function PartnerTalentBookingsPage() {
  const userInfo = await getUserRole()
  if (!userInfo) redirect("/auth/login")
  if (userInfo.role !== "partner") redirect("/auth/redirect")

  const supabase = await createClient()
  const { data: partner } = await supabase
    .from("partners")
    .select("id, partner_type, status")
    .eq("email", userInfo.email)
    .maybeSingle()

  if (!partner || partner.partner_type !== "event_talent") {
    return (
      <Card className="bg-card border-ink">
        <CardContent className="p-10 text-center text-mute">
          Cet espace est réservé aux partenaires de type DJ / performer.
        </CardContent>
      </Card>
    )
  }

  return (
    <main className="space-y-6">
      <header>
        <h1 className="text-3xl font-black text-ink flex items-center gap-3">
          <Calendar className="w-7 h-7 text-pink" />
          Mes bookings
        </h1>
      </header>
      <Card className="bg-card border-ink">
        <CardHeader>
          <CardTitle className="text-ink">Demandes & confirmations</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={Calendar}
            title="Aucun booking pour l'instant"
            description="La gestion des bookings sera disponible une fois l'activation admin terminée et l'organisateur partenaire en ligne. Aucun paiement n'est facturé tant que tu n'as pas accepté un gig."
          />
        </CardContent>
      </Card>
    </main>
  )
}
