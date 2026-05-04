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
import { ExportButton } from "@/components/parent/export-button"
import { InvoiceButton } from "@/components/parent/invoice-button"

async function getTransactionHistory(profileId: string) {
  const supabase = await createClient()

  // Get linked teens
  const { data: teens } = await supabase
    .from("parent_teens_overview")
    .select("*")
    .eq("parent_id", profileId)

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

  // Get coin transactions (topups)
  const { data: coinTransactions } = await supabase
    .from("coin_transactions")
    .select(`
      id,
      teen_id,
      amount,
      type,
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

  const totalTopup = coinTransactions?.filter((t: any) => t.type === "topup")
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
      teenName: teenNameMap.get(c.teen_id) || "Unknown",
      amount: c.amount,
      coinType: c.type,
      status: "completed",
      date: c.created_at,
      description: c.description || (c.type === "topup" ? "Recharge de coins" : c.type === "spent" ? "Dépense de coins" : "Transaction coins")
    })),
    ...(discountUsage || []).map((d: any) => ({
      id: d.id,
      type: "discount" as const,
      teenId: d.profile_id,
      teenName: teenNameMap.get(d.profile_id) || "Teen Club",
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
        return <CheckCircle className="h-4 w-4 text-emerald-400" />
      case "pending":
        return <Clock className="h-4 w-4 text-amber-400" />
      case "cancelled":
        return <XCircle className="h-4 w-4 text-red-400" />
      default:
        return <Clock className="h-4 w-4 text-zinc-400" />
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
        return <Ticket className="h-5 w-5 text-purple-400" />
      case "discount":
        return <Gift className="h-5 w-5 text-emerald-400" />
      case "coins":
        return coinType === "topup"
          ? <ArrowUpRight className="h-5 w-5 text-green-400" />
          : <ArrowDownRight className="h-5 w-5 text-orange-400" />
      case "shop":
        return <ShoppingBag className="h-5 w-5 text-blue-400" />
      default:
        return <ShoppingBag className="h-5 w-5 text-zinc-400" />
    }
  }

  const getTypeBadge = (type: string) => {
    switch (type) {
      case "booking":
        return { text: "Réservation", class: "bg-purple-500/20 text-purple-400" }
      case "discount":
        return { text: "Réduction", class: "bg-emerald-500/20 text-emerald-400" }
      case "coins":
        return { text: "Coins", class: "bg-amber-500/20 text-amber-400" }
      case "shop":
        return { text: "Boutique", class: "bg-blue-500/20 text-blue-400" }
      default:
        return { text: type, class: "bg-zinc-500/20 text-zinc-400" }
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
    <div className="min-h-screen bg-zinc-950">
      <div className="container mx-auto px-6 py-32">
        {/* Back button */}
        <Button variant="ghost" asChild className="mb-6 text-zinc-400 hover:text-white">
          <Link href="/parent">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour au dashboard
          </Link>
        </Button>

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-black text-white">Historique</h1>
            <p className="text-zinc-400">Toutes les transactions de vos teens</p>
          </div>
          <ExportButton transactions={transactions} />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-gradient-to-br from-emerald-500/20 to-green-500/20 border-emerald-500/30 bg-zinc-900">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-emerald-400 font-medium">Total dépensé</p>
                  <p className="text-3xl font-black text-white">{totalSpent.toLocaleString()} DH</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-emerald-500/20 flex items-center justify-center">
                  <CreditCard className="h-6 w-6 text-emerald-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border-blue-500/30 bg-zinc-900">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-blue-400 font-medium">Ce mois</p>
                  <p className="text-3xl font-black text-white">{monthlySpent.toLocaleString()} DH</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-amber-500/20 to-orange-500/20 border-amber-500/30 bg-zinc-900">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-amber-400 font-medium">Coins rechargés</p>
                  <p className="text-3xl font-black text-white">{totalTopup.toLocaleString()}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-amber-500/20 flex items-center justify-center">
                  <Coins className="h-6 w-6 text-amber-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 border-purple-500/30 bg-zinc-900">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-purple-400 font-medium">Transactions</p>
                  <p className="text-3xl font-black text-white">{transactions.length}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-purple-500/20 flex items-center justify-center">
                  <History className="h-6 w-6 text-purple-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <TransactionFilters teens={teens} />

        {/* Transaction List */}
        <Card className="bg-gradient-to-br from-zinc-900 to-zinc-950 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <History className="h-5 w-5 text-emerald-400" />
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
                      className="flex items-center justify-between p-4 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-emerald-500/30 transition-all"
                    >
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-xl bg-zinc-800 flex items-center justify-center">
                          {getTypeIcon(tx.type, tx.coinType)}
                        </div>
                        <div>
                          <p className="font-semibold text-white">{tx.description}</p>
                          <div className="flex items-center gap-2 text-xs text-zinc-400 mt-1">
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
                            <p className={`font-black ${tx.coinType === "topup" ? "text-green-400" : "text-orange-400"}`}>
                              {tx.coinType === "topup" ? "+" : "-"}{tx.amount?.toLocaleString()} coins
                            </p>
                          ) : (
                            <p className="font-black text-white">{tx.amount?.toLocaleString()} DH</p>
                          )}
                          {tx.discount && (
                            <p className="text-xs text-emerald-400">-{tx.discount} DH économisé</p>
                          )}
                          {tx.coinsUsed && (
                            <p className="text-xs text-amber-400">{tx.coinsUsed} coins utilisés</p>
                          )}
                          <div className="flex items-center justify-end gap-1 mt-1">
                            {getStatusIcon(tx.status)}
                            <span className="text-xs text-zinc-500">{getStatusText(tx.status)}</span>
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
              <div className="text-center py-12">
                <History className="h-16 w-16 mx-auto mb-4 text-zinc-700" />
                <h3 className="text-xl font-bold text-white mb-2">Aucune transaction</h3>
                <p className="text-zinc-400">L'historique des transactions apparaîtra ici</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
