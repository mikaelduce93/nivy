"use client"

import { useState } from "react"
import { Coins, ArrowDownRight, ArrowUpRight, Loader2, ChevronDown } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { getCoinsTransactions } from "@/gamification-system/features/pillars/actions"

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  })
}

export function TeenCoinsClient({ initialTransactions, profile, teenId }: { initialTransactions: any[], profile: any, teenId: string }) {
  const [transactions, setTransactions] = useState(initialTransactions)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(initialTransactions.length === 10)
  const [loading, setLoading] = useState(false)

  const loadMore = async () => {
    setLoading(true)
    const newTransactions = await getCoinsTransactions(teenId, page * 10, 10)
    if (newTransactions.length < 10) setHasMore(false)
    setTransactions([...transactions, ...newTransactions])
    setPage(page + 1)
    setLoading(false)
  }

  const today = new Date().toISOString().split("T")[0]
  const todayTransactions = transactions.filter((t: any) =>
    (t.created_at || "").startsWith(today)
  )

  const todayGains = todayTransactions
    .filter((t: any) => t.amount > 0)
    .reduce((sum: number, t: any) => sum + t.amount, 0)

  const recentSpends = transactions
    .filter((t: any) => t.amount < 0)
    .slice(0, 5)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black text-foreground">Mes Coins</h1>
        <p className="text-sm text-muted-foreground">Solde, gains du jour et dépenses récentes.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Solde actuel</p>
            <p className="text-2xl font-black text-primary">{profile?.coins_balance || 0}</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Gains du jour</p>
            <p className="text-2xl font-black text-success">+{todayGains}</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Coins gagnés</p>
            <p className="text-2xl font-black text-warning">{profile?.coins_earned || 0}</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Top-ups parents</p>
            <p className="text-2xl font-black text-info">{profile?.coins_topup || 0}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Coins className="h-5 w-5" />
            Historique des transactions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {transactions.length > 0 ? (
            transactions.map((transaction: any) => {
              const isGain = transaction.amount > 0
              return (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between gap-4 p-3 rounded-xl border border-border bg-card"
                >
                  <div className="flex items-center gap-3">
                    <div className={`h-9 w-9 rounded-full flex items-center justify-center ${isGain ? "bg-success/20" : "bg-destructive/20"}`}>
                      {isGain ? (
                        <ArrowUpRight className="h-4 w-4 text-success" />
                      ) : (
                        <ArrowDownRight className="h-4 w-4 text-destructive" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        {transaction.description || transaction.source_type || "Transaction"}
                      </p>
                      <p className="text-xs text-muted-foreground">{formatDate(transaction.created_at)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-bold ${isGain ? "text-success" : "text-destructive"}`}>
                      {isGain ? "+" : ""}{transaction.amount}
                    </p>
                    <p className="text-xs text-muted-foreground">Solde {transaction.balance_after}</p>
                  </div>
                </div>
              )
            })
          ) : (
            <div className="text-sm text-muted-foreground">Aucune transaction récente.</div>
          )}

          {hasMore && (
            <div className="pt-4 text-center">
                <Button variant="ghost" onClick={loadMore} disabled={loading} className="text-primary">
                    {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ChevronDown className="h-4 w-4 mr-2" />}
                    Voir plus
                </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground text-base">Dépenses récentes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {recentSpends.length > 0 ? (
            recentSpends.map((transaction: any) => (
              <div key={transaction.id} className="flex items-center justify-between text-sm text-muted-foreground">
                <span>{transaction.description || transaction.source_type || "Dépense"}</span>
                <span className="text-destructive">{transaction.amount}</span>
              </div>
            ))
          ) : (
            <div className="text-sm text-muted-foreground">Aucune dépense récente.</div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
