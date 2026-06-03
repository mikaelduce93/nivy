/**
 * Wave 3B.2 — event_talent (DJ / performer) dashboard.
 *
 * Honest read: shows the partner identity + a queue placeholder. The
 * `dj_bookings` table does NOT exist yet (canon §1 row 10 / §3 deferred);
 * we surface a truthful "setup pending" state instead of fabricating
 * upcoming gigs. Booking creation lands in Wave 3B.3 / Wave 4.
 */
import Link from "next/link"
import { redirect } from "next/navigation"
import { Music, Wallet, ShieldCheck } from "lucide-react"
import { getUserRole } from "@/lib/auth/get-user-role"
import { createClient } from "@/lib/supabase/server"
import { StickerCard } from "@/components/ui/sticker-card"
import { NivEmpty } from "@/components/brand"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/states/empty-state"
import { Calendar } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function PartnerTalentDashboardPage() {
  const userInfo = await getUserRole()
  if (!userInfo) redirect("/auth/login")
  if (userInfo.role !== "partner") redirect("/auth/redirect")

  const supabase = await createClient()
  const { data: partner } = await supabase
    .from("partners")
    .select("id, company_name, partner_type, status")
    .eq("email", userInfo.email)
    .maybeSingle()

  if (!partner || partner.partner_type !== "event_talent") {
    return (
      <main className="space-y-6 pt-6">
        <header className="space-y-2">
          <p className="eyebrow">Espace talent</p>
          <h1 className="font-display text-4xl font-extrabold tracking-tight text-ink">
            Espace <em className="font-semibold italic text-pink">talent</em>
          </h1>
        </header>
        <StickerCard className="p-10 text-center text-mute">
          Cet espace est réservé aux partenaires de type DJ / performer.
        </StickerCard>
      </main>
    )
  }

  const isActive = partner.status === "active"

  return (
    <main className="space-y-6 pt-6">
      <header className="space-y-2">
        <p className="eyebrow">Espace talent</p>
        <h1 className="font-display text-4xl font-extrabold tracking-tight text-ink">
          Tes <em className="font-semibold italic text-pink">gigs</em> sur Nivy
        </h1>
        <div className="flex items-center gap-2">
          <span className="font-display font-bold text-ink">{partner.company_name}</span>
          <span
            className={
              "rounded-full border-2 border-ink px-3 py-0.5 font-mono text-xs font-semibold uppercase tracking-wide " +
              (isActive ? "bg-lime/15 text-ink" : "bg-gold/15 text-ink")
            }
          >
            {isActive ? "Actif" : "En attente"}
          </span>
        </div>
      </header>

      {/* Setup en cours — bloc unique honnête (dj_bookings absent) */}
      <NivEmpty
        mood="proud"
        title="Ton setup est presque prêt"
        description="Le module de bookings (dj_bookings) s'ouvre après l'activation admin. En attendant, complète ton dossier pour démarrer en un clin d'œil."
        action={
          <Button asChild variant="pink">
            <Link href="/partner/kyc">Compléter mon KYC</Link>
          </Button>
        }
      />

      <StickerCard className="gap-2 p-5">
        <ul className="space-y-2 text-sm">
          <li className="flex items-center gap-2 text-ink">
            <ShieldCheck className="size-4 text-teal" /> Vérifier ton identité (KYC)
          </li>
          <li className="flex items-center gap-2 text-ink">
            <Music className="size-4 text-pink" /> Compléter ton profil (démos, dispo, contrats)
          </li>
          <li className="flex items-center gap-2 text-ink">
            <Wallet className="size-4 text-lime" /> Configurer tes paiements
          </li>
        </ul>
      </StickerCard>

      <StickerCard className="gap-4 p-6">
        <h2 className="flex items-center gap-2 font-display text-lg font-extrabold tracking-tight text-ink">
          <Calendar className="size-5 text-mute" />
          Demandes de booking
        </h2>
        <EmptyState
          icon={Calendar}
          title="Module booking en cours de mise en place"
          description="La gestion des bookings (dj_bookings) sera ouverte après l'activation côté admin. Pour l'instant, complète ton dossier KYC pour être prêt."
          action={{ label: "Compléter mon KYC", href: "/partner/kyc" }}
        />
      </StickerCard>

      <div className="grid gap-4 text-xs sm:grid-cols-3">
        <Link href="/partner/kyc" className="block">
          <StickerCard variant="hover" className="gap-1 p-4">
            <ShieldCheck className="mb-1 size-5 text-teal" />
            <p className="font-display font-bold text-ink">KYC</p>
            <p className="text-mute">Pièces du dossier</p>
          </StickerCard>
        </Link>
        <Link href="/partner/payouts" className="block">
          <StickerCard variant="hover" className="gap-1 p-4">
            <Wallet className="mb-1 size-5 text-lime" />
            <p className="font-display font-bold text-ink">Paiements</p>
            <p className="text-mute">Historique virements</p>
          </StickerCard>
        </Link>
        <Link href="/partner/settings" className="block">
          <StickerCard variant="hover" className="gap-1 p-4">
            <Music className="mb-1 size-5 text-pink" />
            <p className="font-display font-bold text-ink">Profil</p>
            <p className="text-mute">Démos, dispo, contrats</p>
          </StickerCard>
        </Link>
      </div>
    </main>
  )
}
