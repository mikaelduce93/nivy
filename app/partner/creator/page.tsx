/**
 * Wave 3B.2 — creator dashboard (sponsored content economy).
 *
 * Real read on `creator_engagement` (engagement signals exist). Sponsored
 * brief inbox + payout are deferred (sponsored_posts table not yet in DB);
 * we surface honest "setup pending" copy instead of fabricated metrics.
 */
import Link from "next/link"
import { redirect } from "next/navigation"
import { Sparkles, Mail, Wallet, ShieldCheck } from "lucide-react"
import { getUserRole } from "@/lib/auth/get-user-role"
import { createClient } from "@/lib/supabase/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { StickerCard } from "@/components/ui/sticker-card"
import { DarkSurface, Niv, NivEmpty } from "@/components/brand"
import { Button } from "@/components/ui/button"

export const dynamic = "force-dynamic"

export default async function PartnerCreatorDashboardPage() {
  const userInfo = await getUserRole()
  if (!userInfo) redirect("/auth/login")
  if (userInfo.role !== "partner") redirect("/auth/redirect")

  const supabase = await createClient()
  const { data: partner } = await supabase
    .from("partners")
    .select("id, company_name, partner_type, status")
    .eq("email", userInfo.email)
    .maybeSingle()

  if (!partner || partner.partner_type !== "creator") {
    return (
      <StickerCard className="p-10 text-center text-mute">
        Cet espace est réservé aux partenaires de type créateur.
      </StickerCard>
    )
  }

  // Real engagement signals (canonical table). We aggregate counts only —
  // never fabricate revenue or campaign numbers.
  const sr = createServiceRoleClient()
  const { count: engagementCount } = await sr
    .from("creator_engagement")
    .select("*", { count: "exact", head: true })
    .eq("partner_id", partner.id)

  const isActive = partner.status === "active"

  return (
    <main className="space-y-6 pt-6">
      <header className="space-y-2">
        <p className="eyebrow">Espace créateur</p>
        <h1 className="font-display text-4xl font-extrabold tracking-tight text-ink">
          Tes <em className="font-semibold italic text-pink">collabs</em> sur Nivy
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

      {/* Le seul vrai chiffre — mis en avant + Niv */}
      <DarkSurface tone="pink" shadow className="p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="eyebrow tracking-[0.16em] text-paper/60">Signaux d&apos;engagement</p>
            <p className="mt-2 font-display text-[clamp(2.5rem,8vw,3.25rem)] font-extrabold leading-none tabular-nums text-pink">
              {engagementCount ?? 0}
            </p>
            <p className="mt-2 text-sm text-paper/60">Total enregistré sur ton profil.</p>
          </div>
          <Niv mood="hype" size={88} className="shrink-0" />
        </div>
      </DarkSurface>

      {/* Briefs / paiements — bandeau « bientôt » compact */}
      <div className="grid gap-4 sm:grid-cols-2">
        <StickerCard variant="panel" className="gap-1 p-4 opacity-80">
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2 font-display font-bold text-ink"><Mail className="size-4 text-mute" />Briefs reçus</span>
            <span className="rounded-full border-2 border-ink bg-paper-2 px-2 py-0.5 font-mono text-[11px] font-semibold uppercase tracking-wide text-mute">Bientôt</span>
          </div>
          <p className="text-sm text-mute">Le module brief arrive après la première campagne marque.</p>
        </StickerCard>
        <StickerCard variant="panel" className="gap-1 p-4 opacity-80">
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2 font-display font-bold text-ink"><Wallet className="size-4 text-mute" />Paiements</span>
            <span className="rounded-full border-2 border-ink bg-paper-2 px-2 py-0.5 font-mono text-[11px] font-semibold uppercase tracking-wide text-mute">Bientôt</span>
          </div>
          <p className="text-sm text-mute">Aucun paiement à ce stade.</p>
        </StickerCard>
      </div>

      <StickerCard className="gap-4 p-6">
        <h2 className="flex items-center gap-2 font-display text-lg font-extrabold tracking-tight text-ink">
          <Mail className="size-5 text-mute" />
          Briefs sponsorisés
        </h2>
        <NivEmpty
          mood="proud"
          title="Pas encore de briefs"
          description="Le système de briefs sponsorisés s'ouvre dès qu'une marque partenaire lance sa première campagne. Aucune campagne fictive ici, promis."
          action={
            <Button asChild variant="pink">
              <Link href="/partner/creator/briefs">Voir mes briefs</Link>
            </Button>
          }
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
            <p className="text-mute">Virements mensuels</p>
          </StickerCard>
        </Link>
        <Link href="/partner/settings" className="block">
          <StickerCard variant="hover" className="gap-1 p-4">
            <Sparkles className="mb-1 size-5 text-pink" />
            <p className="font-display font-bold text-ink">Profil</p>
            <p className="text-mute">Plateformes, audience</p>
          </StickerCard>
        </Link>
      </div>
    </main>
  )
}
