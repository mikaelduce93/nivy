import { StickerCard } from "@/components/ui/sticker-card"
import { StatHero, NivEmpty } from "@/components/brand"
import { Users, ShoppingBag, Tag, Calendar } from "lucide-react"
import { getUserRole } from "@/lib/auth/get-user-role"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

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
          <p className="eyebrow tracking-[0.16em] text-mute">Tes perfs</p>
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-ink">
            Tes <em className="font-semibold italic text-pink">stats</em>
          </h1>
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
      <div>
        <p className="eyebrow tracking-[0.16em] text-mute">Tes perfs</p>
        <h1 className="font-display text-3xl font-extrabold tracking-tight text-ink">
          Tes <em className="font-semibold italic text-pink">stats</em>
        </h1>
        <p className="text-mute">Ton activité Teen Club sur les 6 derniers mois</p>
      </div>

      {totalTransactions === 0 && (
        <NivEmpty
          mood="calm"
          title="Rien à analyser pour l'instant"
          description="Tes stats s'affichent ici dès tes premières transactions Teen Club."
        />
      )}

      {/* Overview — hiérarchie 1-2-3 : le CA domine en surface sombre */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatHero
          eyebrow="Chiffre d'affaires"
          value={Math.round(totalRevenue).toLocaleString()}
          unit="DH"
          tone="pink"
          className="sm:col-span-2"
          meta="sur les 6 derniers mois"
        />
        <StickerCard className="justify-center gap-1 p-5">
          <span className="mb-1 grid size-10 place-items-center rounded-xl border-2 border-ink bg-lime">
            <ShoppingBag className="size-5 text-ink" aria-hidden="true" />
          </span>
          <p className="font-display text-3xl font-extrabold tabular-nums text-ink">
            {totalTransactions}
          </p>
          <p className="font-mono text-xs text-mute">transactions</p>
        </StickerCard>
        <StickerCard className="justify-center gap-1 p-5">
          <span className="mb-1 grid size-10 place-items-center rounded-xl border-2 border-ink bg-teal">
            <Users className="size-5 text-ink" aria-hidden="true" />
          </span>
          <p className="font-display text-3xl font-extrabold tabular-nums text-ink">
            {uniqueTeens}
          </p>
          <p className="font-mono text-xs text-mute">clients uniques</p>
        </StickerCard>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StickerCard className="justify-center gap-1 p-5 sm:col-span-2 lg:col-span-1">
          <span className="mb-1 grid size-10 place-items-center rounded-xl border-2 border-ink bg-gold">
            <Tag className="size-5 text-ink" aria-hidden="true" />
          </span>
          <p className="font-display text-3xl font-extrabold tabular-nums text-ink">
            {offersUsedCount ?? 0}
          </p>
          <p className="font-mono text-xs text-mute">validations totales</p>
        </StickerCard>
      </div>

      {/* Charts Section */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Monthly Evolution — barres sticker éditoriales (rose / paper / ink) */}
        <StickerCard className="gap-4 p-5">
          <p className="flex items-center gap-2 eyebrow tracking-[0.16em] text-mute">
            <Calendar className="size-4 text-pink" aria-hidden="true" />
            Évolution mensuelle
          </p>
          {history.every((h) => h.transactions === 0) ? (
            <NivEmpty
              mood="calm"
              title="Aucune activité"
              description="Rien sur les 4 derniers mois."
            />
          ) : (
            <div className="space-y-4">
              {history.map((stat) => (
                <div key={stat.key} className="flex items-center gap-4">
                  <div className="w-20 font-mono text-xs text-mute">{stat.label}</div>
                  <div className="flex-1">
                    <div className="h-8 overflow-hidden rounded-full border-2 border-ink bg-paper">
                      <div
                        className="flex h-full items-center justify-end rounded-full bg-pink pr-3"
                        style={{
                          width: `${Math.max(8, (stat.revenue / maxRevenue) * 100)}%`,
                        }}
                      >
                        <span className="font-mono text-xs font-bold text-ink tabular-nums">
                          {Math.round(stat.revenue).toLocaleString()} DH
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-display text-sm font-bold tabular-nums text-ink">
                      {stat.transactions}
                    </p>
                    <p className="font-mono text-[11px] text-mute">tx</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </StickerCard>

        {/* Cashback summary (replaces "Top offres" — the partner_offers table
            doesn't expose per-offer usage on partner_transactions yet). */}
        <StickerCard className="gap-4 p-5">
          <p className="flex items-center gap-2 eyebrow tracking-[0.16em] text-mute">
            <Tag className="size-4 text-gold" aria-hidden="true" />
            Cashback & engagement
          </p>
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3 rounded-xl border-2 border-ink bg-paper p-4">
              <div className="min-w-0">
                <p className="font-display font-bold text-ink">XP cashback distribué</p>
                <p className="font-mono text-xs text-mute">Récompenses créditées aux teens</p>
              </div>
              <p className="font-display text-xl font-extrabold tabular-nums text-gold">
                {Math.round(totalCashbackXp).toLocaleString()}
                <span className="ml-1 font-mono text-sm text-mute">XP</span>
              </p>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-xl border-2 border-ink bg-paper p-4">
              <div className="min-w-0">
                <p className="font-display font-bold text-ink">Panier moyen</p>
                <p className="font-mono text-xs text-mute">CA / transaction</p>
              </div>
              <p className="font-display text-xl font-extrabold tabular-nums text-ink">
                {totalTransactions > 0
                  ? Math.round(totalRevenue / totalTransactions).toLocaleString()
                  : 0}
                <span className="ml-1 font-mono text-sm text-mute">DH</span>
              </p>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-xl border-2 border-ink bg-paper p-4">
              <div className="min-w-0">
                <p className="font-display font-bold text-ink">Fréquence client</p>
                <p className="font-mono text-xs text-mute">Visites par membre unique</p>
              </div>
              <p className="font-display text-xl font-extrabold tabular-nums text-ink">
                {uniqueTeens > 0
                  ? (totalTransactions / uniqueTeens).toFixed(1)
                  : "0.0"}
              </p>
            </div>
          </div>
        </StickerCard>
      </div>

      {/* Customer breakdown (tier split) — deferred jusqu'à l'arrivée des
          agrégats tier-par-partenaire (audit §D5). Section retirée pour ne pas
          exposer une feature creuse en prod. */}
    </div>
  )
}
