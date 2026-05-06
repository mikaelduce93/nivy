"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Coins, Zap, TrendingUp, TrendingDown, ShoppingBag, Gift, Flame, Star, ArrowUpRight, ArrowDownRight, Clock, Filter } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"

// TODO(data): /api/teen/wallet returns balance only. Full transaction history endpoint
// (xp_transactions / coin_transactions filtered for teen) is not exposed. See report.
const TRANSACTIONS = [
  { id: 1, type: "earned", reason: "Quiz Math complété", amount: 50, time: "Il y a 2h", category: "quiz" },
  { id: 2, type: "earned", reason: "Streak bonus 7 jours", amount: 100, time: "Il y a 3h", category: "streak" },
  { id: 3, type: "spent", reason: "Avatar Premium", amount: -200, time: "Hier", category: "shop" },
  { id: 4, type: "earned", reason: "Défi physique", amount: 30, time: "Hier", category: "challenge" },
  { id: 5, type: "earned", reason: "Event Gaming Night", amount: 150, time: "Il y a 2 jours", category: "event" },
  { id: 6, type: "spent", reason: "Badge Exclusif", amount: -100, time: "Il y a 3 jours", category: "shop" },
  { id: 7, type: "earned", reason: "Roue de la fortune", amount: 75, time: "Il y a 3 jours", category: "luck" },
  { id: 8, type: "earned", reason: "Connexion quotidienne", amount: 10, time: "Il y a 4 jours", category: "daily" },
]

const EARN_METHODS = [
  { id: "quiz", name: "Quiz", icon: "🧠", avgCoins: "50-150", description: "Complète des quiz" },
  { id: "challenge", name: "Défis", icon: "💪", avgCoins: "30-100", description: "Défis physiques" },
  { id: "streak", name: "Streak", icon: "🔥", avgCoins: "10-200", description: "Jours consécutifs" },
  { id: "event", name: "Events", icon: "🎉", avgCoins: "100-500", description: "Participe aux events" },
  { id: "wheel", name: "Roue", icon: "🎰", avgCoins: "5-500", description: "Tente ta chance" },
]

const FILTERS = [
  { id: "all", label: "Tout" },
  { id: "earned", label: "Gagnés" },
  { id: "spent", label: "Dépensés" },
]

export default function CoinsPage() {
  const [filter, setFilter] = useState("all")

  // Mock user data
  const totalCoins = 1250
  const earnedThisWeek = 435
  const spentThisWeek = 300
  const level = 5
  const nextLevelCoins = 2000
  const progressToNext = (totalCoins / nextLevelCoins) * 100

  const filteredTransactions = filter === "all" 
    ? TRANSACTIONS 
    : TRANSACTIONS.filter(t => t.type === filter)

  return (
    <div className="min-h-screen pb-32 space-y-8 pt-6">
      {/* Header */}
      <header className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-yellow-500 to-amber-500 flex items-center justify-center">
                <Coins className="w-6 h-6 text-black" />
              </div>
              <div>
                <h1 className="text-4xl font-black tracking-tighter uppercase italic">Mes Coins</h1>
                <p className="text-zinc-500 text-sm font-medium">Ta monnaie virtuelle</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Balance Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative overflow-hidden rounded-3xl p-8 border border-yellow-500/20 bg-gradient-to-br from-yellow-500/10 to-amber-500/5"
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-yellow-500/10 rounded-full blur-[100px]" />
        
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-8">
            <div>
              <p className="text-sm text-zinc-400 uppercase tracking-wider font-bold">Solde Total</p>
              <div className="flex items-baseline gap-3 mt-2">
                <span className="text-6xl font-black text-yellow-500">{totalCoins.toLocaleString()}</span>
                <span className="text-xl text-zinc-500">coins</span>
              </div>
            </div>
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-yellow-500 to-amber-500 flex items-center justify-center">
              <Coins className="w-10 h-10 text-black" />
            </div>
          </div>

          {/* Weekly Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-black/20">
              <div className="flex items-center gap-2 mb-2">
                <ArrowUpRight className="w-5 h-5 text-gen-z-mint" />
                <span className="text-sm text-zinc-400">Cette semaine</span>
              </div>
              <p className="text-2xl font-black text-gen-z-mint">+{earnedThisWeek}</p>
              <p className="text-xs text-zinc-500">coins gagnés</p>
            </div>
            <div className="p-4 rounded-2xl bg-black/20">
              <div className="flex items-center gap-2 mb-2">
                <ArrowDownRight className="w-5 h-5 text-gen-z-coral" />
                <span className="text-sm text-zinc-400">Dépensés</span>
              </div>
              <p className="text-2xl font-black text-gen-z-coral">-{spentThisWeek}</p>
              <p className="text-xs text-zinc-500">coins utilisés</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Level Progress */}
      <div className="p-6 rounded-3xl bg-zinc-900/50 border border-white/5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gen-z-lavender/20 flex items-center justify-center">
              <Star className="w-5 h-5 text-gen-z-lavender" />
            </div>
            <div>
              <h3 className="font-bold text-white">Niveau {level}</h3>
              <p className="text-sm text-zinc-400">{nextLevelCoins - totalCoins} coins pour niveau {level + 1}</p>
            </div>
          </div>
          <span className="text-sm text-gen-z-lavender font-bold">{Math.round(progressToNext)}%</span>
        </div>
        <Progress value={progressToNext} className="h-3" />
      </div>

      {/* Ways to Earn */}
      <section className="space-y-4">
        <h2 className="text-xl font-black uppercase">Comment gagner des coins</h2>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {EARN_METHODS.map((method, idx) => (
            <motion.div
              key={method.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              whileHover={{ scale: 1.05, y: -4 }}
              className="p-4 rounded-2xl bg-zinc-900/50 border border-white/5 hover:border-yellow-500/30 transition-all cursor-pointer text-center"
            >
              <div className="text-4xl mb-3">{method.icon}</div>
              <h4 className="font-bold text-white text-sm">{method.name}</h4>
              <p className="text-xs text-yellow-500 font-bold mt-1">{method.avgCoins}</p>
              <p className="text-[10px] text-zinc-500 mt-1">{method.description}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Filters */}
      <div className="flex items-center gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={cn(
              "px-4 py-2 rounded-xl font-bold text-sm transition-all",
              filter === f.id
                ? "bg-yellow-500 text-black"
                : "bg-zinc-900/50 text-zinc-400 hover:text-white"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Transactions */}
      <section className="space-y-4">
        <h2 className="text-xl font-black uppercase">Historique</h2>

        <div className="space-y-3">
          {filteredTransactions.map((tx, idx) => (
            <motion.div
              key={tx.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="flex items-center gap-4 p-4 rounded-2xl bg-zinc-900/50 border border-white/5"
            >
              <div className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center",
                tx.type === "earned" ? "bg-gen-z-mint/20" : "bg-gen-z-coral/20"
              )}>
                {tx.type === "earned" ? (
                  <TrendingUp className="w-6 h-6 text-gen-z-mint" />
                ) : (
                  <ShoppingBag className="w-6 h-6 text-gen-z-coral" />
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-white truncate">{tx.reason}</h4>
                <span className="text-xs text-zinc-500">{tx.time}</span>
              </div>

              <span className={cn(
                "font-black text-lg",
                tx.type === "earned" ? "text-gen-z-mint" : "text-gen-z-coral"
              )}>
                {tx.type === "earned" ? "+" : ""}{tx.amount}
              </span>
            </motion.div>
          ))}
        </div>

        {filteredTransactions.length === 0 && (
          <div className="text-center py-12">
            <Coins className="w-16 h-16 text-zinc-700 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Aucune transaction</h3>
            <p className="text-zinc-500">Rien à afficher pour ce filtre</p>
          </div>
        )}
      </section>

      {/* CTAs */}
      <div className="flex gap-4">
        <Button className="flex-1 h-14 bg-yellow-500 text-black font-bold hover:bg-yellow-400">
          <Gift className="w-5 h-5 mr-2" />
          Dépenser
        </Button>
        <Button variant="outline" className="flex-1 h-14">
          <Zap className="w-5 h-5 mr-2" />
          Gagner plus
        </Button>
      </div>
    </div>
  )
}
