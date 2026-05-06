import { getUserRole } from "@/lib/auth/get-user-role"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Wallet,
  ArrowLeft,
  TrendingUp,
  Calendar,
  Filter,
  Download,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  CheckCircle
} from "lucide-react"
import Link from "next/link"

async function getCommissionHistory(profileId: string) {
  const supabase = await createClient()

  // Get ambassador data
  const { data: ambassador } = await supabase
    .from("ambassadors")
    .select("id, total_earnings, commission_rate")
    .eq("profile_id", profileId)
    .single()

  if (!ambassador) return { commissions: [], stats: null }

  // Get commission history (from referral_usage)
  const { data: referralCommissions, error: refError } = await supabase
    .from("referral_usage")
    .select(`
      id,
      commission_amount,
      status,
      created_at,
      user:user_id (
        full_name
      )
    `)
    .eq("ambassador_id", ambassador.id)
    .order("created_at", { ascending: false })

  // Get withdrawal history
  const { data: withdrawals, error: wdError } = await supabase
    .from("ambassador_withdrawals")
    .select("*")
    .eq("ambassador_id", ambassador.id)
    .order("created_at", { ascending: false })

  // Combine and sort all transactions
  const allTransactions: any[] = []

  referralCommissions?.forEach(rc => {
    const userName = (rc.user as unknown as { full_name?: string } | null)?.full_name || "Utilisateur"
    allTransactions.push({
      id: rc.id,
      type: "commission",
      amount: rc.commission_amount || 0,
      status: rc.status || "completed",
      date: rc.created_at,
      description: `Commission - ${userName}`,
      source: userName
    })
  })

  withdrawals?.forEach(wd => {
    allTransactions.push({
      id: wd.id,
      type: "withdrawal",
      amount: -(wd.amount || 0),
      status: wd.status,
      date: wd.created_at,
      description: `Retrait - ${wd.payment_method || "Virement"}`,
      source: wd.payment_method || "Virement"
    })
  })

  // Sort by date descending
  allTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  // Calculate stats
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0)

  const monthlyEarnings = referralCommissions
    ?.filter(r => new Date(r.created_at) >= startOfMonth)
    .reduce((sum, r) => sum + (r.commission_amount || 0), 0) || 0

  const lastMonthEarnings = referralCommissions
    ?.filter(r => {
      const date = new Date(r.created_at)
      return date >= startOfLastMonth && date <= endOfLastMonth
    })
    .reduce((sum, r) => sum + (r.commission_amount || 0), 0) || 0

  const pendingWithdrawals = withdrawals
    ?.filter(w => w.status === "pending")
    .reduce((sum, w) => sum + (w.amount || 0), 0) || 0

  const totalWithdrawn = withdrawals
    ?.filter(w => w.status === "completed")
    .reduce((sum, w) => sum + (w.amount || 0), 0) || 0

  return {
    commissions: allTransactions,
    stats: {
      totalEarnings: ambassador.total_earnings || 0,
      monthlyEarnings,
      lastMonthEarnings,
      pendingWithdrawals,
      totalWithdrawn,
      commissionRate: ambassador.commission_rate || 15,
      availableBalance: (ambassador.total_earnings || 0) - totalWithdrawn - pendingWithdrawals
    }
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
      return <ArrowUpRight className="h-5 w-5 text-red-400" />
    }
    return <ArrowDownRight className="h-5 w-5 text-emerald-400" />
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return {
          icon: CheckCircle,
          text: "Complété",
          class: "bg-emerald-500/20 text-emerald-400"
        }
      case "pending":
        return {
          icon: Clock,
          text: "En attente",
          class: "bg-amber-500/20 text-amber-400"
        }
      case "active":
        return {
          icon: CheckCircle,
          text: "Actif",
          class: "bg-emerald-500/20 text-emerald-400"
        }
      default:
        return {
          icon: CheckCircle,
          text: status,
          class: "bg-zinc-500/20 text-zinc-400"
        }
    }
  }

  // Calculate growth
  const growth = stats?.lastMonthEarnings
    ? Math.round(((stats.monthlyEarnings - stats.lastMonthEarnings) / stats.lastMonthEarnings) * 100)
    : 0

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-32">
        {/* Back button */}
        <Button variant="ghost" asChild className="mb-6 text-zinc-400 hover:text-white">
          <Link href="/ambassador">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour au dashboard
          </Link>
        </Button>

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-black text-white">Mes Commissions</h1>
            <p className="text-zinc-400">Historique complet de vos gains</p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="border-zinc-700 text-zinc-300">
              <Filter className="h-4 w-4 mr-2" />
              Filtrer
            </Button>
            <Button variant="outline" className="border-zinc-700 text-zinc-300">
              <Download className="h-4 w-4 mr-2" />
              Exporter
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-gradient-to-br from-emerald-500/20 to-green-500/20 border-emerald-500/30 bg-card">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-emerald-400 font-medium">Total gagné</p>
                  <p className="text-3xl font-black text-white">{stats?.totalEarnings || 0} DH</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-emerald-500/20 flex items-center justify-center">
                  <DollarSign className="h-6 w-6 text-emerald-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border-blue-500/30 bg-card">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-blue-400 font-medium">Disponible</p>
                  <p className="text-3xl font-black text-white">{stats?.availableBalance || 0} DH</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                  <Wallet className="h-6 w-6 text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 border-purple-500/30 bg-card">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-purple-400 font-medium">Ce mois</p>
                  <p className="text-3xl font-black text-white">{stats?.monthlyEarnings || 0} DH</p>
                  {growth !== 0 && (
                    <p className={`text-xs mt-1 ${growth > 0 ? "text-emerald-400" : "text-red-400"}`}>
                      {growth > 0 ? "+" : ""}{growth}% vs mois dernier
                    </p>
                  )}
                </div>
                <div className="h-12 w-12 rounded-full bg-purple-500/20 flex items-center justify-center">
                  <Calendar className="h-6 w-6 text-purple-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-amber-500/20 to-orange-500/20 border-amber-500/30 bg-card">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-amber-400 font-medium">Taux commission</p>
                  <p className="text-3xl font-black text-white">{stats?.commissionRate || 15}%</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-amber-500/20 flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-amber-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Summary Cards */}
        <div className="grid md:grid-cols-2 gap-4 mb-8">
          <Card className="bg-gradient-to-br from-emerald-500/10 to-green-500/10 border-emerald-500/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-emerald-400 font-medium">Total retiré</p>
                  <p className="text-2xl font-black text-white mt-1">{stats?.totalWithdrawn || 0} DH</p>
                </div>
                <Button asChild size="sm" className="bg-emerald-500 hover:bg-emerald-600">
                  <Link href="/ambassador/withdrawals">
                    Retirer
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border-amber-500/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-amber-400 font-medium">En attente de traitement</p>
                  <p className="text-2xl font-black text-white mt-1">{stats?.pendingWithdrawals || 0} DH</p>
                </div>
                <Clock className="h-8 w-8 text-amber-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Transaction History */}
        <Card className="bg-gradient-to-br from-zinc-900 to-zinc-950 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Wallet className="h-5 w-5 text-emerald-400" />
              Historique des transactions
            </CardTitle>
          </CardHeader>
          <CardContent>
            {commissions.length > 0 ? (
              <div className="space-y-3">
                {commissions.map((transaction: any) => {
                  const status = getStatusBadge(transaction.status)
                  const StatusIcon = status.icon
                  const isPositive = transaction.amount > 0

                  return (
                    <div
                      key={transaction.id}
                      className="flex items-center justify-between p-4 rounded-xl bg-card border border-zinc-800 hover:border-zinc-700 transition-all"
                    >
                      <div className="flex items-center gap-4">
                        <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${
                          isPositive ? "bg-emerald-500/20" : "bg-red-500/20"
                        }`}>
                          {getTransactionIcon(transaction.type, transaction.amount)}
                        </div>
                        <div>
                          <p className="font-medium text-white">{transaction.description}</p>
                          <p className="text-xs text-zinc-500">{formatDateTime(transaction.date)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className={`text-lg font-black ${isPositive ? "text-emerald-400" : "text-red-400"}`}>
                            {isPositive ? "+" : ""}{transaction.amount} DH
                          </p>
                        </div>
                        <span className={`flex items-center gap-1 text-xs px-3 py-1 rounded-full ${status.class}`}>
                          <StatusIcon className="h-3 w-3" />
                          {status.text}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-16">
                <Wallet className="h-20 w-20 mx-auto mb-6 text-zinc-700" />
                <h3 className="text-2xl font-bold text-white mb-2">Pas encore de transactions</h3>
                <p className="text-zinc-400 mb-6">
                  Vos commissions apparaîtront ici lorsque vos filleuls s'inscriront
                </p>
                <Button asChild className="bg-amber-500 hover:bg-amber-600 text-white">
                  <Link href="/ambassador">
                    Partager mon code
                  </Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
