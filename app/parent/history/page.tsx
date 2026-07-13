import { getUserRole } from "@/lib/auth/get-user-role"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import {
  ArrowLeft,
  Ticket,
  Gift,
  ArrowUpRight,
  ArrowDownRight,
  ShoppingBag,
} from "lucide-react"
import Link from "next/link"
import { TransactionFilters } from "@/components/parent/transaction-filters"
import { ExportButton } from "@/components/parent/export-button"
import { InvoiceButton } from "@/components/parent/invoice-button"
import { StickerCard } from "@/components/ui/sticker-card"
import { StatusBadge, type StatusVariant } from "@/components/ui/status-badge"
import { StatHero, NivEmpty } from "@/components/brand"

async function getTransactionHistory(profileId: string) {
  const supabase = await createClient()

  // Polish-F: wrap each Supabase read so one failing query doesn't 500 the
  // whole history page. Empty fallbacks keep the rest of the dashboard
  // alive; the page will still render KPIs at zero.
  let teens: any[] = []
  try {
    const { data, error } = await supabase
      .from("parent_teens_overview")
      .select("*")
      .eq("parent_id", profileId)
    if (error) console.error("[parent/history] teens error:", error)
    teens = data ?? []
  } catch (err) {
    console.error("[parent/history] teens threw:", err)
  }

  if (!teens || teens.length === 0) {
    return { transactions: [], teens: [], totalSpent: 0, monthlySpent: 0, totalTopup: 0 }
  }

  const teenIds = teens.map((t: any) => t.teen_id)

  // Get all bookings (transactions)
  const { data: bookings } = await supabase
    .from("bookings")
    .select(`
      id,
      user_id,
      event_id,
      total_amount,
      status,
      payment_status,
      created_at,
      event:event_id (
        title,
        event_date
      )
    `)
    .in("user_id", teenIds)
    .order("created_at", { ascending: false })
    .limit(100)

  // Get coin transactions (topups). Schema (migration 028 / types/supabase):
  // teen_id, transaction_type, amount, description, created_at.
  const { data: coinTransactions } = await supabase
    .from("coin_transactions")
    .select(`
      id,
      teen_id,
      amount,
      transaction_type,
      description,
      created_at
    `)
    .in("teen_id", teenIds)
    .order("created_at", { ascending: false })
    .limit(50)

  // Get discount usage
  const { data: discountUsage } = await supabase
    .from("discount_usage")
    .select(`
      id,
      profile_id,
      purchase_amount,
      discount_amount,
      final_amount,
      used_at
    `)
    .in("profile_id", teenIds)
    .order("used_at", { ascending: false })
    .limit(20)

  // Note (drift): la table "shop_purchases" n'existe pas en base live — lecture
  // retirée. L'analogue XP (user_purchases) a une sémantique différente
  // (xp_spent/reward_id, pas de montant DH), donc pas de substitution ici.

  // Calculate totals
  const totalSpent = bookings?.filter((b: any) => b.payment_status === "paid")
    .reduce((sum: number, b: any) => sum + (b.total_amount || 0), 0) || 0

  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)

  const monthlySpent = bookings?.filter((b: any) =>
    b.payment_status === "paid" && new Date(b.created_at) >= startOfMonth
  ).reduce((sum: number, b: any) => sum + (b.total_amount || 0), 0) || 0

  const totalTopup = coinTransactions?.filter((t: any) => t.transaction_type === "topup")
    .reduce((sum: number, t: any) => sum + (t.amount || 0), 0) || 0

  // Create teen name map
  const teenNameMap = new Map(teens.map((t: any) => [t.teen_id, t.teen_name]))

  // Merge and format transactions
  const transactions = [
    ...(bookings || []).map((b: any) => ({
      id: b.id,
      type: "booking" as const,
      teenId: b.user_id,
      teenName: teenNameMap.get(b.user_id) || "Teen",
      amount: b.total_amount,
      status: b.status,
      paymentStatus: b.payment_status,
      date: b.created_at,
      description: b.event?.title || "Réservation event",
      eventDate: b.event?.event_date
    })),
    ...(coinTransactions || []).map((c: any) => ({
      id: c.id,
      type: "coins" as const,
      teenId: c.teen_id,
      teenName: teenNameMap.get(c.teen_id) || "Teen",
      amount: c.amount,
      coinType: c.transaction_type,
      status: "completed",
      date: c.created_at,
      description: c.description || (c.transaction_type === "topup" ? "Recharge de coins" : c.transaction_type === "spent" ? "Dépense de coins" : "Transaction coins")
    })),
    ...(discountUsage || []).map((d: any) => ({
      id: d.id,
      type: "discount" as const,
      teenId: d.profile_id,
      teenName: teenNameMap.get(d.profile_id) || "Teen",
      amount: d.final_amount,
      discount: d.discount_amount,
      status: "completed",
      date: d.used_at,
      description: "Achat avec réduction partenaire"
    }))
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  return {
    transactions,
    teens,
    totalSpent,
    monthlySpent,
    totalTopup
  }
}

export default async function ParentHistoryPage() {
  const userInfo = await getUserRole()

  if (!userInfo || userInfo.role !== "parent") {
    redirect("/auth/redirect")
  }

  const { transactions, teens, totalSpent, monthlySpent, totalTopup } = await getTransactionHistory(userInfo.profileId)

  const getStatusBadge = (status: string): { text: string; variant: StatusVariant } => {
    switch (status) {
      case "confirmed":
        return { text: "Confirmé", variant: "success" }
      case "completed":
        return { text: "Terminé", variant: "success" }
      case "pending":
        return { text: "En attente", variant: "warning" }
      case "cancelled":
        return { text: "Annulé", variant: "danger" }
      default:
        return { text: status.replace(/_/g, " "), variant: "neutral" }
    }
  }

  const getTypeIcon = (type: string, coinType?: string) => {
    switch (type) {
      case "booking":
        return <Ticket className="h-5 w-5 text-pink" />
      case "discount":
        return <Gift className="h-5 w-5 text-lime" />
      case "coins":
        return coinType === "topup"
          ? <ArrowUpRight className="h-5 w-5 text-lime" />
          : <ArrowDownRight className="h-5 w-5 text-coral" />
      case "shop":
        return <ShoppingBag className="h-5 w-5 text-teal" />
      default:
        return <ShoppingBag className="h-5 w-5 text-mute" />
    }
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "booking":
        return "Réservation"
      case "discount":
        return "Réduction"
      case "coins":
        return "Coins"
      case "shop":
        return "Boutique"
      default:
        return type.replace(/_/g, " ")
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Regroupement par jour avec séparateurs eyebrow mono.
  const dayLabel = (dateString: string) =>
    new Date(dateString).toLocaleDateString("fr-FR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    })
  const groups: { label: string; items: any[] }[] = []
  for (const tx of transactions) {
    const label = dayLabel(tx.date)
    const last = groups[groups.length - 1]
    if (last && last.label === label) last.items.push(tx)
    else groups.push({ label, items: [tx] })
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-10">
        <Button variant="ghost" asChild className="mb-6 text-mute hover:text-ink">
          <Link href="/parent">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour au dashboard
          </Link>
        </Button>

        {/* Header éditorial */}
        <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="eyebrow text-pink">COMPTE · HISTORIQUE</p>
            <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
              Tout ce que <em className="font-semibold italic text-pink">ta famille</em> a dépensé
            </h1>
          </div>
          <ExportButton transactions={transactions} />
        </div>

        {/* Hiérarchie 1-2-3 : total dépensé en hero sombre + 3 stickers */}
        <div className="mb-8 grid gap-4 md:grid-cols-2">
          <StatHero
            eyebrow="Total dépensé"
            value={totalSpent.toLocaleString("fr-FR")}
            unit="DH"
            tone="lime"
            size="lg"
            meta={`${transactions.length} transactions au total`}
          />
          <div className="grid grid-cols-2 gap-4">
            <StickerCard className="p-4">
              <p className="eyebrow text-mute">Ce mois</p>
              <p className="mt-1 font-display text-2xl font-extrabold tabular-nums text-ink">
                {monthlySpent.toLocaleString("fr-FR")}
                <span className="ml-1 font-mono text-sm font-medium text-mute">DH</span>
              </p>
            </StickerCard>
            <StickerCard className="p-4">
              <p className="eyebrow text-mute">Coins rechargés</p>
              <p className="mt-1 font-display text-2xl font-extrabold tabular-nums text-coral">
                ⊙ {totalTopup.toLocaleString("fr-FR")}
              </p>
            </StickerCard>
          </div>
        </div>

        {/* Filters */}
        <TransactionFilters teens={teens} />

        {/* Transaction List groupée par jour */}
        {transactions.length > 0 ? (
          <div className="space-y-6">
            {groups.map((group) => (
              <section key={group.label} className="space-y-3">
                <h2 className="eyebrow text-mute first-letter:uppercase">{group.label}</h2>
                <div className="space-y-3">
                  {group.items.map((tx: any) => {
                    const txStatus = getStatusBadge(tx.status)
                    return (
                      <StickerCard
                        key={`${tx.type}-${tx.id}`}
                        variant="hover"
                        className="p-4"
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                        <div className="flex items-center gap-4">
                          <div className="grid h-12 w-12 place-items-center rounded-xl border-2 border-ink bg-paper">
                            {getTypeIcon(tx.type, tx.coinType)}
                          </div>
                          <div>
                            <p className="font-semibold text-ink">{tx.description}</p>
                            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-mute">
                              <span className="eyebrow text-[10px] text-ink-2">{getTypeLabel(tx.type)}</span>
                              <span>·</span>
                              <span>{tx.teenName}</span>
                              <span>·</span>
                              <span className="font-mono">{formatDate(tx.date)}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            {tx.type === "coins" ? (
                              <p className={`font-mono text-base font-bold tabular-nums ${tx.coinType === "topup" ? "text-lime" : "text-coral"}`}>
                                {tx.coinType === "topup" ? "+" : "−"}⊙ {tx.amount?.toLocaleString("fr-FR")}
                              </p>
                            ) : (
                              <p className="font-mono text-base font-bold tabular-nums text-ink">
                                {tx.amount?.toLocaleString("fr-FR")} DH
                              </p>
                            )}
                            {tx.discount && (
                              <p className="font-mono text-xs text-lime">−{tx.discount} DH économisé</p>
                            )}
                            {tx.coinsUsed && (
                              <p className="font-mono text-xs text-coral">⊙ {tx.coinsUsed} utilisés</p>
                            )}
                            <div className="mt-1 flex justify-end">
                              <StatusBadge variant={txStatus.variant} label={txStatus.text} size="sm" />
                            </div>
                          </div>
                          {((tx.type === "booking" && tx.paymentStatus === "paid") ||
                            (tx.type === "coins" && tx.coinType === "topup")) && (
                            <InvoiceButton
                              transactionId={tx.id}
                              transactionType={tx.type === "booking" ? "booking" : "topup"}
                            />
                          )}
                        </div>
                        </div>
                      </StickerCard>
                    )
                  })}
                </div>
              </section>
            ))}
          </div>
        ) : (
          <NivEmpty
            title="Walou pour l'instant"
            description="Ton crew économise 💪 L'historique des transactions s'affichera ici."
          />
        )}
      </div>
    </div>
  )
}
