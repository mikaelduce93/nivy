import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { TrendingUp, Users, ShoppingBag, Tag, Calendar, Download } from "lucide-react"
import { getUserRole } from "@/lib/auth/get-user-role"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { EmptyState } from "@/components/ui/states/empty-state"

type TxRow = {
  teen_id: string | null
  amount_dh: number | null
  cashback_xp: number | null
  status: string | null
  created_at: string | null
}

const MONTH_NAMES = [
  "Janvier",
  "Février",
  "Mars",
  "Avril",
  "Mai",
  "Juin",
  "Juillet",
  "Août",
  "Septembre",
  "Octobre",
  "Novembre",
  "Décembre",
]

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
}

export default async function PartnerStatsPage() {
  const userInfo = await getUserRole()

  if (!userInfo) {
    redirect("/auth/login")
  }

  const partnerId = userInfo.role === "partner" ? userInfo.partnerData?.id : null

  if (!partnerId) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-black text-white">Statistiques</h1>
          <p className="text-zinc-400">Stats indisponibles — profil partenaire introuvable.</p>
        </div>
      </div>
    )
  }

  const supabase = await createClient()

  // Window: last 6 months including current.
  const since = new Date()
  since.setMonth(since.getMonth() - 5)
  since.setDate(1)
  since.setHours(0, 0, 0, 0)

  const { data: txData } = await supabase
    .from("partner_transactions")
    .select("teen_id, amount_dh, cashback_xp, status, created_at")
    .eq("partner_id", partnerId)
    .gte("created_at", since.toISOString())
    .order("created_at", { ascending: false })

  const transactions = (txData ?? []) as TxRow[]

  const successful = transactions.filter((t) => t.status === "succeeded" || t.status === null)

  const totalTransactions = successful.length
  const totalRevenue = successful.reduce((s, r) => s + Number(r.amount_dh || 0), 0)
  const totalCashbackXp = successful.reduce((s, r) => s + Number(r.cashback_xp || 0), 0)
  const uniqueTeens = new Set(successful.map((t) => t.teen_id).filter(Boolean)).size

  // Build a 4-month rolling history (newest first) so the chart always renders.
  const history: { key: string; label: string; transactions: number; revenue: number }[] = []
  const cursor = new Date()
  cursor.setDate(1)
  cursor.setHours(0, 0, 0, 0)
  for (let i = 0; i < 4; i++) {
    const k = monthKey(cursor)
    history.push({
      key: k,
      label: MONTH_NAMES[cursor.getMonth()],
      transactions: 0,
      revenue: 0,
    })
    cursor.setMonth(cursor.getMonth() - 1)
  }

  for (const tx of successful) {
    if (!tx.created_at) continue
    const d = new Date(tx.created_at)
    const k = monthKey(d)
    const slot = history.find((h) => h.key === k)
    if (slot) {
      slot.transactions += 1
      slot.revenue += Number(tx.amount_dh || 0)
    }
  }

  const maxRevenue = Math.max(1, ...history.map((h) => h.revenue))

  // Active offers count via partner_discounts (canonical surface used elsewhere).
  const { count: offersUsedCount } = await supabase
    .from("partner_transactions")
    .select("*", { count: "exact", head: true })
    .eq("partner_id", partnerId)
    .gte("created_at", since.toISOString())

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-white">Statistiques</h1>
          <p className="text-zinc-400">Analysez vos performances Teen Club</p>
        </div>
        <Button variant="outline" className="border-zinc-700 text-zinc-300 hover:text-white">
          <Download className="h-4 w-4 mr-2" />
          Rapport PDF
        </Button>
      </div>

      {totalTransactions === 0 && (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-8 text-center">
            <p className="text-zinc-300 font-semibold">Pas encore de données à analyser</p>
            <p className="text-sm text-zinc-500 mt-2">
              Vos statistiques s'afficheront ici dès vos premières transactions Teen Club.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border-emerald-500/30 bg-zinc-900">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <ShoppingBag className="h-6 w-6 text-emerald-400" />
            </div>
            <p className="text-3xl font-black text-white">{totalTransactions}</p>
            <p className="text-sm text-zinc-400">Transactions (6 derniers mois)</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border-blue-500/30 bg-zinc-900">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <Users className="h-6 w-6 text-blue-400" />
            </div>
            <p className="text-3xl font-black text-white">{uniqueTeens}</p>
            <p className="text-sm text-zinc-400">Clients uniques</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 border-purple-500/30 bg-zinc-900">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp className="h-6 w-6 text-purple-400" />
            </div>
            <p className="text-3xl font-black text-white">
              {Math.round(totalRevenue).toLocaleString()} DH
            </p>
            <p className="text-sm text-zinc-400">Chiffre d'affaires</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-500/20 to-orange-500/20 border-amber-500/30 bg-zinc-900">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <Tag className="h-6 w-6 text-amber-400" />
            </div>
            <p className="text-3xl font-black text-white">{offersUsedCount ?? 0}</p>
            <p className="text-sm text-zinc-400">Validations totales</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Monthly Evolution */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Calendar className="h-5 w-5 text-emerald-400" />
              Évolution mensuelle
            </CardTitle>
          </CardHeader>
          <CardContent>
            {history.every((h) => h.transactions === 0) ? (
              <EmptyState
                size="small"
                icon={Calendar}
                title="Aucune activité"
                description="Aucune activité sur les 4 derniers mois."
              />
            ) : (
              <div className="space-y-4">
                {history.map((stat) => (
                  <div key={stat.key} className="flex items-center gap-4">
                    <div className="w-20 text-sm text-zinc-400">{stat.label}</div>
                    <div className="flex-1">
                      <div className="h-8 bg-zinc-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full flex items-center justify-end pr-3"
                          style={{
                            width: `${Math.max(4, (stat.revenue / maxRevenue) * 100)}%`,
                          }}
                        >
                          <span className="text-xs font-bold text-white">
                            {Math.round(stat.revenue).toLocaleString()} DH
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-white">{stat.transactions}</p>
                      <p className="text-xs text-zinc-500">transactions</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Cashback summary (replaces "Top offres" — the partner_offers table
            doesn't expose per-offer usage on partner_transactions yet). */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Tag className="h-5 w-5 text-amber-400" />
              Cashback & engagement
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-xl bg-zinc-800 border border-zinc-700">
              <div>
                <p className="font-semibold text-white">XP cashback distribué</p>
                <p className="text-xs text-zinc-400">Récompenses crédités aux teens</p>
              </div>
              <p className="font-black text-emerald-400 text-xl">
                {Math.round(totalCashbackXp).toLocaleString()} XP
              </p>
            </div>
            <div className="flex items-center justify-between p-4 rounded-xl bg-zinc-800 border border-zinc-700">
              <div>
                <p className="font-semibold text-white">Panier moyen</p>
                <p className="text-xs text-zinc-400">CA / transaction</p>
              </div>
              <p className="font-black text-white text-xl">
                {totalTransactions > 0
                  ? Math.round(totalRevenue / totalTransactions).toLocaleString()
                  : 0}{" "}
                DH
              </p>
            </div>
            <div className="flex items-center justify-between p-4 rounded-xl bg-zinc-800 border border-zinc-700">
              <div>
                <p className="font-semibold text-white">Fréquence client</p>
                <p className="text-xs text-zinc-400">Visites par membre unique</p>
              </div>
              <p className="font-black text-white text-xl">
                {uniqueTeens > 0
                  ? (totalTransactions / uniqueTeens).toFixed(1)
                  : "0.0"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Customer breakdown — left as informational placeholder until
          tier-by-partner aggregates land (see audit §D5). */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-white">Répartition par niveau</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-zinc-500 py-6 text-center">
            Répartition par tier indisponible pour le moment — disponible dès la prochaine mise à jour.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
