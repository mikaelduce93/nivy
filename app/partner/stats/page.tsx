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
          <h1 className="text-3xl font-black text-ink">Statistiques</h1>
          <p className="text-mute">Stats indisponibles — profil partenaire introuvable.</p>
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
          <h1 className="text-3xl font-black text-ink">Statistiques</h1>
          <p className="text-mute">Analysez vos performances Teen Club</p>
        </div>
        <Button variant="outline" className="border-ink text-ink-2 hover:text-ink">
          <Download className="h-4 w-4 mr-2" />
          Rapport PDF
        </Button>
      </div>

      {totalTransactions === 0 && (
        <Card className="bg-card border-ink">
          <CardContent className="p-8 text-center">
            <p className="text-ink-2 font-semibold">Pas encore de données à analyser</p>
            <p className="text-sm text-mute mt-2">
              Vos statistiques s'afficheront ici dès vos premières transactions Teen Club.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-lime/20 to-teal/20 border-lime/30 bg-card">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <ShoppingBag className="h-6 w-6 text-lime" />
            </div>
            <p className="text-3xl font-black text-ink">{totalTransactions}</p>
            <p className="text-sm text-mute">Transactions (6 derniers mois)</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-teal/20 to-teal/20 border-teal/30 bg-card">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <Users className="h-6 w-6 text-teal" />
            </div>
            <p className="text-3xl font-black text-ink">{uniqueTeens}</p>
            <p className="text-sm text-mute">Clients uniques</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-pink/20 to-pink/20 border-pink/30 bg-card">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp className="h-6 w-6 text-pink" />
            </div>
            <p className="text-3xl font-black text-ink">
              {Math.round(totalRevenue).toLocaleString()} DH
            </p>
            <p className="text-sm text-mute">Chiffre d'affaires</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-gold/20 to-coral/20 border-gold/30 bg-card">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <Tag className="h-6 w-6 text-gold" />
            </div>
            <p className="text-3xl font-black text-ink">{offersUsedCount ?? 0}</p>
            <p className="text-sm text-mute">Validations totales</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Monthly Evolution */}
        <Card className="bg-card border-ink">
          <CardHeader>
            <CardTitle className="text-ink flex items-center gap-2">
              <Calendar className="h-5 w-5 text-lime" />
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
                    <div className="w-20 text-sm text-mute">{stat.label}</div>
                    <div className="flex-1">
                      <div className="h-8 bg-card rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-lime to-teal rounded-full flex items-center justify-end pr-3"
                          style={{
                            width: `${Math.max(4, (stat.revenue / maxRevenue) * 100)}%`,
                          }}
                        >
                          <span className="text-xs font-bold text-ink">
                            {Math.round(stat.revenue).toLocaleString()} DH
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-ink">{stat.transactions}</p>
                      <p className="text-xs text-mute">transactions</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Cashback summary (replaces "Top offres" — the partner_offers table
            doesn't expose per-offer usage on partner_transactions yet). */}
        <Card className="bg-card border-ink">
          <CardHeader>
            <CardTitle className="text-ink flex items-center gap-2">
              <Tag className="h-5 w-5 text-gold" />
              Cashback & engagement
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-xl bg-card border border-ink">
              <div>
                <p className="font-semibold text-ink">XP cashback distribué</p>
                <p className="text-xs text-mute">Récompenses crédités aux teens</p>
              </div>
              <p className="font-black text-lime text-xl">
                {Math.round(totalCashbackXp).toLocaleString()} XP
              </p>
            </div>
            <div className="flex items-center justify-between p-4 rounded-xl bg-card border border-ink">
              <div>
                <p className="font-semibold text-ink">Panier moyen</p>
                <p className="text-xs text-mute">CA / transaction</p>
              </div>
              <p className="font-black text-ink text-xl">
                {totalTransactions > 0
                  ? Math.round(totalRevenue / totalTransactions).toLocaleString()
                  : 0}{" "}
                DH
              </p>
            </div>
            <div className="flex items-center justify-between p-4 rounded-xl bg-card border border-ink">
              <div>
                <p className="font-semibold text-ink">Fréquence client</p>
                <p className="text-xs text-mute">Visites par membre unique</p>
              </div>
              <p className="font-black text-ink text-xl">
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
      <Card className="bg-card border-ink">
        <CardHeader>
          <CardTitle className="text-ink">Répartition par niveau</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-mute py-6 text-center">
            Répartition par tier indisponible pour le moment — disponible dès la prochaine mise à jour.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
