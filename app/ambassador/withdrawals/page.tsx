import { getUserRole } from "@/lib/auth/get-user-role"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Wallet, ArrowDownToLine, Clock, CheckCircle, XCircle, AlertCircle, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { WithdrawalForm } from "@/components/ambassador/withdrawal-form"

async function getWithdrawalData(profileId: string) {
  const supabase = await createClient()

  // Get ambassador data
  const { data: ambassador } = await supabase
    .from("ambassadors")
    .select("id, total_earnings, pending_withdrawals, withdrawn_amount")
    .eq("profile_id", profileId)
    .single()

  if (!ambassador) return null

  // Calculate available balance
  const totalEarnings = ambassador.total_earnings || 0
  const pendingWithdrawals = ambassador.pending_withdrawals || 0
  const withdrawnAmount = ambassador.withdrawn_amount || 0
  const availableBalance = totalEarnings - pendingWithdrawals - withdrawnAmount

  // Get withdrawal history
  const { data: withdrawals } = await supabase
    .from("ambassador_withdrawals")
    .select("*")
    .eq("ambassador_id", ambassador.id)
    .order("created_at", { ascending: false })
    .limit(10)

  return {
    ambassadorId: ambassador.id,
    totalEarnings,
    pendingWithdrawals,
    withdrawnAmount,
    availableBalance,
    withdrawals: withdrawals || []
  }
}

export default async function AmbassadorWithdrawalsPage() {
  const userInfo = await getUserRole()

  if (!userInfo || userInfo.role !== "ambassador") {
    redirect("/auth/redirect")
  }

  const data = await getWithdrawalData(userInfo.profileId)

  if (!data) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <Card className="bg-zinc-900 border-zinc-800 max-w-md">
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-16 w-16 mx-auto mb-4 text-zinc-700" />
            <h2 className="text-xl font-bold text-white mb-2">Compte non trouvé</h2>
            <p className="text-zinc-400 mb-4">
              Impossible de charger vos informations d'ambassadeur.
            </p>
            <Button asChild className="bg-amber-500 hover:bg-amber-600 text-white">
              <Link href="/ambassador">Retour au dashboard</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const { ambassadorId, totalEarnings, pendingWithdrawals, withdrawnAmount, availableBalance, withdrawals } = data
  const minimumWithdrawal = 100 // 100 DH minimum

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-5 w-5 text-emerald-400" />
      case "pending":
        return <Clock className="h-5 w-5 text-amber-400" />
      case "rejected":
        return <XCircle className="h-5 w-5 text-red-400" />
      default:
        return <Clock className="h-5 w-5 text-zinc-400" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-emerald-500/20 text-emerald-400"
      case "pending":
        return "bg-amber-500/20 text-amber-400"
      case "rejected":
        return "bg-red-500/20 text-red-400"
      default:
        return "bg-zinc-500/20 text-zinc-400"
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case "completed":
        return "Effectué"
      case "pending":
        return "En attente"
      case "rejected":
        return "Refusé"
      default:
        return status
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950">
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
            <h1 className="text-3xl font-black text-white">Mes Retraits</h1>
            <p className="text-zinc-400">Gérez vos gains et demandez des retraits</p>
          </div>
        </div>

        {/* Balance Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-gradient-to-br from-emerald-500/20 to-green-500/20 border-emerald-500/30 bg-zinc-900">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-emerald-400 font-medium">Disponible</p>
                  <p className="text-3xl font-black text-white">{availableBalance.toLocaleString()} DH</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-emerald-500/20 flex items-center justify-center">
                  <Wallet className="h-6 w-6 text-emerald-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-amber-500/20 to-orange-500/20 border-amber-500/30 bg-zinc-900">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-amber-400 font-medium">En attente</p>
                  <p className="text-3xl font-black text-white">{pendingWithdrawals.toLocaleString()} DH</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-amber-500/20 flex items-center justify-center">
                  <Clock className="h-6 w-6 text-amber-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border-blue-500/30 bg-zinc-900">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-blue-400 font-medium">Total retiré</p>
                  <p className="text-3xl font-black text-white">{withdrawnAmount.toLocaleString()} DH</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                  <ArrowDownToLine className="h-6 w-6 text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 border-purple-500/30 bg-zinc-900">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-purple-400 font-medium">Total gagné</p>
                  <p className="text-3xl font-black text-white">{totalEarnings.toLocaleString()} DH</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-purple-500/20 flex items-center justify-center">
                  <Wallet className="h-6 w-6 text-purple-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Withdrawal Form */}
          <Card className="bg-gradient-to-br from-zinc-900 to-zinc-950 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <ArrowDownToLine className="h-5 w-5 text-emerald-400" />
                Demander un retrait
              </CardTitle>
            </CardHeader>
            <CardContent>
              {availableBalance >= minimumWithdrawal ? (
                <WithdrawalForm
                  ambassadorId={ambassadorId}
                  availableBalance={availableBalance}
                  minimumWithdrawal={minimumWithdrawal}
                />
              ) : (
                <div className="text-center py-8">
                  <AlertCircle className="h-16 w-16 mx-auto mb-4 text-zinc-700" />
                  <h3 className="text-lg font-bold text-white mb-2">Solde insuffisant</h3>
                  <p className="text-zinc-400 text-sm mb-4">
                    Vous devez avoir au moins {minimumWithdrawal} DH de solde disponible pour demander un retrait.
                  </p>
                  <div className="bg-zinc-800 rounded-xl p-4">
                    <p className="text-xs text-zinc-500">Votre solde actuel</p>
                    <p className="text-2xl font-black text-white">{availableBalance.toLocaleString()} DH</p>
                    <p className="text-xs text-zinc-500 mt-1">
                      Il vous manque {(minimumWithdrawal - availableBalance).toLocaleString()} DH
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Withdrawal History */}
          <Card className="bg-gradient-to-br from-zinc-900 to-zinc-950 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Clock className="h-5 w-5 text-amber-400" />
                Historique des retraits
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {withdrawals.length > 0 ? (
                withdrawals.map((withdrawal: any) => {
                  const date = new Date(withdrawal.created_at)
                  const dateText = date.toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric'
                  })

                  return (
                    <div
                      key={withdrawal.id}
                      className="flex items-center justify-between p-4 rounded-xl bg-zinc-900 border border-zinc-800"
                    >
                      <div className="flex items-center gap-3">
                        {getStatusIcon(withdrawal.status)}
                        <div>
                          <p className="font-bold text-white">{withdrawal.amount.toLocaleString()} DH</p>
                          <p className="text-xs text-zinc-400">{dateText}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`text-xs px-3 py-1 rounded-full font-medium ${getStatusBadge(withdrawal.status)}`}>
                          {getStatusText(withdrawal.status)}
                        </span>
                        {withdrawal.payment_method && (
                          <p className="text-xs text-zinc-500 mt-1 capitalize">{withdrawal.payment_method}</p>
                        )}
                      </div>
                    </div>
                  )
                })
              ) : (
                <div className="text-center py-8">
                  <ArrowDownToLine className="h-16 w-16 mx-auto mb-4 text-zinc-700" />
                  <p className="text-zinc-500">Aucun retrait effectué</p>
                  <p className="text-xs text-zinc-600 mt-1">Vos retraits apparaîtront ici</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Payment Methods Info */}
        <Card className="mt-8 bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-red-500/10 border-amber-500/20">
          <CardContent className="p-6">
            <h3 className="font-bold text-white mb-4 flex items-center gap-2">
              <span className="text-xl">💳</span> Méthodes de paiement disponibles
            </h3>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="p-4 bg-zinc-900/80 rounded-xl border border-zinc-800">
                <p className="font-bold text-white mb-1">Virement bancaire</p>
                <p className="text-xs text-zinc-400">RIB marocain uniquement</p>
                <p className="text-xs text-amber-400 mt-2">2-3 jours ouvrés</p>
              </div>
              <div className="p-4 bg-zinc-900/80 rounded-xl border border-zinc-800">
                <p className="font-bold text-white mb-1">Cash Plus</p>
                <p className="text-xs text-zinc-400">Retrait en agence</p>
                <p className="text-xs text-amber-400 mt-2">24-48h</p>
              </div>
              <div className="p-4 bg-zinc-900/80 rounded-xl border border-zinc-800">
                <p className="font-bold text-white mb-1">Portefeuille mobile</p>
                <p className="text-xs text-zinc-400">Orange Money, inwi money</p>
                <p className="text-xs text-amber-400 mt-2">Instantané</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
