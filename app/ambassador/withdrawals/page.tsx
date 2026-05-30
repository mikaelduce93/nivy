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

  // #29 — ambassadors keyed on user_id; the row no longer stores totals.
  const { data: ambassador } = await supabase
    .from("ambassadors")
    .select("id")
    .eq("user_id", profileId)
    .maybeSingle()

  if (!ambassador) return null

  // #29 — balances recomputed from ambassador_commissions (credits) and
  // ambassador_payouts (debits). ambassador_withdrawals never existed.
  const [{ data: commissionRows }, { data: payoutRows }] = await Promise.all([
    supabase
      .from("ambassador_commissions")
      .select("amount_dh")
      .eq("ambassador_id", ambassador.id),
    supabase
      .from("ambassador_payouts")
      .select("id, amount_dh, status, method, created_at")
      .eq("ambassador_id", ambassador.id)
      .order("created_at", { ascending: false }),
  ])

  const payouts = payoutRows || []
  const totalEarnings = (commissionRows || []).reduce((s, c) => s + (Number(c.amount_dh) || 0), 0)
  // ambassador_payouts.status ∈ {pending, paid, failed}.
  const pendingWithdrawals = payouts
    .filter((p) => p.status === "pending")
    .reduce((s, p) => s + (Number(p.amount_dh) || 0), 0)
  const withdrawnAmount = payouts
    .filter((p) => p.status === "paid")
    .reduce((s, p) => s + (Number(p.amount_dh) || 0), 0)
  const availableBalance = totalEarnings - pendingWithdrawals - withdrawnAmount

  return {
    ambassadorId: ambassador.id,
    totalEarnings,
    pendingWithdrawals,
    withdrawnAmount,
    availableBalance,
    withdrawals: payouts.slice(0, 10),
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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="bg-card border-ink max-w-md">
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-16 w-16 mx-auto mb-4 text-ink" />
            <h2 className="text-xl font-bold text-ink mb-2">Compte non trouvé</h2>
            <p className="text-mute mb-4">
              Impossible de charger vos informations d'ambassadeur.
            </p>
            <Button asChild className="bg-gold hover:bg-gold text-ink">
              <Link href="/ambassador">Retour au dashboard</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const { ambassadorId, totalEarnings, pendingWithdrawals, withdrawnAmount, availableBalance, withdrawals } = data
  const minimumWithdrawal = 100 // 100 DH minimum

  // ambassador_payouts.status ∈ {pending, paid, failed}.
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "paid":
        return <CheckCircle className="h-5 w-5 text-lime" />
      case "pending":
        return <Clock className="h-5 w-5 text-gold" />
      case "failed":
        return <XCircle className="h-5 w-5 text-destructive" />
      default:
        return <Clock className="h-5 w-5 text-mute" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return "bg-lime/20 text-lime"
      case "pending":
        return "bg-gold/20 text-gold"
      case "failed":
        return "bg-destructive/20 text-destructive"
      default:
        return "bg-muted text-mute"
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case "paid":
        return "Effectué"
      case "pending":
        return "En attente"
      case "failed":
        return "Refusé"
      default:
        return status
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-32">
        {/* Back button */}
        <Button variant="ghost" asChild className="mb-6 text-mute hover:text-ink">
          <Link href="/ambassador">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour au dashboard
          </Link>
        </Button>

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-black text-ink">Mes Retraits</h1>
            <p className="text-mute">Gérez vos gains et demandez des retraits</p>
          </div>
        </div>

        {/* Balance Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-gradient-to-br from-lime/20 to-lime/20 border-lime/30 bg-card">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-lime font-medium">Disponible</p>
                  <p className="text-3xl font-black text-ink">{availableBalance.toLocaleString()} DH</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-lime/20 flex items-center justify-center">
                  <Wallet className="h-6 w-6 text-lime" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-gold/20 to-coral/20 border-gold/30 bg-card">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gold font-medium">En attente</p>
                  <p className="text-3xl font-black text-ink">{pendingWithdrawals.toLocaleString()} DH</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-gold/20 flex items-center justify-center">
                  <Clock className="h-6 w-6 text-gold" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-teal/20 to-teal/20 border-teal/30 bg-card">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-teal font-medium">Total retiré</p>
                  <p className="text-3xl font-black text-ink">{withdrawnAmount.toLocaleString()} DH</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-teal/20 flex items-center justify-center">
                  <ArrowDownToLine className="h-6 w-6 text-teal" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-pink/20 to-pink/20 border-pink/30 bg-card">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-pink font-medium">Total gagné</p>
                  <p className="text-3xl font-black text-ink">{totalEarnings.toLocaleString()} DH</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-pink/20 flex items-center justify-center">
                  <Wallet className="h-6 w-6 text-pink" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Withdrawal Form */}
          <Card className="bg-gradient-to-br from-paper-2 to-card border-ink">
            <CardHeader>
              <CardTitle className="text-ink flex items-center gap-2">
                <ArrowDownToLine className="h-5 w-5 text-lime" />
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
                  <AlertCircle className="h-16 w-16 mx-auto mb-4 text-ink" />
                  <h3 className="text-lg font-bold text-ink mb-2">Solde insuffisant</h3>
                  <p className="text-mute text-sm mb-4">
                    Vous devez avoir au moins {minimumWithdrawal} DH de solde disponible pour demander un retrait.
                  </p>
                  <div className="bg-card rounded-xl p-4">
                    <p className="text-xs text-mute">Votre solde actuel</p>
                    <p className="text-2xl font-black text-ink">{availableBalance.toLocaleString()} DH</p>
                    <p className="text-xs text-mute mt-1">
                      Il vous manque {(minimumWithdrawal - availableBalance).toLocaleString()} DH
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Withdrawal History */}
          <Card className="bg-gradient-to-br from-paper-2 to-card border-ink">
            <CardHeader>
              <CardTitle className="text-ink flex items-center gap-2">
                <Clock className="h-5 w-5 text-gold" />
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
                      className="flex items-center justify-between p-4 rounded-xl bg-card border border-ink"
                    >
                      <div className="flex items-center gap-3">
                        {getStatusIcon(withdrawal.status)}
                        <div>
                          <p className="font-bold text-ink">{Number(withdrawal.amount_dh).toLocaleString()} DH</p>
                          <p className="text-xs text-mute">{dateText}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`text-xs px-3 py-1 rounded-full font-medium ${getStatusBadge(withdrawal.status)}`}>
                          {getStatusText(withdrawal.status)}
                        </span>
                        {withdrawal.method && (
                          <p className="text-xs text-mute mt-1 capitalize">{withdrawal.method}</p>
                        )}
                      </div>
                    </div>
                  )
                })
              ) : (
                <div className="text-center py-8">
                  <ArrowDownToLine className="h-16 w-16 mx-auto mb-4 text-ink" />
                  <p className="text-mute">Aucun retrait effectué</p>
                  <p className="text-xs text-mute mt-1">Vos retraits apparaîtront ici</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Payment Methods Info */}
        <Card className="mt-8 bg-gradient-to-r from-gold/10 via-coral/10 to-destructive/10 border-gold/20">
          <CardContent className="p-6">
            <h3 className="font-bold text-ink mb-4 flex items-center gap-2">
              <span className="text-xl">💳</span> Méthodes de paiement disponibles
            </h3>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="p-4 bg-card rounded-xl border border-ink">
                <p className="font-bold text-ink mb-1">Virement bancaire</p>
                <p className="text-xs text-mute">RIB marocain uniquement</p>
                <p className="text-xs text-gold mt-2">2-3 jours ouvrés</p>
              </div>
              <div className="p-4 bg-card rounded-xl border border-ink">
                <p className="font-bold text-ink mb-1">Cash Plus</p>
                <p className="text-xs text-mute">Retrait en agence</p>
                <p className="text-xs text-gold mt-2">24-48h</p>
              </div>
              <div className="p-4 bg-card rounded-xl border border-ink">
                <p className="font-bold text-ink mb-1">Portefeuille mobile</p>
                <p className="text-xs text-mute">Orange Money, inwi money</p>
                <p className="text-xs text-gold mt-2">Instantané</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
