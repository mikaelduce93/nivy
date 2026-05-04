/**
 * PAGE VALEUR XP
 * ===============
 * Affiche la valeur des XP en DH, calculateur ROI,
 * historique des conversions et projections
 */

"use client"

import { useState, useEffect, useCallback } from "react"
import { motion } from "framer-motion"
import {
  Coins,
  TrendingUp,
  Calculator,
  History,
  Sparkles,
  ArrowRight,
  ArrowUpRight,
  ArrowDownRight,
  Zap,
  Gift,
  Calendar,
  Target,
  Trophy,
  ChevronRight,
  Info,
  Loader2,
  PiggyBank,
  Wallet,
  BarChart3,
  Clock,
  Check,
} from "lucide-react"

// ============================================================================
// TYPES
// ============================================================================

interface XPStats {
  total_xp: number
  xp_value_dh: number
  lifetime_earned: number
  lifetime_spent: number
  xp_rate: number // XP per DH
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

// ============================================================================
// HELPERS
// ============================================================================

function formatNumber(num: number): string {
  return num.toLocaleString("fr-FR")
}

function formatCurrency(amount: number): string {
  return `${amount.toFixed(2)} DH`
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

function formatTime(date: string): string {
  return new Date(date).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  })
}

const transactionTypeConfig: Record<string, { color: string; icon: any; label: string }> = {
  earn: { color: "text-green-400 bg-green-500/20", icon: ArrowUpRight, label: "Gagné" },
  payment: { color: "text-red-400 bg-red-500/20", icon: ArrowDownRight, label: "Dépensé" },
  refund: { color: "text-blue-400 bg-blue-500/20", icon: ArrowUpRight, label: "Remboursé" },
  bonus: { color: "text-yellow-400 bg-yellow-500/20", icon: Sparkles, label: "Bonus" },
  penalty: { color: "text-red-400 bg-red-500/20", icon: ArrowDownRight, label: "Pénalité" },
  transfer: { color: "text-purple-400 bg-purple-500/20", icon: ArrowRight, label: "Transfert" },
}

// ============================================================================
// VALUE CARD
// ============================================================================

interface ValueCardProps {
  stats: XPStats
}

function ValueCard({ stats }: ValueCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-cyan-500 via-blue-500 to-purple-600 p-6"
    >
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`,
          backgroundSize: "24px 24px",
        }} />
      </div>

      {/* Floating coins animation */}
      <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-white/10 blur-2xl" />
      <div className="absolute -left-8 -bottom-8 w-24 h-24 rounded-full bg-white/10 blur-2xl" />

      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
            <Wallet className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="text-white/80 text-sm">Valeur de tes XP</p>
            <h2 className="text-3xl font-bold text-white">
              {formatCurrency(stats.xp_value_dh)}
            </h2>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3">
            <div className="flex items-center gap-2 text-white/70 text-sm mb-1">
              <Zap className="w-4 h-4" />
              Total XP
            </div>
            <p className="text-xl font-bold text-white">{formatNumber(stats.total_xp)}</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3">
            <div className="flex items-center gap-2 text-white/70 text-sm mb-1">
              <Coins className="w-4 h-4" />
              Taux
            </div>
            <p className="text-xl font-bold text-white">{stats.xp_rate} XP = 1 DH</p>
          </div>
        </div>

        <div className="mt-4 p-3 bg-white/10 backdrop-blur-sm rounded-xl">
          <div className="flex items-center justify-between text-sm">
            <span className="text-white/70">Paiement max avec XP</span>
            <span className="font-bold text-white">{stats.max_payment_percentage * 100}%</span>
          </div>
          <div className="mt-2 h-2 bg-white/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-white rounded-full"
              style={{ width: `${stats.max_payment_percentage * 100}%` }}
            />
          </div>
        </div>
      </div>
    </motion.div>
  )
}

// ============================================================================
// STATS CARDS
// ============================================================================

interface StatsCardsProps {
  stats: XPStats
  savings: number
}

function StatsCards({ stats, savings }: StatsCardsProps) {
  const cards = [
    {
      icon: TrendingUp,
      label: "XP Gagnés (total)",
      value: formatNumber(stats.lifetime_earned),
      subtext: `≈ ${formatCurrency(stats.lifetime_earned / stats.xp_rate)}`,
      color: "from-green-500 to-emerald-500",
    },
    {
      icon: PiggyBank,
      label: "Économies réalisées",
      value: formatCurrency(savings),
      subtext: "en utilisant tes XP",
      color: "from-yellow-500 to-amber-500",
    },
    {
      icon: Gift,
      label: "XP Dépensés",
      value: formatNumber(stats.lifetime_spent),
      subtext: `≈ ${formatCurrency(stats.lifetime_spent / stats.xp_rate)}`,
      color: "from-purple-500 to-pink-500",
    },
  ]

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {cards.map((card, index) => (
        <motion.div
          key={card.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          className="bg-zinc-800/50 rounded-2xl p-4 border border-zinc-700/50"
        >
          <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${card.color} flex items-center justify-center mb-3`}>
            <card.icon className="w-5 h-5 text-white" />
          </div>
          <p className="text-sm text-zinc-400 mb-1">{card.label}</p>
          <p className="text-2xl font-bold text-white">{card.value}</p>
          <p className="text-xs text-zinc-500 mt-1">{card.subtext}</p>
        </motion.div>
      ))}
    </div>
  )
}

// ============================================================================
// ROI CALCULATOR
// ============================================================================

interface ROICalculatorProps {
  stats: XPStats
}

function ROICalculator({ stats }: ROICalculatorProps) {
  const [purchaseAmount, setPurchaseAmount] = useState<number>(100)
  const [xpPercentage, setXpPercentage] = useState<number>(50)

  const maxXpUsable = Math.min(
    stats.total_xp,
    Math.floor((purchaseAmount * xpPercentage / 100) * stats.xp_rate)
  )
  const xpValue = maxXpUsable / stats.xp_rate
  const cashToPay = Math.max(0, purchaseAmount - xpValue)
  const savings = Math.min(xpValue, purchaseAmount)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-zinc-800/50 rounded-2xl p-6 border border-zinc-700/50"
    >
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center">
          <Calculator className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="font-bold text-white">Calculateur ROI</h3>
          <p className="text-sm text-zinc-400">Simule tes économies</p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Purchase amount */}
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">
            Montant de l'achat (DH)
          </label>
          <input
            type="number"
            value={purchaseAmount}
            onChange={(e) => setPurchaseAmount(Math.max(0, Number(e.target.value)))}
            className="w-full px-4 py-3 bg-zinc-900 border border-zinc-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
          />
        </div>

        {/* XP percentage slider */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-zinc-300">
              Pourcentage en XP
            </label>
            <span className="text-cyan-400 font-bold">{xpPercentage}%</span>
          </div>
          <input
            type="range"
            min="0"
            max={stats.max_payment_percentage * 100}
            value={xpPercentage}
            onChange={(e) => setXpPercentage(Number(e.target.value))}
            className="w-full h-2 bg-zinc-700 rounded-full appearance-none cursor-pointer accent-cyan-500"
          />
          <div className="flex justify-between text-xs text-zinc-500 mt-1">
            <span>0%</span>
            <span>{stats.max_payment_percentage * 100}% max</span>
          </div>
        </div>

        {/* Results */}
        <div className="space-y-3 pt-4 border-t border-zinc-700">
          <div className="flex items-center justify-between">
            <span className="text-zinc-400">XP utilisés</span>
            <span className="font-bold text-white">{formatNumber(maxXpUsable)} XP</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-zinc-400">Valeur XP</span>
            <span className="font-bold text-cyan-400">{formatCurrency(xpValue)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-zinc-400">Reste à payer</span>
            <span className="font-bold text-white">{formatCurrency(cashToPay)}</span>
          </div>
          <div className="flex items-center justify-between pt-3 border-t border-zinc-700">
            <span className="text-zinc-300 font-medium">Tu économises</span>
            <span className="text-xl font-bold text-green-400">{formatCurrency(savings)}</span>
          </div>
        </div>

        {/* Availability check */}
        {maxXpUsable > stats.total_xp && (
          <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl">
            <Info className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-amber-400">
              Tu n'as pas assez d'XP. Il te manque {formatNumber(maxXpUsable - stats.total_xp)} XP.
            </p>
          </div>
        )}
      </div>
    </motion.div>
  )
}

// ============================================================================
// PROJECTIONS
// ============================================================================

interface ProjectionsProps {
  projections: Projection[]
  stats: XPStats
}

function Projections({ projections, stats }: ProjectionsProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-zinc-800/50 rounded-2xl p-6 border border-zinc-700/50"
    >
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
          <BarChart3 className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="font-bold text-white">Projections</h3>
          <p className="text-sm text-zinc-400">Tes économies futures estimées</p>
        </div>
      </div>

      <div className="space-y-4">
        {projections.map((projection, index) => (
          <div key={projection.month} className="relative">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-zinc-300">{projection.month}</span>
              <span className="text-sm text-zinc-400">
                +{formatNumber(projection.estimated_xp)} XP
              </span>
            </div>
            <div className="h-8 bg-zinc-900 rounded-lg overflow-hidden relative">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, (projection.estimated_xp / (stats.lifetime_earned || 1)) * 100)}%` }}
                transition={{ delay: index * 0.1, duration: 0.5 }}
                className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-lg flex items-center justify-end pr-3"
              >
                <span className="text-xs font-bold text-white">
                  {formatCurrency(projection.estimated_value)}
                </span>
              </motion.div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 p-4 bg-gradient-to-r from-cyan-500/10 to-purple-500/10 rounded-xl border border-cyan-500/20">
        <div className="flex items-center gap-2 mb-2">
          <Target className="w-5 h-5 text-cyan-400" />
          <span className="font-medium text-white">Objectif suggéré</span>
        </div>
        <p className="text-sm text-zinc-400">
          Continue comme ça! D'ici 3 mois, tu pourrais avoir{" "}
          <span className="text-cyan-400 font-bold">
            {formatCurrency(projections[2]?.estimated_value || 0)}
          </span>{" "}
          d'économies potentielles.
        </p>
      </div>
    </motion.div>
  )
}

// ============================================================================
// TRANSACTION HISTORY
// ============================================================================

interface TransactionHistoryProps {
  transactions: XPTransaction[]
  loading: boolean
}

function TransactionHistory({ transactions, loading }: TransactionHistoryProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-cyan-500 animate-spin" />
      </div>
    )
  }

  if (transactions.length === 0) {
    return (
      <div className="text-center py-12">
        <History className="w-16 h-16 text-zinc-700 mx-auto mb-4" />
        <p className="text-zinc-400">Aucune transaction XP</p>
        <p className="text-sm text-zinc-500">Gagne des XP pour voir ton historique!</p>
      </div>
    )
  }

  // Group by date
  const groupedTransactions: Record<string, XPTransaction[]> = {}
  transactions.forEach((tx) => {
    const date = formatDate(tx.created_at)
    if (!groupedTransactions[date]) {
      groupedTransactions[date] = []
    }
    groupedTransactions[date].push(tx)
  })

  return (
    <div className="space-y-6">
      {Object.entries(groupedTransactions).map(([date, txs]) => (
        <div key={date}>
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="w-4 h-4 text-zinc-500" />
            <span className="text-sm font-medium text-zinc-400">{date}</span>
          </div>
          <div className="space-y-2">
            {txs.map((tx) => {
              const config = transactionTypeConfig[tx.type] || transactionTypeConfig.earn
              const Icon = config.icon

              return (
                <motion.div
                  key={tx.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center gap-4 p-4 bg-zinc-900/50 rounded-xl"
                >
                  <div className={`w-10 h-10 rounded-xl ${config.color} flex items-center justify-center`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-white truncate">
                      {tx.description || config.label}
                    </p>
                    <p className="text-xs text-zinc-500">
                      {formatTime(tx.created_at)} - Solde: {formatNumber(tx.balance_after)} XP
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`font-bold ${tx.amount >= 0 ? "text-green-400" : "text-red-400"}`}>
                      {tx.amount >= 0 ? "+" : ""}{formatNumber(tx.amount)}
                    </p>
                    <p className="text-xs text-zinc-500">XP</p>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

// ============================================================================
// HOW IT WORKS
// ============================================================================

function HowItWorks() {
  const steps = [
    {
      icon: Zap,
      title: "Gagne des XP",
      description: "Complète des défis, quiz, activités et événements",
    },
    {
      icon: Coins,
      title: "Accumule de la valeur",
      description: "Chaque 100 XP = 1 DH d'économies",
    },
    {
      icon: Wallet,
      title: "Paie avec tes XP",
      description: "Utilise jusqu'à 50% en XP sur tes achats",
    },
    {
      icon: PiggyBank,
      title: "Économise",
      description: "Moins tu paies en cash, plus tu économises!",
    },
  ]

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-zinc-800/50 rounded-2xl p-6 border border-zinc-700/50"
    >
      <h3 className="font-bold text-white mb-6 flex items-center gap-2">
        <Info className="w-5 h-5 text-cyan-400" />
        Comment ça marche?
      </h3>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map((step, index) => (
          <div key={step.title} className="relative">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center flex-shrink-0">
                <step.icon className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-5 h-5 rounded-full bg-cyan-500 text-white text-xs font-bold flex items-center justify-center">
                    {index + 1}
                  </span>
                  <h4 className="font-medium text-white">{step.title}</h4>
                </div>
                <p className="text-sm text-zinc-400">{step.description}</p>
              </div>
            </div>
            {index < steps.length - 1 && (
              <ChevronRight className="hidden lg:block absolute -right-2 top-3 w-4 h-4 text-zinc-600" />
            )}
          </div>
        ))}
      </div>
    </motion.div>
  )
}

// ============================================================================
// MAIN PAGE
// ============================================================================

export default function XPValuePage() {
  const [stats, setStats] = useState<XPStats>({
    total_xp: 0,
    xp_value_dh: 0,
    lifetime_earned: 0,
    lifetime_spent: 0,
    xp_rate: 100,
    max_payment_percentage: 0.5,
  })
  const [transactions, setTransactions] = useState<XPTransaction[]>([])
  const [projections, setProjections] = useState<Projection[]>([])
  const [savings, setSavings] = useState(0)
  const [loading, setLoading] = useState(true)
  const [transactionsLoading, setTransactionsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<"overview" | "calculator" | "history">("overview")

  // Fetch stats
  const fetchStats = useCallback(async () => {
    try {
      setLoading(true)

      // Fetch XP stats
      const { fetchWithTimeout } = await import('@/lib/fetch/with-timeout')
      const response = await fetchWithTimeout("/api/payments/xp", {
        timeout: 10000, // 10 seconds
      })
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

        // Calculate projections based on average monthly earnings
        const monthlyAvg = (data.lifetime_earned || 0) / 6 // Assume 6 months of data
        const months = ["Ce mois", "Mois prochain", "Dans 2 mois", "Dans 3 mois"]
        setProjections(
          months.map((month, i) => ({
            month,
            estimated_xp: Math.round((data.total_xp || 0) + monthlyAvg * (i + 1)),
            estimated_value: ((data.total_xp || 0) + monthlyAvg * (i + 1)) / (data.xp_rate || 100),
          }))
        )
      }
    } catch (error) {
      console.error("Error fetching XP stats:", error)
    } finally {
      setLoading(false)
    }
  }, [])

  // Fetch transactions
  const fetchTransactions = useCallback(async () => {
    try {
      setTransactionsLoading(true)
      const { fetchWithTimeout } = await import('@/lib/fetch/with-timeout')
      const response = await fetchWithTimeout("/api/payments/xp?type=transactions&limit=50", {
        timeout: 10000, // 10 seconds
      })
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

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  useEffect(() => {
    if (activeTab === "history") {
      fetchTransactions()
    }
  }, [activeTab, fetchTransactions])

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-cyan-500 animate-spin mx-auto mb-4" />
          <p className="text-zinc-400">Chargement de tes stats XP...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-950 pb-24">
      {/* Header */}
      <div className="bg-gradient-to-b from-zinc-900 to-zinc-950 border-b border-zinc-800">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center">
              <Coins className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Valeur de tes XP</h1>
              <p className="text-zinc-400">Découvre combien valent tes XP en DH</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Value Card */}
        <ValueCard stats={stats} />

        {/* Tabs */}
        <div className="flex gap-2 p-1 bg-zinc-800/50 rounded-xl">
          {[
            { id: "overview", label: "Vue d'ensemble", icon: BarChart3 },
            { id: "calculator", label: "Calculateur", icon: Calculator },
            { id: "history", label: "Historique", icon: History },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as "overview" | "calculator" | "history")}
              className={`flex-1 py-2.5 px-4 rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition-all ${
                activeTab === id
                  ? "bg-gradient-to-r from-cyan-500 to-blue-500 text-white"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>

        {/* Tab content */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            <StatsCards stats={stats} savings={savings} />
            <Projections projections={projections} stats={stats} />
            <HowItWorks />
          </div>
        )}

        {activeTab === "calculator" && (
          <ROICalculator stats={stats} />
        )}

        {activeTab === "history" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-zinc-800/50 rounded-2xl p-6 border border-zinc-700/50"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center">
                <History className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-white">Historique XP</h3>
                <p className="text-sm text-zinc-400">Tes gains et dépenses</p>
              </div>
            </div>
            <TransactionHistory
              transactions={transactions}
              loading={transactionsLoading}
            />
          </motion.div>
        )}

        {/* Quick tips */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-yellow-500/10 to-amber-500/10 rounded-2xl p-6 border border-yellow-500/20"
        >
          <div className="flex items-center gap-3 mb-4">
            <Trophy className="w-6 h-6 text-yellow-500" />
            <h3 className="font-bold text-white">Astuces pour gagner plus d'XP</h3>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              "Complète les défis quotidiens (+50-200 XP)",
              "Participe aux événements (+500-2000 XP)",
              "Finis les quiz éducatifs (+100 XP)",
              "Maintiens ta streak active (bonus x1.5)",
            ].map((tip, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-zinc-300">
                <Check className="w-4 h-4 text-green-400 flex-shrink-0" />
                {tip}
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  )
}
