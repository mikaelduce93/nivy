/**
 * Wave 3B.2 — event_talent bookings list (truthful empty state).
 *
 * `dj_bookings` table is not in the canonical DB yet (canon §1 row 10 + §3
 * deferred to Wave 3B.3 / Wave 4). This page renders an honest "setup
 * pending" state — never fake data.
 */
import { redirect } from "next/navigation"
import { getUserRole } from "@/lib/auth/get-user-role"
import { createClient } from "@/lib/supabase/server"
import { StickerCard } from "@/components/ui/sticker-card"
import { NivEmpty } from "@/components/brand"

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
      <StickerCard className="p-10 text-center text-mute">
        Cet espace est réservé aux partenaires de type DJ / performer.
      </StickerCard>
    )
  }

  return (
    <main className="space-y-6 pt-6">
      <header className="space-y-2">
        <p className="eyebrow">Bookings</p>
        <h1 className="font-display text-4xl font-extrabold tracking-tight text-ink">
          Mes <em className="font-semibold italic text-pink">bookings</em>
        </h1>
      </header>
      <NivEmpty
        mood="calm"
        title="Pas encore de booking"
        description="La gestion des bookings s'ouvre dès que l'activation admin est terminée et qu'un organisateur partenaire est en ligne. Zéro frais tant que tu n'as pas accepté un gig."
      />
    </main>
  )
}
