import { getUserRole } from "@/lib/auth/get-user-role"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { StickerCard } from "@/components/ui/sticker-card"
import { StatusBadge, type StatusVariant } from "@/components/ui/status-badge"
import { DarkSurface, StatHero, NivEmpty } from "@/components/brand"
import {
  Wallet,
  ArrowLeft,
  TrendingUp,
  Calendar,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react"
import Link from "next/link"

async function getCommissionHistory(profileId: string) {
  const supabase = await createClient()

  // #29 — ambassadors keyed on user_id; commission_pct lives on the row.
  const { data: ambassador } = await supabase
    .from("ambassadors")
    .select("id, commission_pct")
    .eq("user_id", profileId)
    .maybeSingle()

  if (!ambassador) return { commissions: [], stats: null }

  // #29 — unified ledger: ambassador_commissions (credits) + ambassador_payouts
  // (debits). The old referral_usage / ambassador_withdrawals tables and their
  // commission_amount / amount / payment_method columns don't exist in the DB.
  const [{ data: commissionRows }, { data: payoutRows }] = await Promise.all([
    supabase
      .from("ambassador_commissions")
      .select("id, amount_dh, status, created_at, referred_user_id")
      .eq("ambassador_id", ambassador.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("ambassador_payouts")
      .select("id, amount_dh, status, method, created_at")
      .eq("ambassador_id", ambassador.id)
      .order("created_at", { ascending: false }),
  ])

  const commissions = commissionRows || []
  const payouts = payoutRows || []

  // Resolve filleul names for commission descriptions (no FK to embed).
  const referredIds = [...new Set(commissions.map((c) => c.referred_user_id).filter(Boolean))]
  const nameById = new Map<string, string>()
  if (referredIds.length > 0) {
    const { data: profs } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", referredIds)
    for (const p of profs || []) nameById.set(p.id, p.full_name || "Utilisateur")
  }

  // Combine and sort all transactions
  const allTransactions: any[] = []

  for (const c of commissions) {
    const userName = nameById.get(c.referred_user_id) || "Utilisateur"
    allTransactions.push({
      id: c.id,
      type: "commission",
      amount: Number(c.amount_dh) || 0,
      status: c.status || "pending",
      date: c.created_at,
      description: `Commission - ${userName}`,
      source: userName,
    })
  }

  for (const p of payouts) {
    allTransactions.push({
      id: p.id,
      type: "withdrawal",
      amount: -(Number(p.amount_dh) || 0),
      status: p.status,
      date: p.created_at,
      description: `Retrait - ${p.method || "Virement"}`,
      source: p.method || "Virement",
    })
  }

  // Sort by date descending
  allTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  // Calculate stats
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0)

  const totalEarnings = commissions.reduce((sum, c) => sum + (Number(c.amount_dh) || 0), 0)

  const monthlyEarnings = commissions
    .filter((c) => new Date(c.created_at) >= startOfMonth)
    .reduce((sum, c) => sum + (Number(c.amount_dh) || 0), 0)

  const lastMonthEarnings = commissions
    .filter((c) => {
      const date = new Date(c.created_at)
      return date >= startOfLastMonth && date <= endOfLastMonth
    })
    .reduce((sum, c) => sum + (Number(c.amount_dh) || 0), 0)

  // ambassador_payouts.status ∈ {pending, paid, failed}.
  const pendingWithdrawals = payouts
    .filter((p) => p.status === "pending")
    .reduce((sum, p) => sum + (Number(p.amount_dh) || 0), 0)

  const totalWithdrawn = payouts
    .filter((p) => p.status === "paid")
    .reduce((sum, p) => sum + (Number(p.amount_dh) || 0), 0)

  return {
    commissions: allTransactions,
    stats: {
      totalEarnings,
      monthlyEarnings,
      lastMonthEarnings,
      pendingWithdrawals,
      totalWithdrawn,
      commissionRate: Number(ambassador.commission_pct) || 15,
      // Pending payouts are committed funds → excluded from available balance.
      availableBalance: totalEarnings - totalWithdrawn - pendingWithdrawals,
    },
  }
}

export default async function AmbassadorCommissionsPage() {
  const userInfo = await getUserRole()

  if (!userInfo || userInfo.role !== "ambassador") {
    redirect("/auth/redirect")
  }

  const { commissions, stats } = await getCommissionHistory(userInfo.profileId)

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
  }

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getTransactionIcon = (type: string, amount: number) => {
    if (type === "withdrawal") {
      return <ArrowUpRight className="h-5 w-5 text-destructive" />
    }
    return <ArrowDownRight className="h-5 w-5 text-lime" />
  }

  // Statut → StatusBadge charte (plus jamais le code brut).
  const getStatus = (status: string): { variant: StatusVariant; label: string } => {
    switch (status) {
      case "completed":
      case "paid":
        return { variant: "success", label: "Complété" }
      case "active":
        return { variant: "success", label: "Actif" }
      case "pending":
        return { variant: "pending", label: "En attente" }
      case "failed":
        return { variant: "danger", label: "Refusé" }
      default:
        return { variant: "neutral", label: "Inconnu" }
    }
  }

  // Calculate growth
  const growth = stats?.lastMonthEarnings
    ? Math.round(((stats.monthlyEarnings - stats.lastMonthEarnings) / stats.lastMonthEarnings) * 100)
    : 0

  return (
    <div className="bg-paper">
      <div className="container mx-auto px-6 py-20 md:py-32">
        {/* Back button */}
        <Button variant="ghost" asChild className="mb-6">
          <Link href="/ambassador">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour au dashboard
          </Link>
        </Button>

        {/* Header éditorial */}
        <div className="mb-8">
          <span className="eyebrow tracking-[0.16em] text-pink">Mes commissions</span>
          <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight text-ink">
            Ton <em className="font-semibold italic text-pink">cash</em>, suivi au dirham près.
          </h1>
          <p className="mt-2 text-mute">Historique complet de tes gains.</p>
        </div>

        {/* Hiérarchie 1-2-3 : Disponible dominant + stats secondaires */}
        <div className="mb-8 grid gap-4 lg:grid-cols-[1.2fr_2fr]">
          {/* Disponible — surface sombre, montant retirable */}
          <StatHero
            eyebrow="Disponible"
            value={(stats?.availableBalance || 0).toLocaleString()}
            unit="DH"
            tone="lime"
            icon={<Wallet className="h-5 w-5" />}
            meta={
              <Button asChild variant="lime" size="sm" className="mt-1">
                <Link href="/ambassador/withdrawals">Retirer</Link>
              </Button>
            }
          />

          {/* Stats secondaires en cartes sticker */}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
            <StickerCard className="p-5">
              <span className="eyebrow tracking-[0.16em] text-mute">Total gagné</span>
              <p className="mt-1 font-mono text-2xl font-bold tabular-nums text-ink">{(stats?.totalEarnings || 0).toLocaleString()} DH</p>
            </StickerCard>

            <StickerCard className="p-5">
              <div className="flex items-center justify-between">
                <span className="eyebrow tracking-[0.16em] text-mute">Ce mois</span>
                <Calendar className="h-4 w-4 text-pink" />
              </div>
              <p className="mt-1 font-mono text-2xl font-bold tabular-nums text-ink">{(stats?.monthlyEarnings || 0).toLocaleString()} DH</p>
              {growth !== 0 && (
                <p className={`mt-1 font-mono text-xs ${growth > 0 ? "text-lime" : "text-destructive"}`}>
                  {growth > 0 ? "+" : ""}{growth}% vs mois dernier
                </p>
              )}
            </StickerCard>

            <StickerCard className="p-5">
              <div className="flex items-center justify-between">
                <span className="eyebrow tracking-[0.16em] text-mute">Taux</span>
                <TrendingUp className="h-4 w-4 text-gold" />
              </div>
              <p className="mt-1 font-mono text-2xl font-bold tabular-nums text-ink">{stats?.commissionRate || 15}%</p>
            </StickerCard>

            <StickerCard className="p-5">
              <span className="eyebrow tracking-[0.16em] text-mute">Total retiré</span>
              <p className="mt-1 font-mono text-2xl font-bold tabular-nums text-ink">{(stats?.totalWithdrawn || 0).toLocaleString()} DH</p>
            </StickerCard>

            <StickerCard className="col-span-2 p-5 md:col-span-1">
              <div className="flex items-center justify-between">
                <span className="eyebrow tracking-[0.16em] text-mute">En traitement</span>
                <Clock className="h-4 w-4 text-gold" />
              </div>
              <p className="mt-1 font-mono text-2xl font-bold tabular-nums text-ink">{(stats?.pendingWithdrawals || 0).toLocaleString()} DH</p>
            </StickerCard>
          </div>
        </div>

        {/* Transaction History */}
        <StickerCard className="p-6">
          <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-extrabold text-ink">
            <Wallet className="h-5 w-5 text-lime" />
            Historique des transactions
          </h2>
          {commissions.length > 0 ? (
            <div className="space-y-3">
              {commissions.map((transaction: any) => {
                const status = getStatus(transaction.status)
                const isPositive = transaction.amount > 0

                return (
                  <div
                    key={transaction.id}
                    className="flex flex-col gap-3 rounded-xl border-2 border-line bg-white p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex min-w-0 items-center gap-4">
                      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border-2 border-ink ${
                        isPositive ? "bg-lime/15" : "bg-destructive/12"
                      }`}>
                        {getTransactionIcon(transaction.type, transaction.amount)}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-medium text-ink">{transaction.description}</p>
                        <p className="font-mono text-xs text-mute">{formatDateTime(transaction.date)}</p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-4">
                      <p className={`font-mono text-lg font-bold tabular-nums ${isPositive ? "text-lime" : "text-destructive"}`}>
                        {isPositive ? "+" : ""}{transaction.amount} DH
                      </p>
                      <StatusBadge variant={status.variant} label={status.label} />
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <NivEmpty
              title="Pas encore de transactions"
              description="Tes commissions apparaîtront ici dès que tes filleuls s'inscriront."
              action={
                <Button asChild variant="pink">
                  <Link href="/ambassador">Partager mon code</Link>
                </Button>
              }
            />
          )}
        </StickerCard>
      </div>
    </div>
  )
}
