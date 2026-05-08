import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, Download, Filter, ArrowUpRight, ArrowDownRight } from "lucide-react"
import { getUserRole } from "@/lib/auth/get-user-role"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

type PartnerTransactionRow = {
  id: string
  partner_id: string | null
  teen_id: string | null
  amount_dh: number | null
  amount_coins: number | null
  cashback_xp: number | null
  commission_dh: number | null
  status: string | null
  scanner_user_id: string | null
  scanned_at: string | null
  created_at: string | null
}

const DATE_FMT = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
})

function formatDate(value: string | null): string {
  if (!value) return ""
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ""
  return DATE_FMT.format(d)
}

function maskTeenId(teenId: string | null): string {
  if (!teenId) return "Membre"
  // Short, anonymous reference (privacy-friendly; matches existing "Teen #..." UX).
  return `Teen #${teenId.replace(/-/g, "").slice(0, 4).toUpperCase()}`
}

function statusLabel(status: string | null): string {
  switch (status) {
    case "succeeded":
      return "Validée"
    case "pending":
      return "En attente"
    case "refunded":
      return "Remboursée"
    case "failed":
      return "Échec"
    default:
      return status || "—"
  }
}

export default async function PartnerTransactionsPage() {
  const userInfo = await getUserRole()

  if (!userInfo) {
    redirect("/auth/login")
  }

  const partnerId = userInfo.role === "partner" ? userInfo.partnerData?.id : null

  if (!partnerId) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-black text-white">Transactions</h1>
          <p className="text-zinc-400">Historique des transactions Teen Club</p>
        </div>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-10 text-center">
            <p className="text-zinc-300 font-semibold">Profil partenaire introuvable</p>
            <p className="text-sm text-zinc-500 mt-2">
              Votre compte n'est pas encore lié à une fiche partenaire active.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const supabase = await createClient()

  // Month-to-date window for the KPI cards.
  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)

  // Polish-F: wrap with try/catch so a thrown query degrades to zeroed KPIs
  // and an inline banner instead of 500-ing the route.
  let monthRows: Pick<
    PartnerTransactionRow,
    "id" | "amount_dh" | "commission_dh" | "status"
  >[] = []
  let loadError: string | null = null
  try {
    const { data: monthData, error } = await supabase
      .from("partner_transactions")
      .select("id, amount_dh, commission_dh, status")
      .eq("partner_id", partnerId)
      .gte("created_at", startOfMonth.toISOString())
    if (error) {
      console.error("[partner/transactions] month error:", error)
      loadError = "Impossible de charger les statistiques du mois."
    } else {
      monthRows = (monthData ?? []) as typeof monthRows
    }
  } catch (err) {
    console.error("[partner/transactions] month threw:", err)
    loadError = "Impossible de charger les statistiques du mois."
  }

  const monthCount = monthRows.length
  const monthRevenue = monthRows.reduce((s, r) => s + Number(r.amount_dh || 0), 0)
  const monthCommission = monthRows.reduce((s, r) => s + Number(r.commission_dh || 0), 0)
  const monthAverage = monthCount > 0 ? Math.round(monthRevenue / monthCount) : 0

  // Latest 50 transactions, regardless of date, for the history list.
  let transactions: PartnerTransactionRow[] = []
  try {
    const { data: recentData, error } = await supabase
      .from("partner_transactions")
      .select(
        "id, partner_id, teen_id, amount_dh, amount_coins, cashback_xp, commission_dh, status, scanner_user_id, scanned_at, created_at"
      )
      .eq("partner_id", partnerId)
      .order("created_at", { ascending: false })
      .limit(50)
    if (error) {
      console.error("[partner/transactions] recent error:", error)
      loadError = loadError ?? "Impossible de charger l'historique."
    } else {
      transactions = (recentData ?? []) as PartnerTransactionRow[]
    }
  } catch (err) {
    console.error("[partner/transactions] recent threw:", err)
    loadError = loadError ?? "Impossible de charger l'historique."
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-white">Transactions</h1>
          <p className="text-zinc-400">Historique des transactions Teen Club</p>
        </div>
        <Button variant="outline" className="border-zinc-700 text-zinc-300 hover:text-white">
          <Download className="h-4 w-4 mr-2" />
          Exporter CSV
        </Button>
      </div>

      {loadError && (
        <div
          role="alert"
          className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200"
        >
          {loadError}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-zinc-400">Ce mois</p>
                <p className="text-2xl font-black text-white">{monthCount}</p>
              </div>
              <ArrowUpRight className="h-5 w-5 text-emerald-400" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-zinc-400">CA Total</p>
                <p className="text-2xl font-black text-white">
                  {Math.round(monthRevenue).toLocaleString()} DH
                </p>
              </div>
              <ArrowUpRight className="h-5 w-5 text-emerald-400" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-zinc-400">Commission Nivy</p>
                <p className="text-2xl font-black text-amber-400">
                  {Math.round(monthCommission).toLocaleString()} DH
                </p>
              </div>
              <ArrowDownRight className="h-5 w-5 text-amber-400" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-zinc-400">Panier moyen</p>
                <p className="text-2xl font-black text-white">{monthAverage} DH</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search & Filters */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
          <Input
            placeholder="Rechercher par membre, statut..."
            className="pl-10 bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-500"
          />
        </div>
        <Button variant="outline" className="border-zinc-700 text-zinc-300">
          <Filter className="h-4 w-4 mr-2" />
          Filtrer
        </Button>
      </div>

      {/* Transactions List */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-white">Historique</CardTitle>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <div className="p-10 text-center">
              <p className="text-zinc-300 font-semibold">Aucune transaction pour le moment</p>
              <p className="text-sm text-zinc-500 mt-2">
                Dès qu'un membre scannera votre QR code, l'opération apparaîtra ici en temps réel.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {transactions.map((tx) => {
                const display = maskTeenId(tx.teen_id)
                const initial = display.replace(/[^A-Z0-9]/gi, "").charAt(0) || "T"
                return (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between p-4 rounded-xl bg-zinc-950 border border-zinc-800 hover:border-zinc-700 transition-all"
                  >
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white font-bold">
                        {initial}
                      </div>
                      <div>
                        <p className="font-semibold text-white">{display}</p>
                        <p className="text-xs text-zinc-400">{formatDate(tx.created_at)}</p>
                      </div>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-zinc-500">Statut</p>
                      <p className="text-sm text-zinc-300">{statusLabel(tx.status)}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-white">
                        {Math.round(Number(tx.amount_dh || 0))} DH
                      </p>
                      {Number(tx.cashback_xp || 0) > 0 && (
                        <p className="text-xs text-emerald-400">+{tx.cashback_xp} XP cashback</p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
