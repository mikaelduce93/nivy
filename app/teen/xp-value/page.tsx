/**
 * PAGE « MES XP » (#206 — règle devise tranchée)
 * ==============================================
 * Les XP = mérite. Ils NE se convertissent JAMAIS en DH ni en coins.
 * Cette page affiche donc le solde XP, les gains/dépenses (en XP) et
 * l'historique — SANS aucune valorisation en DH, sans calculateur ROI, sans
 * projection en argent (qui contredisaient la règle et utilisaient un taux
 * divergent). Les coins/DH vivent sur /teen/wallet.
 */

"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import {
  Coins, TrendingUp, History, Sparkles, ArrowRight,
  ArrowUpRight, ArrowDownRight, Zap, Gift, Calendar,
  Trophy, Info, Loader2,
} from "lucide-react"

import { EmptyState } from "@/components/ui/states/empty-state"
import { StickerCard } from "@/components/ui/sticker-card"
import { StickerTabs } from "@/components/brand/sticker-tab"
import { Niv, DarkSurface } from "@/components/brand"
import { cn } from "@/lib/utils"

interface XPStats {
  total_xp: number
  lifetime_earned: number
  lifetime_spent: number
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

const formatNumber = (num: number) => num.toLocaleString("fr-FR")
const formatDate = (date: string) => new Date(date).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })
const formatTime = (date: string) => new Date(date).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })

const transactionTypeConfig: Record<string, { bg: string; icon: typeof ArrowUpRight; label: string }> = {
  earn: { bg: "bg-lime", icon: ArrowUpRight, label: "Gagné" },
  payment: { bg: "bg-destructive", icon: ArrowDownRight, label: "Dépensé" },
  refund: { bg: "bg-teal", icon: ArrowUpRight, label: "Remboursé" },
  bonus: { bg: "bg-gold", icon: Sparkles, label: "Bonus" },
  penalty: { bg: "bg-destructive", icon: ArrowDownRight, label: "Pénalité" },
  transfer: { bg: "bg-pink", icon: ArrowRight, label: "Transfert" },
}

/* -------------------------------- ValueCard -------------------------------- */
// #206 — affiche le SOLDE XP (mérite), sans aucune valeur en DH ni taux.
function BalanceCard({ stats }: { stats: XPStats }) {
  return (
    <DarkSurface tone="teal" shadow className="p-6">
      <div className="mb-6 flex items-center gap-3">
        <span className="grid size-12 place-items-center rounded-2xl border-2 border-paper/30">
          <Zap className="size-6 text-paper" aria-hidden="true" />
        </span>
        <div>
          <p className="eyebrow tracking-[0.16em] text-paper/60">Ton solde XP</p>
          <h2 className="font-display text-3xl font-extrabold tabular-nums text-teal">{formatNumber(stats.total_xp)} XP</h2>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-xl border border-paper/15 bg-paper/5 p-3">
          <p className="flex items-center gap-2 font-mono text-xs text-paper/70"><ArrowUpRight className="size-4" aria-hidden="true" />Gagnés (total)</p>
          <p className="mt-1 font-display text-xl font-extrabold tabular-nums text-paper">{formatNumber(stats.lifetime_earned)} XP</p>
        </div>
        <div className="rounded-xl border border-paper/15 bg-paper/5 p-3">
          <p className="flex items-center gap-2 font-mono text-xs text-paper/70"><Gift className="size-4" aria-hidden="true" />Dépensés (total)</p>
          <p className="mt-1 font-display text-xl font-extrabold tabular-nums text-paper">{formatNumber(stats.lifetime_spent)} XP</p>
        </div>
      </div>
    </DarkSurface>
  )
}

/* ------------------------------- StatsCards -------------------------------- */
function StatsCards({ stats }: { stats: XPStats }) {
  const cards = [
    { icon: TrendingUp, label: "XP gagnés (total)", value: `${formatNumber(stats.lifetime_earned)} XP`, subtext: "via défis, quiz et événements", bg: "bg-lime" },
    { icon: Gift, label: "XP dépensés (total)", value: `${formatNumber(stats.lifetime_spent)} XP`, subtext: "en récompenses de la boutique", bg: "bg-pink" },
    { icon: Zap, label: "Solde actuel", value: `${formatNumber(stats.total_xp)} XP`, subtext: "ton mérite cumulé", bg: "bg-gold" },
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

/* ------------------------------- HowItWorks -------------------------------- */
function HowItWorks() {
  return (
    <StickerCard className="gap-6 p-6">
      <h3 className="flex items-center gap-2 font-display font-bold text-ink"><Info className="size-5 text-teal" aria-hidden="true" />XP & Coins — comment ça marche</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border-2 border-ink bg-info-soft p-5">
          <p className="mb-3 flex items-center gap-3 font-display font-bold text-ink">
            <span className="grid size-10 place-items-center rounded-xl border-2 border-ink bg-teal"><Zap className="size-5 text-ink" aria-hidden="true" /></span>
            XP — l&apos;effort
          </p>
          <p className="text-sm leading-relaxed text-ink-2">
            <span className="font-semibold text-ink">XP = effort gagné.</span> Tu en gagnes via défis, quiz, événements et activités. Les XP <span className="font-semibold text-ink">ne se convertissent jamais</span> en DH ni en coins. Ils servent à débloquer des niveaux, badges, paliers et récompenses exclusives.
          </p>
        </div>
        <div className="rounded-2xl border-2 border-ink bg-warning-soft p-5">
          <p className="mb-3 flex items-center gap-3 font-display font-bold text-ink">
            <span className="grid size-10 place-items-center rounded-xl border-2 border-ink bg-gold"><Coins className="size-5 text-ink" aria-hidden="true" /></span>
            Coins — l&apos;argent
          </p>
          <p className="text-sm leading-relaxed text-ink-2">
            <span className="font-semibold text-ink">Coins = monnaie chargée par tes parents</span> (1 DH = 100 coins, taux verrouillé). Sert à payer tes achats et réservations. Chaque dépense te rapporte un cashback <span className="font-semibold text-ink">en XP</span> — c&apos;est la seule passerelle entre les deux.
          </p>
        </div>
      </div>
      <div className="flex items-start gap-3 rounded-xl border-2 border-line bg-paper-2 p-4">
        <Info className="mt-0.5 size-5 shrink-0 text-mute" aria-hidden="true" />
        <p className="text-sm text-mute">Pour utiliser tes coins, va sur <Link href="/teen/wallet" className="font-semibold text-pink hover:underline">/teen/wallet</Link>.</p>
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

/* --------------------------------- Main page ------------------------------- */
export default function XPValuePage() {
  const [stats, setStats] = useState<XPStats>({
    total_xp: 0, lifetime_earned: 0, lifetime_spent: 0,
  })
  const [transactions, setTransactions] = useState<XPTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [transactionsLoading, setTransactionsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<"overview" | "history">("overview")

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true)
      const { fetchWithTimeout } = await import('@/lib/fetch/with-timeout')
      const response = await fetchWithTimeout("/api/payments/xp", { timeout: 10000 })
      if (response.ok) {
        const data = await response.json()
        setStats({
          total_xp: data.total_xp || 0,
          lifetime_earned: data.lifetime_earned || 0,
          lifetime_spent: data.lifetime_spent || 0,
        })
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
            <p className="eyebrow tracking-[0.16em]">Mes XP</p>
            <h1 className="font-display text-3xl font-extrabold tracking-tight">
              Tes <em className="font-semibold italic text-pink">XP</em>, ton mérite
            </h1>
            <p className="text-sm text-mute">Ce que tu as gagné et dépensé. Les XP ne se convertissent jamais en argent.</p>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-4xl space-y-6 px-4 py-6">
        <BalanceCard stats={stats} />

        <StickerTabs
          ariaLabel="Sections XP"
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as "overview" | "history")}
          tabs={[
            { value: "overview", label: "Vue d'ensemble", icon: <Trophy /> },
            { value: "history", label: "Historique", icon: <History /> },
          ]}
        />

        {activeTab === "overview" && (
          <div className="space-y-6">
            <StatsCards stats={stats} />
            <HowItWorks />

            <StickerCard className="gap-4 p-6">
              <h3 className="flex items-center gap-3 font-display font-bold text-ink"><Trophy className="size-6 text-gold" aria-hidden="true" />Astuces pour gagner plus d&apos;XP</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  "Complète les défis quotidiens (+50-200 XP)",
                  "Participe aux événements (+500-2000 XP)",
                  "Finis les quiz éducatifs (+100 XP)",
                  "Maintiens ta streak active",
                ].map((tip, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-ink-2">
                    <Sparkles className="size-4 shrink-0 text-lime" aria-hidden="true" />{tip}
                  </div>
                ))}
              </div>
            </StickerCard>
          </div>
        )}

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
      </div>
    </div>
  )
}
