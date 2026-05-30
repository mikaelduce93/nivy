/**
 * PAGE VALEUR XP
 * ===============
 * Affiche la valeur des XP en DH, calculateur ROI,
 * historique des transactions et projections.
 */

"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import {
  Coins, TrendingUp, Calculator, History, Sparkles, ArrowRight,
  ArrowUpRight, ArrowDownRight, Zap, Gift, Calendar, Target,
  Trophy, Info, Loader2, PiggyBank, Wallet, BarChart3, Check,
} from "lucide-react"

import { EmptyState } from "@/components/ui/states/empty-state"
import { StickerCard } from "@/components/ui/sticker-card"
import { SegmentedProgress } from "@/components/ui/progress"
import { StickerTabs } from "@/components/brand/sticker-tab"
import { Niv, DarkSurface } from "@/components/brand"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface XPStats {
  total_xp: number
  xp_value_dh: number
  lifetime_earned: number
  lifetime_spent: number
  xp_rate: number
  max_payment_percentage: number
}

interface XPTransaction {
  id: string
  amount: number
  type: "earn" | "payment" | "refund" | "bonus" | "penalty" | "transfer"
  description: string
  reference_type?: string
  reference_id?: string
  balance_before: number
  balance_after: number
  created_at: string
}

interface Projection {
  month: string
  estimated_xp: number
  estimated_value: number
}

const formatNumber = (num: number) => num.toLocaleString("fr-FR")
const formatCurrency = (amount: number) => `${amount.toFixed(2)} DH`
const formatDate = (date: string) => new Date(date).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })
const formatTime = (date: string) => new Date(date).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })

const transactionTypeConfig: Record<string, { bg: string; icon: any; label: string }> = {
  earn: { bg: "bg-lime", icon: ArrowUpRight, label: "Gagné" },
  payment: { bg: "bg-destructive", icon: ArrowDownRight, label: "Dépensé" },
  refund: { bg: "bg-teal", icon: ArrowUpRight, label: "Remboursé" },
  bonus: { bg: "bg-gold", icon: Sparkles, label: "Bonus" },
  penalty: { bg: "bg-destructive", icon: ArrowDownRight, label: "Pénalité" },
  transfer: { bg: "bg-pink", icon: ArrowRight, label: "Transfert" },
}

/* -------------------------------- ValueCard -------------------------------- */
function ValueCard({ stats }: { stats: XPStats }) {
  return (
    <DarkSurface tone="teal" shadow className="p-6">
      <div className="mb-6 flex items-center gap-3">
        <span className="grid size-12 place-items-center rounded-2xl border-2 border-paper/30">
          <Wallet className="size-6 text-paper" aria-hidden="true" />
        </span>
        <div>
          <p className="eyebrow tracking-[0.16em] text-paper/60">Valeur de tes XP</p>
          <h2 className="font-display text-3xl font-extrabold tabular-nums text-teal">{formatCurrency(stats.xp_value_dh)}</h2>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-xl border border-paper/15 bg-paper/5 p-3">
          <p className="flex items-center gap-2 font-mono text-xs text-paper/70"><Zap className="size-4" aria-hidden="true" />Total XP</p>
          <p className="mt-1 font-display text-xl font-extrabold tabular-nums text-paper">{formatNumber(stats.total_xp)}</p>
        </div>
        <div className="rounded-xl border border-paper/15 bg-paper/5 p-3">
          <p className="flex items-center gap-2 font-mono text-xs text-paper/70"><Coins className="size-4" aria-hidden="true" />Taux</p>
          <p className="mt-1 font-display text-xl font-extrabold tabular-nums text-paper">{stats.xp_rate} XP = 1 DH</p>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-paper/15 bg-paper/5 p-3">
        <div className="flex items-center justify-between font-mono text-sm text-paper/70">
          <span>Paiement max avec XP</span>
          <span className="font-bold text-paper">{stats.max_payment_percentage * 100}%</span>
        </div>
        <div className="mt-2">
          <SegmentedProgress steps={10} current={Math.round(stats.max_payment_percentage * 10)} />
        </div>
      </div>
    </DarkSurface>
  )
}

/* ------------------------------- StatsCards -------------------------------- */
function StatsCards({ stats, savings }: { stats: XPStats; savings: number }) {
  const cards = [
    { icon: TrendingUp, label: "XP gagnés (total)", value: formatNumber(stats.lifetime_earned), subtext: `≈ ${formatCurrency(stats.lifetime_earned / stats.xp_rate)}`, bg: "bg-lime" },
    { icon: PiggyBank, label: "Économies réalisées", value: formatCurrency(savings), subtext: "en utilisant tes XP", bg: "bg-gold" },
    { icon: Gift, label: "XP dépensés", value: formatNumber(stats.lifetime_spent), subtext: `≈ ${formatCurrency(stats.lifetime_spent / stats.xp_rate)}`, bg: "bg-pink" },
  ]
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {cards.map((card) => (
        <StickerCard key={card.label} variant="hover" className="gap-1 p-4">
          <span className={cn("mb-2 grid size-10 place-items-center rounded-xl border-2 border-ink", card.bg)}>
            <card.icon className="size-5 text-ink" aria-hidden="true" />
          </span>
          <p className="text-sm text-mute">{card.label}</p>
          <p className="font-display text-2xl font-extrabold tabular-nums text-ink">{card.value}</p>
          <p className="font-mono text-xs text-mute">{card.subtext}</p>
        </StickerCard>
      ))}
    </div>
  )
}

/* ------------------------------ ROICalculator ------------------------------ */
function ROICalculator({ stats }: { stats: XPStats }) {
  const [purchaseAmount, setPurchaseAmount] = useState<number>(100)
  const [xpPercentage, setXpPercentage] = useState<number>(50)

  const maxXpUsable = Math.min(stats.total_xp, Math.floor((purchaseAmount * xpPercentage / 100) * stats.xp_rate))
  const xpValue = maxXpUsable / stats.xp_rate
  const cashToPay = Math.max(0, purchaseAmount - xpValue)
  const savings = Math.min(xpValue, purchaseAmount)

  return (
    <StickerCard className="gap-6 p-6">
      <div className="flex items-center gap-3">
        <span className="grid size-10 place-items-center rounded-xl border-2 border-ink bg-teal"><Calculator className="size-5 text-ink" aria-hidden="true" /></span>
        <div>
          <h3 className="font-display font-bold text-ink">Calculateur ROI</h3>
          <p className="text-sm text-mute">Simule tes économies.</p>
        </div>
      </div>

      <div className="space-y-6">
        <div className="space-y-1.5">
          <label className="eyebrow tracking-[0.16em]" htmlFor="roi-amount">Montant de l'achat (DH)</label>
          <input
            id="roi-amount"
            type="number"
            value={purchaseAmount}
            onChange={(e) => setPurchaseAmount(Math.max(0, Number(e.target.value)))}
            className="w-full rounded-xl border-2 border-ink bg-white px-4 py-3 text-ink outline-none focus-visible:border-ink"
          />
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="eyebrow tracking-[0.16em]">Pourcentage en XP</span>
            <span className="font-mono font-bold text-teal">{xpPercentage}%</span>
          </div>
          <input
            type="range"
            min="0"
            max={stats.max_payment_percentage * 100}
            value={xpPercentage}
            onChange={(e) => setXpPercentage(Number(e.target.value))}
            className="h-2 w-full cursor-pointer appearance-none rounded-full bg-paper-2 accent-pink"
          />
          <div className="mt-1 flex justify-between font-mono text-xs text-mute">
            <span>0%</span>
            <span>{stats.max_payment_percentage * 100}% max</span>
          </div>
        </div>

        <div className="space-y-3 border-t-2 border-dashed border-line pt-4 font-mono text-sm">
          <Row label="XP utilisés" value={`${formatNumber(maxXpUsable)} XP`} />
          <Row label="Valeur XP" value={formatCurrency(xpValue)} valueClass="text-teal" />
          <Row label="Reste à payer" value={formatCurrency(cashToPay)} />
          <div className="flex items-center justify-between border-t-2 border-dashed border-line pt-3">
            <span className="font-medium text-ink-2">Tu économises</span>
            <span className="font-display text-xl font-extrabold text-lime">{formatCurrency(savings)}</span>
          </div>
        </div>

        {maxXpUsable > stats.total_xp && (
          <div className="flex items-start gap-2 rounded-xl border-2 border-gold bg-warning-soft p-3">
            <Info className="mt-0.5 size-5 shrink-0 text-gold" aria-hidden="true" />
            <p className="text-sm text-ink-2">Tu n'as pas assez d'XP. Il te manque {formatNumber(maxXpUsable - stats.total_xp)} XP.</p>
          </div>
        )}
      </div>
    </StickerCard>
  )
}

function Row({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-mute">{label}</span>
      <span className={cn("font-bold text-ink", valueClass)}>{value}</span>
    </div>
  )
}

/* ------------------------------- Projections ------------------------------- */
function Projections({ projections, stats }: { projections: Projection[]; stats: XPStats }) {
  return (
    <StickerCard className="gap-6 p-6">
      <div className="flex items-center gap-3">
        <span className="grid size-10 place-items-center rounded-xl border-2 border-ink bg-pink"><BarChart3 className="size-5 text-ink" aria-hidden="true" /></span>
        <div>
          <h3 className="font-display font-bold text-ink">Projections</h3>
          <p className="text-sm text-mute">Tes économies futures estimées.</p>
        </div>
      </div>

      <div className="space-y-4">
        {projections.map((projection) => (
          <div key={projection.month}>
            <div className="mb-2 flex items-center justify-between font-mono text-sm">
              <span className="font-medium text-ink-2">{projection.month}</span>
              <span className="text-mute">+{formatNumber(projection.estimated_xp)} XP</span>
            </div>
            <div className="relative h-8 overflow-hidden rounded-lg border-2 border-ink bg-paper-2">
              <div
                className="flex h-full items-center justify-end rounded-[6px] bg-teal pr-3"
                style={{ width: `${Math.min(100, (projection.estimated_xp / (stats.lifetime_earned || 1)) * 100)}%` }}
              >
                <span className="font-mono text-xs font-bold text-ink">{formatCurrency(projection.estimated_value)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border-2 border-ink bg-info-soft p-4">
        <p className="mb-2 flex items-center gap-2 font-display font-bold text-ink"><Target className="size-5 text-teal" aria-hidden="true" />Objectif suggéré</p>
        <p className="text-sm text-ink-2">
          Continue comme ça ! D'ici 3 mois, tu pourrais avoir{" "}
          <span className="font-bold text-teal">{formatCurrency(projections[2]?.estimated_value || 0)}</span> d'économies potentielles.
        </p>
      </div>
    </StickerCard>
  )
}

/* ---------------------------- TransactionHistory --------------------------- */
function TransactionHistory({ transactions, loading }: { transactions: XPTransaction[]; loading: boolean }) {
  if (loading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="size-8 animate-spin text-ink" aria-hidden="true" /></div>
  }
  if (transactions.length === 0) {
    return <EmptyState size="small" title="Aucune transaction XP" description="Gagne des XP pour voir ton historique apparaître ici !" action={{ label: "Voir les quêtes", href: "/teen/quests" }} />
  }

  const grouped: Record<string, XPTransaction[]> = {}
  transactions.forEach((tx) => {
    const date = formatDate(tx.created_at)
    if (!grouped[date]) grouped[date] = []
    grouped[date].push(tx)
  })

  return (
    <div className="space-y-6">
      {Object.entries(grouped).map(([date, txs]) => (
        <div key={date}>
          <div className="mb-3 flex items-center gap-2 font-mono text-sm text-mute">
            <Calendar className="size-4" aria-hidden="true" />{date}
          </div>
          <div className="space-y-2">
            {txs.map((tx) => {
              const config = transactionTypeConfig[tx.type] || transactionTypeConfig.earn
              const Icon = config.icon
              return (
                <div key={tx.id} className="flex items-center gap-4 rounded-xl border-2 border-ink bg-white p-4">
                  <span className={cn("grid size-10 place-items-center rounded-xl border-2 border-ink", config.bg)}>
                    <Icon className="size-5 text-ink" aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-ink">{tx.description || config.label}</p>
                    <p className="font-mono text-xs text-mute">{formatTime(tx.created_at)} · Solde : {formatNumber(tx.balance_after)} XP</p>
                  </div>
                  <div className="text-right">
                    <p className={cn("font-display font-bold tabular-nums", tx.amount >= 0 ? "text-lime" : "text-destructive")}>
                      {tx.amount >= 0 ? "+" : ""}{formatNumber(tx.amount)}
                    </p>
                    <p className="font-mono text-xs text-mute">XP</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

/* ------------------------------- HowItWorks -------------------------------- */
function HowItWorks() {
  return (
    <StickerCard className="gap-6 p-6">
      <h3 className="flex items-center gap-2 font-display font-bold text-ink"><Info className="size-5 text-teal" aria-hidden="true" />XP & Coins — comment ça marche</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border-2 border-ink bg-info-soft p-5">
          <p className="mb-3 flex items-center gap-3 font-display font-bold text-ink">
            <span className="grid size-10 place-items-center rounded-xl border-2 border-ink bg-teal"><Zap className="size-5 text-ink" aria-hidden="true" /></span>
            XP — l'effort
          </p>
          <p className="text-sm leading-relaxed text-ink-2">
            <span className="font-semibold text-ink">XP = effort gagné.</span> Tu en gagnes via défis, quiz, événements et activités. Les XP <span className="font-semibold text-ink">ne se convertissent jamais</span> en DH ni en coins. Ils servent à débloquer des niveaux, badges, paliers et récompenses exclusives.
          </p>
        </div>
        <div className="rounded-2xl border-2 border-ink bg-warning-soft p-5">
          <p className="mb-3 flex items-center gap-3 font-display font-bold text-ink">
            <span className="grid size-10 place-items-center rounded-xl border-2 border-ink bg-gold"><Coins className="size-5 text-ink" aria-hidden="true" /></span>
            Coins — l'argent
          </p>
          <p className="text-sm leading-relaxed text-ink-2">
            <span className="font-semibold text-ink">Coins = monnaie chargée par tes parents</span> (1 DH = 100 coins, taux verrouillé). Sert à payer tes achats et réservations. Chaque dépense te rapporte un cashback <span className="font-semibold text-ink">en XP</span> — c'est la seule passerelle entre les deux.
          </p>
        </div>
      </div>
      <div className="flex items-start gap-3 rounded-xl border-2 border-line bg-paper-2 p-4">
        <Info className="mt-0.5 size-5 shrink-0 text-mute" aria-hidden="true" />
        <p className="text-sm text-mute">Pour utiliser tes coins, va sur <Link href="/teen/wallet" className="font-semibold text-pink hover:underline">/teen/wallet</Link>. Pour suivre tes XP, reste sur cette page.</p>
      </div>
    </StickerCard>
  )
}

/* --------------------------------- Main page ------------------------------- */
export default function XPValuePage() {
  const [stats, setStats] = useState<XPStats>({
    total_xp: 0, xp_value_dh: 0, lifetime_earned: 0, lifetime_spent: 0, xp_rate: 100, max_payment_percentage: 0.5,
  })
  const [transactions, setTransactions] = useState<XPTransaction[]>([])
  const [projections, setProjections] = useState<Projection[]>([])
  const [savings, setSavings] = useState(0)
  const [loading, setLoading] = useState(true)
  const [transactionsLoading, setTransactionsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<"overview" | "calculator" | "history">("overview")

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true)
      const { fetchWithTimeout } = await import('@/lib/fetch/with-timeout')
      const response = await fetchWithTimeout("/api/payments/xp", { timeout: 10000 })
      if (response.ok) {
        const data = await response.json()
        setStats({
          total_xp: data.total_xp || 0,
          xp_value_dh: (data.total_xp || 0) / (data.xp_rate || 100),
          lifetime_earned: data.lifetime_earned || 0,
          lifetime_spent: data.lifetime_spent || 0,
          xp_rate: data.xp_rate || 100,
          max_payment_percentage: data.max_percentage || 0.5,
        })
        setSavings(data.total_savings || 0)
        const monthlyAvg = (data.lifetime_earned || 0) / 6
        const months = ["Ce mois", "Mois prochain", "Dans 2 mois", "Dans 3 mois"]
        setProjections(months.map((month, i) => ({
          month,
          estimated_xp: Math.round((data.total_xp || 0) + monthlyAvg * (i + 1)),
          estimated_value: ((data.total_xp || 0) + monthlyAvg * (i + 1)) / (data.xp_rate || 100),
        })))
      }
    } catch (error) {
      console.error("Error fetching XP stats:", error)
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchTransactions = useCallback(async () => {
    try {
      setTransactionsLoading(true)
      const { fetchWithTimeout } = await import('@/lib/fetch/with-timeout')
      const response = await fetchWithTimeout("/api/payments/xp?type=transactions&limit=50", { timeout: 10000 })
      if (response.ok) {
        const data = await response.json()
        setTransactions(data.transactions || [])
      }
    } catch (error) {
      console.error("Error fetching transactions:", error)
    } finally {
      setTransactionsLoading(false)
    }
  }, [])

  useEffect(() => { fetchStats() }, [fetchStats])
  useEffect(() => { if (activeTab === "history") fetchTransactions() }, [activeTab, fetchTransactions])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper">
        <div className="text-center">
          <Loader2 className="mx-auto mb-4 size-12 animate-spin text-ink" aria-hidden="true" />
          <p className="text-mute">Chargement de tes stats XP…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-paper pb-24">
      <div className="border-b-2 border-ink">
        <div className="mx-auto flex max-w-4xl items-center gap-4 px-4 py-6">
          <Niv mood="calm" size={72} />
          <div>
            <p className="eyebrow tracking-[0.16em]">Valeur XP</p>
            <h1 className="font-display text-3xl font-extrabold tracking-tight">
              Valeur de tes <em className="font-semibold italic text-pink">XP</em>
            </h1>
            <p className="text-sm text-mute">Découvre combien valent tes XP en DH.</p>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-4xl space-y-6 px-4 py-6">
        <ValueCard stats={stats} />

        <StickerTabs
          ariaLabel="Sections XP"
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as "overview" | "calculator" | "history")}
          tabs={[
            { value: "overview", label: "Vue d'ensemble", icon: <BarChart3 /> },
            { value: "calculator", label: "Calculateur", icon: <Calculator /> },
            { value: "history", label: "Historique", icon: <History /> },
          ]}
        />

        {activeTab === "overview" && (
          <div className="space-y-6">
            <StatsCards stats={stats} savings={savings} />
            <Projections projections={projections} stats={stats} />
            <HowItWorks />
          </div>
        )}

        {activeTab === "calculator" && <ROICalculator stats={stats} />}

        {activeTab === "history" && (
          <StickerCard className="gap-6 p-6">
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-xl border-2 border-ink bg-teal"><History className="size-5 text-ink" aria-hidden="true" /></span>
              <div>
                <h3 className="font-display font-bold text-ink">Historique XP</h3>
                <p className="text-sm text-mute">Tes gains et dépenses.</p>
              </div>
            </div>
            <TransactionHistory transactions={transactions} loading={transactionsLoading} />
          </StickerCard>
        )}

        {/* Quick tips */}
        <StickerCard className="gap-4 p-6">
          <h3 className="flex items-center gap-3 font-display font-bold text-ink"><Trophy className="size-6 text-gold" aria-hidden="true" />Astuces pour gagner plus d'XP</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              "Complète les défis quotidiens (+50-200 XP)",
              "Participe aux événements (+500-2000 XP)",
              "Finis les quiz éducatifs (+100 XP)",
              "Maintiens ta streak active (bonus x1.5)",
            ].map((tip, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-ink-2">
                <Check className="size-4 shrink-0 text-lime" aria-hidden="true" />{tip}
              </div>
            ))}
          </div>
        </StickerCard>
      </div>
    </div>
  )
}
