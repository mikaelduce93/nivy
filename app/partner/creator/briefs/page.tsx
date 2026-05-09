/**
 * Wave 3B.2 — creator briefs (truthful empty state).
 *
 * `sponsored_posts` table is not yet in the canonical DB. We render an honest
 * "module not yet available" state — never fake briefs, never fake payouts.
 */
import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Mail } from "lucide-react"
import { getUserRole } from "@/lib/auth/get-user-role"
import { createClient } from "@/lib/supabase/server"
import { EmptyState } from "@/components/ui/states/empty-state"

export const dynamic = "force-dynamic"

export default async function PartnerCreatorBriefsPage() {
  const userInfo = await getUserRole()
  if (!userInfo) redirect("/auth/login")
  if (userInfo.role !== "partner") redirect("/auth/redirect")

  const supabase = await createClient()
  const { data: partner } = await supabase
    .from("partners")
    .select("id, partner_type")
    .eq("email", userInfo.email)
    .maybeSingle()

  if (!partner || partner.partner_type !== "creator") {
    return (
      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="p-10 text-center text-zinc-400">
          Cet espace est réservé aux partenaires de type créateur.
        </CardContent>
      </Card>
    )
  }

  return (
    <main className="space-y-6">
      <header>
        <h1 className="text-3xl font-black text-white flex items-center gap-3">
          <Mail className="w-7 h-7 text-pink-400" />
          Briefs sponsorisés
        </h1>
      </header>
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-white">Inbox briefs</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={Mail}
            title="Module brief en cours de mise en place"
            description="Le pipeline brief / acceptation / publication / paiement sera ouvert dès qu'une marque partenaire active une campagne. Pas de campagne fictive ici."
          />
        </CardContent>
      </Card>
    </main>
  )
}
