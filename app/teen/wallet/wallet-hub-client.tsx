"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Coins, ShoppingBag, Award, Crown, Zap, Flame, TrendingUp, Gift, Star, Lock, Check, ArrowRight, Sparkles, Loader2 } from "lucide-react"
import { HubTabs, type HubTab } from "@/components/teen/hub-tabs"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useSearchParams } from "next/navigation"
import { Progress } from "@/components/ui/progress"

interface WalletHubClientProps {
  teenId: string
  walletData: {
    xp: { total: number; level: number; progressPercent: number }
    streak: number
    coins: number
    shopHighlights: any
  }
}

const WALLET_TABS: HubTab[] = [
  { id: "coins", label: "Coins", icon: Coins },
  { id: "shop", label: "Shop", icon: ShoppingBag },
  { id: "badges", label: "Badges", icon: Award },
  { id: "vip", label: "VIP", icon: Crown },
]

export function WalletHubClient({ teenId, walletData }: WalletHubClientProps) {
  const searchParams = useSearchParams()
  const currentTab = searchParams.get("tab") || "coins"

  return (
    <div className="space-y-8 pt-6">
      {/* Header */}
      <header className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-yellow-500 to-amber-500 flex items-center justify-center">
                <Coins className="w-6 h-6 text-black" />
              </div>
              <div>
                <h1 className="text-4xl font-black tracking-tighter uppercase italic">Wallet</h1>
                <p className="text-zinc-500 text-sm font-medium">Your rewards & achievements</p>
              </div>
            </div>
          </div>

          {/* Balance */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-yellow-500/10 border border-yellow-500/30">
              <Coins className="w-5 h-5 text-yellow-500" />
              <span className="font-black text-xl text-yellow-500">{walletData.coins.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <HubTabs tabs={WALLET_TABS} defaultTab="coins" />
      </header>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
        >
          {currentTab === "coins" && <CoinsTab walletData={walletData} teenId={teenId} />}
          {currentTab === "shop" && <ShopTab teenId={teenId} />}
          {currentTab === "badges" && <BadgesTab teenId={teenId} />}
          {currentTab === "vip" && <VIPTab />}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

function CoinsTab({ walletData, teenId }: { walletData: any; teenId?: string }) {
  const [transactions, setTransactions] = useState<any[]>([])
  const [loadingTx, setLoadingTx] = useState(true)

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        const response = await fetch('/api/teen/wallet')
        if (response.ok) {
          const data = await response.json()
          setTransactions(data.transactions || [])
        }
      } catch (error) {
        console.error('Failed to fetch wallet data:', error)
      } finally {
        setLoadingTx(false)
      }
    }
    fetchTransactions()
  }, [teenId])

  return (
    <div className="space-y-8">
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
              <p className="text-sm text-zinc-400 uppercase tracking-wider font-bold">Total Balance</p>
              <div className="flex items-baseline gap-3 mt-2">
                <span className="text-6xl font-black text-yellow-500">{walletData.coins.toLocaleString()}</span>
                <span className="text-xl text-zinc-500">coins</span>
              </div>
            </div>
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-yellow-500 to-amber-500 flex items-center justify-center">
              <Coins className="w-10 h-10 text-black" />
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-black/20 text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <Zap className="w-4 h-4 text-gen-z-lavender" />
                <span className="font-black text-xl">{walletData.xp.total.toLocaleString()}</span>
              </div>
              <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Total XP</p>
            </div>
            <div className="p-4 rounded-2xl bg-black/20 text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <Flame className="w-4 h-4 text-orange-500" />
                <span className="font-black text-xl">{walletData.streak}</span>
              </div>
              <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Day Streak</p>
            </div>
            <div className="p-4 rounded-2xl bg-black/20 text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <TrendingUp className="w-4 h-4 text-gen-z-mint" />
                <span className="font-black text-xl">Lvl {walletData.xp.level}</span>
              </div>
              <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Level</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Level Progress */}
      <div className="p-6 rounded-3xl bg-zinc-900/50 border border-white/5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold">Level Progress</h3>
          <span className="text-sm text-gen-z-lavender font-bold">Level {walletData.xp.level + 1}</span>
        </div>
        <Progress value={walletData.xp.progressPercent} className="h-3" />
        <p className="text-sm text-zinc-500 mt-2">{walletData.xp.progressPercent}% to next level</p>
      </div>

      {/* Recent Activity */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold">Recent Activity</h3>
        {loadingTx ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-yellow-500" />
          </div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-8">
            <Coins className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
            <p className="text-zinc-500">No transactions yet</p>
          </div>
        ) : (
          transactions.map((tx, idx) => (
            <motion.div
              key={tx.id || idx}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="flex items-center gap-4 p-4 rounded-2xl bg-zinc-900/50 border border-white/5"
            >
              <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center",
                tx.type === "earned" ? "bg-green-500/20" : "bg-red-500/20"
              )}>
                {tx.type === "earned" ? (
                  <TrendingUp className="w-5 h-5 text-green-500" />
                ) : (
                  <ShoppingBag className="w-5 h-5 text-red-500" />
                )}
              </div>
              <div className="flex-1">
                <p className="font-medium">{tx.reason}</p>
                <p className="text-sm text-zinc-500">{tx.time}</p>
              </div>
              <span className={cn(
                "font-black",
                tx.type === "earned" ? "text-green-500" : "text-red-500"
              )}>
                {tx.type === "earned" ? "+" : ""}{tx.amount}
              </span>
            </motion.div>
          ))
        )}
      </div>
    </div>
  )
}

function ShopTab({ teenId }: { teenId?: string }) {
  const [items, setItems] = useState<any[]>([])
  const [featured, setFeatured] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchShop = async () => {
      try {
        const response = await fetch('/api/teen/shop')
        if (response.ok) {
          const data = await response.json()
          setItems(data.items || [])
          setFeatured(data.featured)
        }
      } catch (error) {
        console.error('Failed to fetch shop:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchShop()
  }, [teenId])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-gen-z-lavender" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Featured */}
      {featured && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative overflow-hidden rounded-3xl p-8 border border-gen-z-lavender/20 bg-gradient-to-br from-gen-z-lavender/10 to-gen-z-sky/5"
        >
          <div className="absolute top-4 right-4 px-3 py-1 rounded-full bg-gen-z-lavender/20 text-gen-z-lavender text-xs font-black uppercase">
            Featured
          </div>
          <div className="flex items-center gap-6">
            <div className="w-24 h-24 rounded-3xl bg-white/10 flex items-center justify-center text-5xl">
              {featured.image || '🎧'}
            </div>
            <div className="flex-1">
              <h3 className="text-2xl font-black">{featured.name}</h3>
              <p className="text-zinc-400 mt-1">{featured.description || 'Limited edition reward'}</p>
              <div className="flex items-center gap-2 mt-4">
                <Zap className="w-5 h-5 text-gen-z-lavender" />
                <span className="font-black text-xl text-gen-z-lavender">{featured.xp_cost?.toLocaleString()} XP</span>
              </div>
            </div>
            <Button className="bg-gen-z-lavender text-black font-bold">
              Unlock
            </Button>
          </div>
        </motion.div>
      )}

      {/* Items Grid */}
      {items.length === 0 ? (
        <div className="text-center py-12">
          <ShoppingBag className="w-16 h-16 text-zinc-700 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">No items available</h3>
          <p className="text-zinc-500">Check back later for new rewards!</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {items.map((item, idx) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              whileHover={{ scale: 1.02, y: -4 }}
              className="p-6 rounded-3xl bg-zinc-900/50 border border-white/5 cursor-pointer hover:border-white/20 transition-all"
            >
              <div className="text-5xl mb-4">{item.image || '🎁'}</div>
              <h4 className="font-bold text-white">{item.name}</h4>
              <p className="text-xs text-zinc-500 mb-3">{item.category}</p>
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-gen-z-lavender" />
                <span className="font-black text-gen-z-lavender">{item.xp_cost?.toLocaleString()}</span>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}

function BadgesTab({ teenId }: { teenId?: string }) {
  const [badges, setBadges] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchBadges = async () => {
      try {
        const response = await fetch('/api/teen/wallet')
        if (response.ok) {
          const data = await response.json()
          setBadges(data.badges || [])
        }
      } catch (error) {
        console.error('Failed to fetch badges:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchBadges()
  }, [teenId])

  // Combine unlocked badges with locked placeholder badges
  const allBadges = [
    ...badges.map(b => ({ ...b, unlocked: true })),
    // Placeholder locked badges
    { id: "locked-1", name: "Social Butterfly", icon: "🦋", unlocked: false, rarity: "epic" },
    { id: "locked-2", name: "Legend", icon: "👑", unlocked: false, rarity: "legendary" },
    { id: "locked-3", name: "Event King", icon: "🎉", unlocked: false, rarity: "epic" },
  ]

  const unlockedCount = badges.length
  const lockedCount = allBadges.filter(b => !b.unlocked).length

  const rarityColors = {
    common: "from-zinc-500 to-zinc-600 border-zinc-500/30",
    rare: "from-blue-500 to-cyan-500 border-blue-500/30",
    epic: "from-purple-500 to-pink-500 border-purple-500/30",
    legendary: "from-yellow-500 to-amber-500 border-yellow-500/30",
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-gen-z-lavender" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Stats */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-3 px-6 py-3 rounded-2xl bg-gen-z-mint/10 border border-gen-z-mint/20">
          <Check className="w-5 h-5 text-gen-z-mint" />
          <span className="font-bold">{unlockedCount} Unlocked</span>
        </div>
        <div className="flex items-center gap-3 px-6 py-3 rounded-2xl bg-zinc-800/50 border border-white/5">
          <Lock className="w-5 h-5 text-zinc-500" />
          <span className="font-bold text-zinc-500">{lockedCount} Locked</span>
        </div>
      </div>

      {/* Badges Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
        {allBadges.map((badge, idx) => (
          <motion.div
            key={badge.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: idx * 0.05 }}
            className={cn(
              "relative p-6 rounded-3xl border text-center transition-all",
              badge.unlocked 
                ? `bg-gradient-to-br ${rarityColors[badge.rarity as keyof typeof rarityColors] || rarityColors.common}` 
                : "bg-zinc-900/50 border-white/5 opacity-50"
            )}
          >
            {!badge.unlocked && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-3xl">
                <Lock className="w-8 h-8 text-zinc-500" />
              </div>
            )}
            <div className="text-5xl mb-4">{badge.icon || "🏆"}</div>
            <h4 className="font-bold text-white">{badge.name}</h4>
            <p className="text-xs text-zinc-400 uppercase tracking-wider mt-1">{badge.rarity || "common"}</p>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

function VIPTab() {
  const tiers = [
    { name: "Bronze", xpRequired: 0, current: true, color: "from-amber-700 to-amber-800", benefits: ["5% bonus XP", "Basic rewards access"] },
    { name: "Silver", xpRequired: 5000, current: false, color: "from-zinc-400 to-zinc-500", benefits: ["10% bonus XP", "Priority events", "Exclusive badges"] },
    { name: "Gold", xpRequired: 15000, current: false, color: "from-yellow-500 to-amber-500", benefits: ["20% bonus XP", "VIP events", "Special rewards", "Extra spins"] },
    { name: "Platinum", xpRequired: 50000, current: false, color: "from-purple-500 to-pink-500", benefits: ["30% bonus XP", "All benefits", "Real prizes", "Personal coach"] },
  ]

  return (
    <div className="space-y-6">
      {/* Current Status */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative overflow-hidden rounded-3xl p-8 border border-amber-700/30 bg-gradient-to-br from-amber-700/20 to-amber-800/10"
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-zinc-400 uppercase tracking-wider font-bold">Current Tier</p>
            <h2 className="text-4xl font-black text-amber-500 mt-2">BRONZE</h2>
            <p className="text-zinc-500 mt-2">5,000 XP to Silver</p>
          </div>
          <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-amber-700 to-amber-800 flex items-center justify-center">
            <Crown className="w-12 h-12 text-white" />
          </div>
        </div>
        <Progress value={30} className="h-3 mt-6" />
      </motion.div>

      {/* All Tiers */}
      <div className="space-y-4">
        {tiers.map((tier, idx) => (
          <motion.div
            key={tier.name}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.1 }}
            className={cn(
              "p-6 rounded-3xl border transition-all",
              tier.current 
                ? "bg-gradient-to-r from-amber-700/20 to-transparent border-amber-700/30" 
                : "bg-zinc-900/50 border-white/5"
            )}
          >
            <div className="flex items-center gap-4">
              <div className={cn(
                "w-14 h-14 rounded-2xl flex items-center justify-center bg-gradient-to-br",
                tier.color
              )}>
                <Crown className="w-7 h-7 text-white" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <h4 className="font-black text-lg">{tier.name}</h4>
                  {tier.current && (
                    <span className="px-2 py-0.5 rounded-full bg-gen-z-mint/20 text-gen-z-mint text-[10px] font-bold uppercase">
                      Current
                    </span>
                  )}
                </div>
                <p className="text-sm text-zinc-500">{tier.xpRequired.toLocaleString()} XP required</p>
              </div>
              <Button variant={tier.current ? "default" : "outline"} size="sm">
                {tier.current ? "Active" : "View"}
              </Button>
            </div>
            
            {/* Benefits */}
            <div className="flex flex-wrap gap-2 mt-4">
              {tier.benefits.map((benefit, i) => (
                <span key={i} className="px-3 py-1 rounded-full bg-white/5 text-xs text-zinc-400">
                  {benefit}
                </span>
              ))}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
