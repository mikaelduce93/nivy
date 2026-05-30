"use client"

/**
 * TOKEN WALLET COMPONENT
 * ======================
 * Interface de portefeuille de tokens
 */

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Wallet,
  Coins,
  Gem,
  Sparkles,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownLeft,
  Gift,
  Calendar,
  Flame,
  Clock,
  ChevronRight,
  RefreshCw,
  Send,
  History,
  Loader2,
  CheckCircle,
  XCircle,
} from "lucide-react"

// Types
interface WalletData {
  balances: {
    regular: number
    premium: number
    seasonal: number
    total: number
  }
  stats: {
    lifetime_earned: number
    lifetime_spent: number
    total_lifetime: number
    multiplier: number
  }
  daily: {
    streak: number
    claimed_today: boolean
    last_claim: string | null
  }
  recent_transactions: Array<{
    transaction_type: string
    token_type: string
    amount: number
    description: string
    created_at: string
  }>
}

interface DailyBonusData {
  streak: number
  claimed_today: boolean
  last_claim: string | null
  next_streak_bonus: number
}

// Composant principal Wallet
export function TokenWallet() {
  const [wallet, setWallet] = useState<WalletData | null>(null)
  const [loading, setLoading] = useState(true)
  const [claiming, setClaiming] = useState(false)
  const [showTransfer, setShowTransfer] = useState(false)
  const [activeTab, setActiveTab] = useState<"overview" | "history" | "transfer">("overview")

  const loadWallet = async () => {
    try {
      const res = await fetch("/api/teen/tokens?type=wallet")
      const data = await res.json()
      if (data.wallet) setWallet(data.wallet)
    } catch (err) {
      console.error("Error loading wallet:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadWallet()
  }, [])

  const handleClaimDaily = async () => {
    setClaiming(true)
    try {
      const res = await fetch("/api/teen/tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "claim_daily" }),
      })

      const data = await res.json()
      if (data.success) {
        // Recharger le wallet
        await loadWallet()
      }
    } catch (err) {
      console.error("Error claiming daily:", err)
    } finally {
      setClaiming(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="w-8 h-8 text-teal animate-spin" />
      </div>
    )
  }

  if (!wallet) {
    return (
      <div className="bg-card rounded-xl border border-ink p-8 text-center">
        <Wallet className="w-12 h-12 text-mute mx-auto mb-4" />
        <p className="text-mute">Impossible de charger le portefeuille</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header avec soldes */}
      <div className="bg-gradient-to-br from-teal/10 via-teal/10 to-pink/10
        rounded-2xl border border-teal/20 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-teal to-teal rounded-xl
              flex items-center justify-center">
              <Wallet className="w-6 h-6 text-ink" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-ink">Mon Portefeuille</h2>
              {wallet.stats.multiplier > 1 && (
                <p className="text-sm text-teal flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  Bonus ×{wallet.stats.multiplier}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={loadWallet}
            className="p-2 hover:bg-card rounded-lg transition-colors"
          >
            <RefreshCw className="w-5 h-5 text-mute" />
          </button>
        </div>

        {/* Balances Cards */}
        <div className="grid grid-cols-3 gap-4">
          {/* Regular Tokens */}
          <div className="bg-card rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Coins className="w-5 h-5 text-gold" />
              <span className="text-sm text-mute">Tokens</span>
            </div>
            <p className="text-2xl font-bold text-ink">
              {wallet.balances.regular.toLocaleString()}
            </p>
          </div>

          {/* Premium Tokens */}
          <div className="bg-card rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Gem className="w-5 h-5 text-pink" />
              <span className="text-sm text-mute">Premium</span>
            </div>
            <p className="text-2xl font-bold text-ink">
              {wallet.balances.premium.toLocaleString()}
            </p>
          </div>

          {/* Seasonal Tokens */}
          <div className="bg-card rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-5 h-5 text-pink" />
              <span className="text-sm text-mute">Saison</span>
            </div>
            <p className="text-2xl font-bold text-ink">
              {wallet.balances.seasonal.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Total Value */}
        <div className="mt-4 pt-4 border-t border-ink">
          <div className="flex items-center justify-between">
            <span className="text-mute">Valeur totale</span>
            <span className="text-2xl font-bold text-teal">
              {wallet.balances.total.toLocaleString()} pts
            </span>
          </div>
        </div>
      </div>

      {/* Daily Bonus Card */}
      <DailyBonusCard
        daily={wallet.daily as any}
        onClaim={handleClaimDaily}
        claiming={claiming}
      />

      {/* Tabs */}
      <div className="flex gap-2">
        {[
          { key: "overview", label: "Aperçu", icon: Wallet },
          { key: "history", label: "Historique", icon: History },
          { key: "transfer", label: "Transférer", icon: Send },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as typeof activeTab)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors
              ${activeTab === tab.key
                ? "bg-teal/10 text-teal"
                : "text-mute hover:text-ink hover:bg-card"
              }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        {activeTab === "overview" && (
          <OverviewTab wallet={wallet} />
        )}

        {activeTab === "history" && (
          <HistoryTab />
        )}

        {activeTab === "transfer" && (
          <TransferTab onTransferComplete={loadWallet} />
        )}
      </AnimatePresence>
    </div>
  )
}

// Daily Bonus Card
export function DailyBonusCard({
  daily,
  onClaim,
  claiming,
}: {
  daily: DailyBonusData
  onClaim: () => void
  claiming: boolean
}) {
  const streakDays = Array.from({ length: 7 }, (_, i) => i + 1)

  return (
    <div className="bg-card rounded-xl border border-ink p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-coral/20 rounded-lg flex items-center justify-center">
            <Flame className="w-5 h-5 text-coral" />
          </div>
          <div>
            <h3 className="font-semibold text-ink">Bonus Quotidien</h3>
            <p className="text-sm text-mute">
              Série de {daily.streak} jour{daily.streak > 1 ? "s" : ""}
            </p>
          </div>
        </div>

        <button
          onClick={onClaim}
          disabled={claiming || daily.claimed_today}
          className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2
            ${daily.claimed_today
              ? "bg-lime/20 text-lime cursor-default"
              : "bg-gradient-to-r from-coral to-pink text-ink hover:opacity-90"
            }`}
        >
          {claiming ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : daily.claimed_today ? (
            <>
              <CheckCircle className="w-4 h-4" />
              Réclamé
            </>
          ) : (
            <>
              <Gift className="w-4 h-4" />
              Réclamer
            </>
          )}
        </button>
      </div>

      {/* Streak Progress */}
      <div className="flex gap-2">
        {streakDays.map((day) => {
          const isCompleted = (daily.streak % 7) >= day || daily.streak >= 7
          const isCurrent = (daily.streak % 7) + 1 === day && !daily.claimed_today
          const isBonus = day === 7

          return (
            <div
              key={day}
              className={`flex-1 p-2 rounded-lg text-center transition-all
                ${isCompleted
                  ? "bg-coral/20 border border-coral/30"
                  : isCurrent
                  ? "bg-teal/20 border border-teal/30 animate-pulse"
                  : "bg-card border border-ink"
                }`}
            >
              <span className={`text-xs ${isCompleted ? "text-coral" : "text-mute"}`}>
                J{day}
              </span>
              {isBonus && (
                <div className="mt-1">
                  <Sparkles className={`w-3 h-3 mx-auto ${isCompleted ? "text-gold" : "text-mute"}`} />
                </div>
              )}
            </div>
          )
        })}
      </div>

      <p className="text-xs text-mute mt-3 text-center">
        {daily.next_streak_bonus === 7
          ? "Bonus de série dans 7 jours!"
          : `Bonus de série dans ${daily.next_streak_bonus} jour${daily.next_streak_bonus > 1 ? "s" : ""}`}
      </p>
    </div>
  )
}

// Overview Tab
function OverviewTab({ wallet }: { wallet: WalletData }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="grid gap-6 md:grid-cols-2"
    >
      {/* Stats */}
      <div className="bg-card rounded-xl border border-ink p-6">
        <h3 className="font-semibold text-ink mb-4">Statistiques</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-mute flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-lime" />
              Total gagné
            </span>
            <span className="text-ink font-medium">
              {wallet.stats.lifetime_earned.toLocaleString()}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-mute flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-destructive" />
              Total dépensé
            </span>
            <span className="text-ink font-medium">
              {wallet.stats.lifetime_spent.toLocaleString()}
            </span>
          </div>
          <div className="pt-4 border-t border-ink">
            <div className="flex items-center justify-between">
              <span className="text-mute">Net</span>
              <span className={`font-bold ${
                wallet.stats.lifetime_earned - wallet.stats.lifetime_spent >= 0
                  ? "text-lime"
                  : "text-destructive"
              }`}>
                {(wallet.stats.lifetime_earned - wallet.stats.lifetime_spent).toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="bg-card rounded-xl border border-ink p-6">
        <h3 className="font-semibold text-ink mb-4">Transactions récentes</h3>
        {wallet.recent_transactions.length > 0 ? (
          <div className="space-y-3">
            {wallet.recent_transactions.slice(0, 5).map((tx, idx) => (
              <div key={idx} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center
                    ${tx.amount > 0 ? "bg-lime/20" : "bg-destructive/20"}`}
                  >
                    {tx.amount > 0 ? (
                      <ArrowDownLeft className="w-4 h-4 text-lime" />
                    ) : (
                      <ArrowUpRight className="w-4 h-4 text-destructive" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm text-ink">{tx.description || tx.transaction_type}</p>
                    <p className="text-xs text-mute">
                      {new Date(tx.created_at).toLocaleDateString("fr-FR")}
                    </p>
                  </div>
                </div>
                <span className={`font-medium ${tx.amount > 0 ? "text-lime" : "text-destructive"}`}>
                  {tx.amount > 0 ? "+" : ""}{tx.amount}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-mute text-center py-4">Aucune transaction</p>
        )}
      </div>
    </motion.div>
  )
}

// History Tab
function HistoryTab() {
  const [transactions, setTransactions] = useState<Array<{
    id: string
    transaction_type: string
    token_type: string
    amount: number
    description: string
    created_at: string
  }>>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadTransactions = async () => {
      try {
        const res = await fetch("/api/teen/tokens?type=transactions&limit=50")
        const data = await res.json()
        if (data.transactions) setTransactions(data.transactions)
      } catch (err) {
        console.error("Error loading transactions:", err)
      } finally {
        setLoading(false)
      }
    }
    loadTransactions()
  }, [])

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-6 h-6 text-teal animate-spin" />
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="bg-card rounded-xl border border-ink overflow-hidden"
    >
      {transactions.length > 0 ? (
        <div className="divide-y divide-zinc-800">
          {transactions.map((tx) => (
            <div key={tx.id} className="p-4 flex items-center justify-between hover:bg-card">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center
                  ${tx.amount > 0 ? "bg-lime/20" : "bg-destructive/20"}`}
                >
                  {tx.amount > 0 ? (
                    <ArrowDownLeft className="w-5 h-5 text-lime" />
                  ) : (
                    <ArrowUpRight className="w-5 h-5 text-destructive" />
                  )}
                </div>
                <div>
                  <p className="text-ink">{tx.description || tx.transaction_type}</p>
                  <div className="flex items-center gap-2 text-xs text-mute">
                    <span>{tx.token_type}</span>
                    <span>•</span>
                    <span>{new Date(tx.created_at).toLocaleString("fr-FR")}</span>
                  </div>
                </div>
              </div>
              <span className={`text-lg font-bold ${tx.amount > 0 ? "text-lime" : "text-destructive"}`}>
                {tx.amount > 0 ? "+" : ""}{tx.amount}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-8 text-center">
          <History className="w-12 h-12 text-mute mx-auto mb-4" />
          <p className="text-mute">Aucune transaction</p>
        </div>
      )}
    </motion.div>
  )
}

// Transfer Tab
function TransferTab({ onTransferComplete }: { onTransferComplete: () => void }) {
  const [username, setUsername] = useState("")
  const [amount, setAmount] = useState("")
  const [message, setMessage] = useState("")
  const [transferring, setTransferring] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)

  const handleTransfer = async () => {
    if (!username.trim() || !amount) return

    setTransferring(true)
    setResult(null)

    try {
      const res = await fetch("/api/teen/tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "transfer",
          receiver_username: username.trim(),
          amount: parseInt(amount),
          message: message.trim() || undefined,
        }),
      })

      const data = await res.json()

      if (data.success) {
        setResult({ success: true, message: `${amount} tokens envoyés à @${username}!` })
        setUsername("")
        setAmount("")
        setMessage("")
        onTransferComplete()
      } else {
        setResult({ success: false, message: data.error || "Erreur lors du transfert" })
      }
    } catch (err) {
      setResult({ success: false, message: "Erreur de connexion" })
    } finally {
      setTransferring(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="bg-card rounded-xl border border-ink p-6"
    >
      <h3 className="font-semibold text-ink mb-4 flex items-center gap-2">
        <Send className="w-5 h-5 text-teal" />
        Envoyer des tokens
      </h3>

      <div className="space-y-4">
        <div>
          <label className="block text-sm text-mute mb-2">Destinataire</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="@username"
            className="w-full bg-card rounded-lg px-4 py-3 text-ink
              placeholder:text-mute border border-ink focus:border-teal
              focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-sm text-mute mb-2">Montant</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="100"
            min="10"
            className="w-full bg-card rounded-lg px-4 py-3 text-ink
              placeholder:text-mute border border-ink focus:border-teal
              focus:outline-none"
          />
          <p className="text-xs text-mute mt-1">Minimum: 10 tokens</p>
        </div>

        <div>
          <label className="block text-sm text-mute mb-2">Message (optionnel)</label>
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Merci pour ton aide!"
            className="w-full bg-card rounded-lg px-4 py-3 text-ink
              placeholder:text-mute border border-ink focus:border-teal
              focus:outline-none"
          />
        </div>

        {result && (
          <div className={`p-3 rounded-lg flex items-center gap-2
            ${result.success ? "bg-lime/20 text-lime" : "bg-destructive/20 text-destructive"}`}
          >
            {result.success ? (
              <CheckCircle className="w-5 h-5" />
            ) : (
              <XCircle className="w-5 h-5" />
            )}
            <span>{result.message}</span>
          </div>
        )}

        <button
          onClick={handleTransfer}
          disabled={transferring || !username.trim() || !amount || parseInt(amount) < 10}
          className="w-full py-3 bg-gradient-to-r from-teal to-teal rounded-lg
            text-ink font-medium hover:opacity-90 disabled:opacity-50
            disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
        >
          {transferring ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              <Send className="w-5 h-5" />
              Envoyer
            </>
          )}
        </button>
      </div>
    </motion.div>
  )
}

// Widget compact pour dashboard
export function TokenBalanceWidget() {
  const [balances, setBalances] = useState<{
    regular: number
    premium: number
    seasonal: number
  } | null>(null)

  useEffect(() => {
    const loadBalances = async () => {
      try {
        const res = await fetch("/api/teen/tokens?type=balances")
        const data = await res.json()
        if (data.balances) setBalances(data.balances)
      } catch (err) {
        console.error("Error loading balances:", err)
      }
    }
    loadBalances()
  }, [])

  return (
    <div className="bg-card rounded-xl border border-ink p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-ink flex items-center gap-2">
          <Wallet className="w-5 h-5 text-teal" />
          Mes Tokens
        </h3>
        <a href="/wallet" className="text-sm text-teal hover:underline">
          Voir tout
        </a>
      </div>

      {balances ? (
        <div className="flex items-center justify-around">
          <div className="text-center">
            <Coins className="w-5 h-5 text-gold mx-auto mb-1" />
            <p className="text-lg font-bold text-ink">{balances.regular}</p>
            <p className="text-xs text-mute">Tokens</p>
          </div>
          <div className="w-px h-10 bg-muted" />
          <div className="text-center">
            <Gem className="w-5 h-5 text-pink mx-auto mb-1" />
            <p className="text-lg font-bold text-ink">{balances.premium}</p>
            <p className="text-xs text-mute">Premium</p>
          </div>
          <div className="w-px h-10 bg-muted" />
          <div className="text-center">
            <Sparkles className="w-5 h-5 text-pink mx-auto mb-1" />
            <p className="text-lg font-bold text-ink">{balances.seasonal}</p>
            <p className="text-xs text-mute">Saison</p>
          </div>
        </div>
      ) : (
        <div className="flex justify-center py-4">
          <Loader2 className="w-5 h-5 text-mute animate-spin" />
        </div>
      )}
    </div>
  )
}
