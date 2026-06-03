import { Suspense } from "react"
import { getUserRole } from "@/lib/auth/get-user-role"
import { redirect } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ShoppingBag, Users, TrendingUp, QrCode, Tag, Plus } from "lucide-react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"

import { StickerCard } from "@/components/ui/sticker-card"
import { Niv, StatHero } from "@/components/brand"
import { MeshBackground } from "@/components/ui/effects/mesh-background"
import { PartnerAwaitingApproval } from "@/components/dashboard/partner/awaiting-approval"
import {
  LazyPartnerActiveOffersFeed,
  LazyPartnerLiveTransactionsFeed,
} from "./lazy-components"
import { SkeletonCard } from "@/components/ui/skeletons/presets"

// Wave 3A / canon D11 — `verified` and `approved` are forbidden synonyms.
// The single canonical "live" status is 'active'.

async function getPartnerStats(partnerEmail: string) {
  const supabase = await createClient()

  const { data: partner } = await supabase
    .from("partners")
    .select("id, company_name, partner_type, status, created_at")
    .eq("email", partnerEmail)
    .single()

  if (!partner) return null

  const { count: activeOffersCount } = await supabase
    .from("partner_discounts")
    .select("*", { count: "exact", head: true })
    .eq("partner_id", partner.id)
    .eq("is_active", true)
    .gte("valid_until", new Date().toISOString().split("T")[0])

  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)

  // #59 — partner revenue from partner_transactions (single source).
  const { data: txns, count: transactionsCount } = await supabase
    .from("partner_transactions")
    .select("id, amount_dh, scanned_at, created_at, teen_id", { count: "exact" })
    .eq("partner_id", partner.id)
    .eq("status", "succeeded")
    .gte("created_at", startOfMonth.toISOString())
    .order("created_at", { ascending: false })

  const txnRows = txns || []
  const totalRevenue = txnRows.reduce((sum, t) => sum + (Number(t.amount_dh) || 0), 0)
  const uniqueCustomers = new Set(txnRows.map((t) => t.teen_id).filter(Boolean)).size

  const feedTeenIds = [...new Set(txnRows.slice(0, 3).map((t) => t.teen_id).filter(Boolean))]
  const teenNameById = new Map<string, string>()
  if (feedTeenIds.length > 0) {
    const { data: feedTeens } = await supabase
      .from("teens")
      .select("id, first_name, last_name, pseudo")
      .in("id", feedTeenIds)
    for (const tt of feedTeens || []) {
      teenNameById.set(
        tt.id,
        `${tt.first_name ?? ""} ${tt.last_name ?? ""}`.trim() || tt.pseudo || "Member",
      )
    }
  }

  const recentTransactions = txnRows.slice(0, 3).map((t) => ({
    id: t.id,
    used_at: t.scanned_at ?? t.created_at,
    final_amount: Number(t.amount_dh) || 0,
    // partner_transactions carries no discount column — don't fabricate a
    // "-0 DH" pill; null suppresses it in the feed.
    discount_amount: null,
    profile: { full_name: teenNameById.get(t.teen_id) ?? "Member" },
  }))

  const { data: offers } = await supabase
    .from("partner_discounts")
    .select("id, discount_name, discount_type, discount_value, current_total_uses")
    .eq("partner_id", partner.id)
    .eq("is_active", true)
    .gte("valid_until", new Date().toISOString().split("T")[0])
    .order("current_total_uses", { ascending: false })
    .limit(3)

  return {
    partnerId: partner.id,
    companyName: partner.company_name,
    partnerType: partner.partner_type,
    status: (partner.status as string | null) ?? "pending",
    createdAt: partner.created_at as string | null,
    transactionsCount: transactionsCount || 0,
    uniqueCustomers,
    totalRevenue,
    activeOffersCount: activeOffersCount || 0,
    activeOffers: offers || [],
    recentTransactions,
  }
}

// Hero dérivé de partner_type (couvre les 8 verticales).
const TYPE_META: Record<string, { icon: string; label: string }> = {
  retail: { icon: "🛍️", label: "Boutique" },
  venue: { icon: "🍽️", label: "Lieu" },
  club: { icon: "🏃", label: "Club" },
  education: { icon: "📚", label: "École" },
  food: { icon: "🍔", label: "Food" },
  event_organizer: { icon: "🎉", label: "Événementiel" },
  event_talent: { icon: "🎤", label: "Talent" },
  creator: { icon: "🎨", label: "Créateur" },
}

const ACTIONS = [
  { label: "Scan QR", icon: QrCode, href: "/partner/scanner" },
  { label: "Campagne", icon: Tag, href: "/partner/offers/new" },
  { label: "Analytics", icon: TrendingUp, href: "/partner/stats" },
  { label: "Support", icon: Users, href: "/partner/support" },
]

export default async function PartnerDashboardPage() {
  const userInfo = await getUserRole()

  if (!userInfo || userInfo.role !== "partner") {
    redirect("/auth/redirect")
  }

  const stats = await getPartnerStats(userInfo.email)

  const companyName = stats?.companyName || userInfo.partnerData?.companyName || "Entreprise"
  const partnerType = stats?.partnerType || userInfo.partnerData?.partnerType || "retail"
  const partnerStatus = stats?.status ?? "pending"

  if (partnerStatus !== "active") {
    return (
      <PartnerAwaitingApproval
        companyName={companyName}
        status={partnerStatus}
        submittedAt={stats?.createdAt ?? null}
      />
    )
  }

  const transactionsCount = stats?.transactionsCount || 0
  const uniqueCustomers = stats?.uniqueCustomers || 0
  const totalRevenue = stats?.totalRevenue || 0
  const activeOffersCount = stats?.activeOffersCount || 0
  const activeOffers = stats?.activeOffers || []
  const recentTransactions = stats?.recentTransactions || []
  const meta = TYPE_META[partnerType] ?? TYPE_META.retail

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-paper text-ink">
      <MeshBackground />
      <div className="relative z-10 mx-auto max-w-7xl space-y-8 px-4 py-10 md:px-8">
        {/* Hero */}
        <StickerCard className="gap-6 p-6 sm:p-8">
          <div className="flex flex-col items-center justify-between gap-8 lg:flex-row">
            <div className="flex flex-col items-center gap-5 text-center md:flex-row md:text-left">
              <Niv mood="proud" size={104} float className="shrink-0" />
              <div>
                <p className="eyebrow tracking-[0.16em]">{meta.label} · Partenaire</p>
                <h1 className="mt-1 font-display text-4xl font-extrabold leading-[1.02] tracking-tight md:text-5xl">
                  {meta.icon} <em className="font-semibold italic text-pink">{companyName}</em>
                </h1>
                <p className="mt-1 text-mute">Espace partenaire · Casablanca</p>
              </div>
            </div>

            <div className="flex flex-wrap justify-center gap-3">
              <Button asChild variant="pink" size="lg">
                <Link href="/partner/offers/new"><Plus className="mr-2 size-5" aria-hidden="true" />Nouvelle offre</Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/partner/scanner"><QrCode className="mr-2 size-5" aria-hidden="true" />Scanner</Link>
              </Button>
            </div>
          </div>
        </StickerCard>

        {/* KPI — CA hero (surface sombre) + secondaires sticker */}
        <div className="grid gap-4 lg:grid-cols-2">
          <StatHero
            eyebrow="Chiffre d'affaires · ce mois"
            value={totalRevenue.toLocaleString("fr-FR")}
            unit="DH"
            tone="gold"
            size="lg"
            icon={<TrendingUp className="size-6" aria-hidden="true" />}
            meta={<span className="flex items-center gap-2"><span className="size-2 rounded-full bg-lime" />{transactionsCount} transactions · {activeOffersCount} offres actives</span>}
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <StickerCard variant="hover" className="gap-2 p-5">
              <div className="flex items-center justify-between">
                <p className="eyebrow">Clients</p>
                <Users className="size-5 text-teal" aria-hidden="true" />
              </div>
              <p className="font-display text-4xl font-extrabold tabular-nums text-ink">{uniqueCustomers}</p>
              <p className="font-mono text-xs text-mute">Utilisateurs actifs</p>
            </StickerCard>
            <StickerCard variant="hover" className="gap-2 p-5">
              <div className="flex items-center justify-between">
                <p className="eyebrow">Transactions</p>
                <ShoppingBag className="size-5 text-coral" aria-hidden="true" />
              </div>
              <p className="font-display text-4xl font-extrabold tabular-nums text-ink">{transactionsCount}</p>
              <p className="font-mono text-xs text-mute">Ce mois-ci</p>
            </StickerCard>
          </div>
        </div>

        {/* Feeds */}
        <div className="grid gap-4 lg:grid-cols-2">
          <StickerCard className="overflow-hidden p-0">
            <Suspense fallback={<SkeletonCard noImage lines={5} className="min-h-[360px] border-0 bg-transparent" />}>
              <LazyPartnerActiveOffersFeed offers={activeOffers as any} activeCount={activeOffersCount} />
            </Suspense>
          </StickerCard>
          <StickerCard className="overflow-hidden p-0">
            <Suspense fallback={<SkeletonCard noImage lines={5} className="min-h-[360px] border-0 bg-transparent" />}>
              <LazyPartnerLiveTransactionsFeed transactions={recentTransactions as any} />
            </Suspense>
          </StickerCard>
        </div>

        {/* Action dock */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {ACTIONS.map((action) => (
            <Link
              key={action.label}
              href={action.href}
              className="group flex flex-col items-center gap-3 rounded-2xl border-2 border-ink bg-white p-6 text-center shadow-stkr-sm transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-stkr-pink motion-reduce:translate-x-0 motion-reduce:translate-y-0"
            >
              <span className="grid size-12 place-items-center rounded-xl border-2 border-ink bg-paper-2">
                <action.icon className="size-6 text-pink" aria-hidden="true" />
              </span>
              <span className="font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-ink">{action.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
