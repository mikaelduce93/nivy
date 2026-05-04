"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Gift, Zap, Star, Lock, Check, ShoppingBag, Crown, Sparkles, Clock, ArrowRight, Flame } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"

// Static rewards data
const FEATURED_REWARDS = [
  { 
    id: "headphones", 
    name: "Casque Gaming Pro", 
    description: "Casque sans fil avec son surround 7.1",
    image: "🎧", 
    xpCost: 5000, 
    category: "tech",
    stock: 5,
    featured: true
  },
  { 
    id: "gift-card", 
    name: "Carte Cadeau 100 DH", 
    description: "À utiliser dans nos partenaires",
    image: "🎁", 
    xpCost: 2000, 
    category: "gift",
    stock: 20,
    featured: true
  },
]

const REWARDS = [
  { id: "avatar-pack", name: "Pack Avatars Premium", image: "👤", xpCost: 500, category: "digital", stock: -1 },
  { id: "skin-badge", name: "Badge Exclusif", image: "🏅", xpCost: 300, category: "digital", stock: -1 },
  { id: "theme-dark", name: "Thème Dark Mode Pro", image: "🌙", xpCost: 400, category: "digital", stock: -1 },
  { id: "stickers", name: "Pack Stickers", image: "😎", xpCost: 200, category: "digital", stock: -1 },
  { id: "tshirt", name: "T-Shirt Exclusif", image: "👕", xpCost: 1500, category: "physical", stock: 10 },
  { id: "cap", name: "Casquette Teen", image: "🧢", xpCost: 1000, category: "physical", stock: 15 },
  { id: "notebook", name: "Carnet Premium", image: "📓", xpCost: 600, category: "physical", stock: 25 },
  { id: "water-bottle", name: "Gourde Sport", image: "🍶", xpCost: 800, category: "physical", stock: 30 },
]

const MY_REWARDS = [
  { id: "badge-bronze", name: "Badge Bronze", image: "🥉", claimedAt: "2024-01-15", type: "achievement" },
  { id: "skin-1", name: "Skin Avatar Fire", image: "🔥", claimedAt: "2024-01-10", type: "digital" },
]

const CATEGORIES = [
  { id: "all", label: "Tous" },
  { id: "digital", label: "Digital" },
  { id: "physical", label: "Physique" },
  { id: "gift", label: "Cartes" },
]

export default function RewardsPage() {
  const [category, setCategory] = useState("all")

  // Mock user data
  const userXP = 2450
  const userCoins = 350

  const filteredRewards = category === "all" 
    ? REWARDS 
    : REWARDS.filter(r => r.category === category)

  return (
    <div className="min-h-screen pb-32 space-y-8 pt-6">
      {/* Header */}
      <header className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center">
                <Gift className="w-6 h-6 text-black" />
              </div>
              <div>
                <h1 className="text-4xl font-black tracking-tighter uppercase italic">Récompenses</h1>
                <p className="text-zinc-500 text-sm font-medium">Échange tes XP contre des prix</p>
              </div>
            </div>
          </div>

          {/* Balance */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gen-z-lavender/10 border border-gen-z-lavender/30">
              <Zap className="w-5 h-5 text-gen-z-lavender" />
              <span className="font-black text-gen-z-lavender">{userXP.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Progress to next tier */}
        <div className="p-6 rounded-3xl bg-gradient-to-br from-yellow-500/10 to-amber-500/5 border border-yellow-500/20">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Crown className="w-6 h-6 text-yellow-500" />
              <div>
                <h3 className="font-bold text-white">Niveau VIP</h3>
                <p className="text-sm text-zinc-400">5000 XP pour débloquer les récompenses Premium</p>
              </div>
            </div>
            <span className="text-sm text-yellow-500 font-bold">{Math.round((userXP / 5000) * 100)}%</span>
          </div>
          <Progress value={(userXP / 5000) * 100} className="h-3" />
        </div>
      </header>

      {/* Featured Rewards */}
      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <Sparkles className="w-5 h-5 text-yellow-500" />
          <h2 className="text-xl font-black uppercase">À la Une</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {FEATURED_REWARDS.map((reward, idx) => (
            <motion.div
              key={reward.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="relative overflow-hidden p-6 rounded-3xl bg-gradient-to-br from-gen-z-lavender/10 to-purple-500/5 border border-gen-z-lavender/20"
            >
              <div className="absolute top-4 right-4 px-3 py-1 rounded-full bg-yellow-500/20 text-yellow-500 text-xs font-black uppercase">
                Limité
              </div>

              <div className="flex items-center gap-6">
                <div className="w-24 h-24 rounded-3xl bg-white/10 flex items-center justify-center text-5xl">
                  {reward.image}
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-black text-white">{reward.name}</h3>
                  <p className="text-sm text-zinc-400 mt-1">{reward.description}</p>
                  <div className="flex items-center justify-between mt-4">
                    <div className="flex items-center gap-2">
                      <Zap className="w-5 h-5 text-gen-z-lavender" />
                      <span className="font-black text-xl text-gen-z-lavender">{reward.xpCost.toLocaleString()}</span>
                    </div>
                    {reward.stock > 0 && (
                      <span className="text-xs text-zinc-500">{reward.stock} restants</span>
                    )}
                  </div>
                </div>
              </div>

              <Button 
                className={cn(
                  "w-full mt-4 font-bold",
                  userXP >= reward.xpCost 
                    ? "bg-gen-z-lavender text-black" 
                    : "bg-zinc-800 text-zinc-500"
                )}
                disabled={userXP < reward.xpCost}
              >
                {userXP >= reward.xpCost ? "Échanger" : `${reward.xpCost - userXP} XP manquants`}
              </Button>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Categories */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setCategory(cat.id)}
            className={cn(
              "px-4 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap",
              category === cat.id
                ? "bg-white text-black"
                : "bg-zinc-900/50 text-zinc-400 hover:text-white hover:bg-zinc-800/50"
            )}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* All Rewards Grid */}
      <section className="space-y-4">
        <h2 className="text-xl font-black uppercase">Catalogue</h2>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredRewards.map((reward, idx) => {
            const canAfford = userXP >= reward.xpCost
            
            return (
              <motion.div
                key={reward.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                whileHover={{ scale: 1.02, y: -4 }}
                className={cn(
                  "relative p-6 rounded-3xl border transition-all cursor-pointer",
                  canAfford 
                    ? "bg-zinc-900/50 border-white/5 hover:border-gen-z-lavender/50" 
                    : "bg-zinc-900/30 border-white/5 opacity-60"
                )}
              >
                {!canAfford && (
                  <div className="absolute top-3 right-3">
                    <Lock className="w-4 h-4 text-zinc-500" />
                  </div>
                )}

                <div className="text-5xl mb-4 text-center">{reward.image}</div>
                <h4 className="font-bold text-white text-center mb-2">{reward.name}</h4>
                
                <div className="flex items-center justify-center gap-2">
                  <Zap className="w-4 h-4 text-gen-z-lavender" />
                  <span className="font-black text-gen-z-lavender">{reward.xpCost.toLocaleString()}</span>
                </div>

                {reward.stock > 0 && reward.stock < 20 && (
                  <p className="text-xs text-zinc-500 text-center mt-2">{reward.stock} restants</p>
                )}
              </motion.div>
            )
          })}
        </div>
      </section>

      {/* My Rewards */}
      <section className="space-y-4">
        <h2 className="text-xl font-black uppercase">Mes Récompenses</h2>

        {MY_REWARDS.length === 0 ? (
          <div className="text-center py-12">
            <Gift className="w-16 h-16 text-zinc-700 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Aucune récompense</h3>
            <p className="text-zinc-500">Échange tes XP pour obtenir des récompenses!</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {MY_REWARDS.map((reward, idx) => (
              <motion.div
                key={reward.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.05 }}
                className="p-4 rounded-2xl bg-gen-z-mint/10 border border-gen-z-mint/30 text-center"
              >
                <div className="text-4xl mb-3">{reward.image}</div>
                <h4 className="font-bold text-white text-sm">{reward.name}</h4>
                <div className="flex items-center justify-center gap-1 mt-2 text-gen-z-mint">
                  <Check className="w-4 h-4" />
                  <span className="text-xs font-bold">Obtenu</span>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </section>

      {/* CTA */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="p-6 rounded-3xl bg-gradient-to-r from-gen-z-coral/10 to-pink-500/5 border border-gen-z-coral/20"
      >
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 rounded-2xl bg-gen-z-coral/20 flex items-center justify-center">
            <Flame className="w-8 h-8 text-gen-z-coral" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-black text-white">Gagne plus d'XP!</h3>
            <p className="text-sm text-zinc-400">Complete des quêtes et défis pour débloquer plus de récompenses</p>
          </div>
          <Button className="bg-gen-z-coral text-black font-bold">
            Voir les quêtes
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </motion.div>
    </div>
  )
}
