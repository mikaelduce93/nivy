import { getUserRole } from "@/lib/auth/get-user-role"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  History,
  CreditCard,
  TrendingUp,
  ArrowLeft,
  Users,
  ShoppingBag,
  Ticket,
  Gift,
  CheckCircle,
  Clock,
  XCircle,
  Download,
  Coins,
  ArrowUpRight,
  ArrowDownRight,
  FileText
} from "lucide-react"
import Link from "next/link"
import { TransactionFilters } from "@/components/parent/transaction-filters"
import { EmptyState } from "@/components/ui/states/empty-state"
import { ExportButton } from "@/components/parent/export-button"
import { InvoiceButton } from "@/components/parent/invoice-button"

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
      teen_id,
      event_id,
      total_price,
      status,
      payment_status,
      created_at,
      event:event_id (
        title,
        event_date
      )
    `)
    .in("teen_id", teenIds)
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

  // Get shop purchases
  const { data: shopPurchases } = await supabase
    .from("shop_purchases")
    .select(`
      id,
      teen_id,
      product_name,
      price,
      coins_used,
      status,
      created_at
    `)
    .in("teen_id", teenIds)
    .order("created_at", { ascending: false })
    .limit(30)

  // Calculate totals
  const totalSpent = bookings?.filter((b: any) => b.payment_status === "paid")
    .reduce((sum: number, b: any) => sum + (b.total_price || 0), 0) || 0

  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)

  const monthlySpent = bookings?.filter((b: any) =>
    b.payment_status === "paid" && new Date(b.created_at) >= startOfMonth
  ).reduce((sum: number, b: any) => sum + (b.total_price || 0), 0) || 0

  const totalTopup = coinTransactions?.filter((t: any) => t.transaction_type === "topup")
    .reduce((sum: number, t: any) => sum + (t.amount || 0), 0) || 0

  // Create teen name map
  const teenNameMap = new Map(teens.map((t: any) => [t.teen_id, t.teen_name]))

  // Merge and format transactions
  const transactions = [
    ...(bookings || []).map((b: any) => ({
      id: b.id,
      type: "booking" as const,
      teenId: b.teen_id,
      teenName: teenNameMap.get(b.teen_id) || "Unknown",
      amount: b.total_price,
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
    })),
    ...(shopPurchases || []).map((s: any) => ({
      id: s.id,
      type: "shop" as const,
      teenId: s.teen_id,
      teenName: teenNameMap.get(s.teen_id) || "Unknown",
      amount: s.price,
      coinsUsed: s.coins_used,
      status: s.status,
      date: s.created_at,
      description: s.product_name || "Achat boutique"
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "confirmed":
      case "completed":
        return <CheckCircle className="h-4 w-4 text-lime" />
      case "pending":
        return <Clock className="h-4 w-4 text-gold" />
      case "cancelled":
        return <XCircle className="h-4 w-4 text-destructive" />
      default:
        return <Clock className="h-4 w-4 text-mute" />
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case "confirmed":
        return "Confirmé"
      case "completed":
        return "Terminé"
      case "pending":
        return "En attente"
      case "cancelled":
        return "Annulé"
      default:
        return status
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

  const getTypeBadge = (type: string) => {
    switch (type) {
      case "booking":
        return { text: "Réservation", class: "bg-pink/20 text-pink" }
      case "discount":
        return { text: "Réduction", class: "bg-lime/20 text-lime" }
      case "coins":
        return { text: "Coins", class: "bg-gold/20 text-gold" }
      case "shop":
        return { text: "Boutique", class: "bg-teal/20 text-teal" }
      default:
        return { text: type, class: "bg-muted text-mute" }
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

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-32">
        {/* Back button */}
        <Button variant="ghost" asChild className="mb-6 text-mute hover:text-ink">
          <Link href="/parent">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour au dashboard
          </Link>
        </Button>

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-black text-ink">Historique</h1>
            <p className="text-mute">Toutes les transactions de vos teens</p>
          </div>
          <ExportButton transactions={transactions} />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-gradient-to-br from-lime/20 to-lime/20 border-lime/30 bg-card">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-lime font-medium">Total dépensé</p>
                  <p className="text-3xl font-black text-ink">{totalSpent.toLocaleString()} DH</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-lime/20 flex items-center justify-center">
                  <CreditCard className="h-6 w-6 text-lime" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-teal/20 to-teal/20 border-teal/30 bg-card">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-teal font-medium">Ce mois</p>
                  <p className="text-3xl font-black text-ink">{monthlySpent.toLocaleString()} DH</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-teal/20 flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-teal" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-gold/20 to-coral/20 border-gold/30 bg-card">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gold font-medium">Coins rechargés</p>
                  <p className="text-3xl font-black text-ink">{totalTopup.toLocaleString()}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-gold/20 flex items-center justify-center">
                  <Coins className="h-6 w-6 text-gold" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-pink/20 to-pink/20 border-pink/30 bg-card">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-pink font-medium">Transactions</p>
                  <p className="text-3xl font-black text-ink">{transactions.length}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-pink/20 flex items-center justify-center">
                  <History className="h-6 w-6 text-pink" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <TransactionFilters teens={teens} />

        {/* Transaction List */}
        <Card className="bg-gradient-to-br from-paper-2 to-card border-ink">
          <CardHeader>
            <CardTitle className="text-ink flex items-center gap-2">
              <History className="h-5 w-5 text-lime" />
              Toutes les transactions
            </CardTitle>
          </CardHeader>
          <CardContent>
            {transactions.length > 0 ? (
              <div className="space-y-3">
                {transactions.map((tx: any) => {
                  const typeBadge = getTypeBadge(tx.type)
                  return (
                    <div
                      key={`${tx.type}-${tx.id}`}
                      className="flex items-center justify-between p-4 rounded-xl bg-card border border-ink hover:border-lime/30 transition-all"
                    >
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-xl bg-card flex items-center justify-center">
                          {getTypeIcon(tx.type, tx.coinType)}
                        </div>
                        <div>
                          <p className="font-semibold text-ink">{tx.description}</p>
                          <div className="flex items-center gap-2 text-xs text-mute mt-1">
                            <span className={`px-2 py-0.5 rounded-full ${typeBadge.class}`}>
                              {typeBadge.text}
                            </span>
                            <span>•</span>
                            <span>{tx.teenName}</span>
                            <span>•</span>
                            <span>{formatDate(tx.date)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          {tx.type === "coins" ? (
                            <p className={`font-black ${tx.coinType === "topup" ? "text-lime" : "text-coral"}`}>
                              {tx.coinType === "topup" ? "+" : "-"}{tx.amount?.toLocaleString()} coins
                            </p>
                          ) : (
                            <p className="font-black text-ink">{tx.amount?.toLocaleString()} DH</p>
                          )}
                          {tx.discount && (
                            <p className="text-xs text-lime">-{tx.discount} DH économisé</p>
                          )}
                          {tx.coinsUsed && (
                            <p className="text-xs text-gold">{tx.coinsUsed} coins utilisés</p>
                          )}
                          <div className="flex items-center justify-end gap-1 mt-1">
                            {getStatusIcon(tx.status)}
                            <span className="text-xs text-mute">{getStatusText(tx.status)}</span>
                          </div>
                        </div>
                        {/* Invoice button for paid bookings and topups */}
                        {((tx.type === "booking" && tx.paymentStatus === "paid") ||
                          (tx.type === "coins" && tx.coinType === "topup")) && (
                          <InvoiceButton
                            transactionId={tx.id}
                            transactionType={tx.type === "booking" ? "booking" : "topup"}
                          />
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <EmptyState
                icon={History}
                title="Aucune transaction"
                description="L'historique des transactions apparaîtra ici"
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
