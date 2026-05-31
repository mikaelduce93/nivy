/**
 * Wave 3B.2 — creator briefs (truthful empty state).
 *
 * `sponsored_posts` table is not yet in the canonical DB. We render an honest
 * "module not yet available" state — never fake briefs, never fake payouts.
 */
import { redirect } from "next/navigation"
import { getUserRole } from "@/lib/auth/get-user-role"
import { createClient } from "@/lib/supabase/server"
import { StickerCard } from "@/components/ui/sticker-card"
import { NivEmpty } from "@/components/brand"

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
      <StickerCard className="p-10 text-center text-mute">
        Cet espace est réservé aux partenaires de type créateur.
      </StickerCard>
    )
  }

  return (
    <main className="space-y-6 pt-6">
      <header className="space-y-2">
        <p className="eyebrow">Briefs</p>
        <h1 className="font-display text-4xl font-extrabold tracking-tight text-ink">
          Mes <em className="font-semibold italic text-pink">briefs</em> sponsorisés
        </h1>
      </header>
      <NivEmpty
        mood="calm"
        title="Module brief en cours de mise en place"
        description="Le pipeline brief → acceptation → publication → paiement s'ouvre dès qu'une marque partenaire lance une campagne. Pas de campagne fictive ici."
      />
    </main>
  )
}
