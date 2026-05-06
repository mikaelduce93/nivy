"use client"

import { motion } from "framer-motion"
import { Crown, Zap, Star, Lock, Check, Gift, Sparkles, Shield, TrendingUp, Users, Calendar, Percent } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

// VIP tier visual catalogue + benefit copy. The XP thresholds and active tier
// are resolved against the live VIP backend below.
// TODO(data): expose vip_tier benefits + perks usage stats via the API so this
// catalogue can be replaced by real data per tier.
const VIP_TIERS = [
  {
    id: "bronze",
    name: "Bronze",
    xpRequired: 0,
    color: "from-amber-700 to-amber-800",
    borderColor: "border-amber-700/30",
    bgColor: "bg-amber-700/10",
    benefits: [
      { icon: Percent, text: "5% bonus XP" },
      { icon: Gift, text: "Accès aux récompenses basiques" },
      { icon: Star, text: "Badge Bronze" },
    ],
  },
  {
    id: "silver",
    name: "Silver",
    xpRequired: 5000,
    color: "from-zinc-400 to-zinc-500",
    borderColor: "border-zinc-400/30",
    bgColor: "bg-zinc-400/10",
    benefits: [
      { icon: Percent, text: "10% bonus XP" },
      { icon: Calendar, text: "Accès prioritaire aux events" },
      { icon: Gift, text: "Récompenses exclusives" },
      { icon: Star, text: "Badge Silver" },
    ],
  },
  {
    id: "gold",
    name: "Gold",
    xpRequired: 15000,
    color: "from-yellow-500 to-amber-500",
    borderColor: "border-yellow-500/30",
    bgColor: "bg-yellow-500/10",
    benefits: [
      { icon: Percent, text: "20% bonus XP" },
      { icon: Calendar, text: "Events VIP exclusifs" },
      { icon: Gift, text: "Récompenses premium" },
      { icon: Sparkles, text: "Spins bonus quotidiens" },
      { icon: Star, text: "Badge Gold" },
    ],
  },
  {
    id: "platinum",
    name: "Platinum",
    xpRequired: 50000,
    color: "from-purple-500 to-pink-500",
    borderColor: "border-purple-500/30",
    bgColor: "bg-purple-500/10",
    benefits: [
      { icon: Percent, text: "30% bonus XP" },
      { icon: Shield, text: "Tous les avantages" },
      { icon: Gift, text: "Prix réels exclusifs" },
      { icon: Users, text: "Coach personnel" },
      { icon: Crown, text: "Badge Platinum" },
    ],
  },
]

// TODO(data): vip_perks_used stats endpoint not implemented; keep empty.
const VIP_PERKS_USED: Array<{ id: number; perk: string; usedCount: number; icon: any }> = []

interface VipCardClientProps {
  userXP: number
  tierSlug: string
  memberSince: string | null
}

export function VipCardClient({ userXP, tierSlug, memberSince }: VipCardClientProps) {
  const currentTier = VIP_TIERS.find((t) => t.id === tierSlug) || VIP_TIERS[0]
  const nextTier =
    VIP_TIERS.find((t) => t.xpRequired > userXP) ?? VIP_TIERS[VIP_TIERS.length - 1]
  const progressToNext = nextTier.xpRequired > 0 ? Math.min(100, (userXP / nextTier.xpRequired) * 100) : 100

  return (
    <div className="min-h-screen pb-32 space-y-8 pt-6">
      {/* Header */}
      <header className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-700 to-amber-800 flex items-center justify-center">
                <Crown className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-black tracking-tighter uppercase italic">VIP Card</h1>
                <p className="text-zinc-500 text-sm font-medium">Ton statut et avantages</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Current VIP Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, rotateY: -10 }}
        animate={{ opacity: 1, scale: 1, rotateY: 0 }}
        className="relative overflow-hidden rounded-3xl p-8 border border-amber-700/30"
        style={{
          background: "linear-gradient(135deg, rgba(180, 83, 9, 0.3) 0%, rgba(146, 64, 14, 0.2) 50%, rgba(120, 53, 15, 0.3) 100%)",
        }}
      >
        {/* Shine effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-transparent pointer-events-none" />
        <div className="absolute top-0 left-1/4 w-1/2 h-32 bg-gradient-to-b from-white/5 to-transparent blur-2xl pointer-events-none" />
        
        <div className="relative z-10">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-amber-500/80 uppercase tracking-[0.2em] font-bold mb-2">Teen VIP Member</p>
              <h2 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-yellow-300 uppercase">
                {currentTier.name}
              </h2>
              <p className="text-amber-500/60 mt-2">{memberSince ? `Membre depuis ${new Date(memberSince).toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}` : "Teen Nivy"}</p>
            </div>
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-700 to-amber-800 flex items-center justify-center border-2 border-amber-600/50">
              <Crown className="w-10 h-10 text-amber-200" />
            </div>
          </div>

          {/* Card Number Style */}
          <div className="mt-8 font-mono text-2xl text-amber-300/80 tracking-widest">
            **** **** **** {Math.floor(Math.random() * 9000 + 1000)}
          </div>

          {/* XP Display */}
          <div className="mt-8 flex items-end justify-between">
            <div>
              <p className="text-xs text-amber-500/60 uppercase tracking-wider mb-1">Total XP</p>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-amber-200">{userXP.toLocaleString()}</span>
                <Zap className="w-5 h-5 text-amber-400" />
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-amber-500/60 uppercase tracking-wider mb-1">Prochain niveau</p>
              <p className="text-lg font-bold text-amber-300">{nextTier.name}</p>
            </div>
          </div>

          {/* Progress to next tier */}
          <div className="mt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-amber-400">{userXP} / {nextTier.xpRequired} XP</span>
              <span className="text-sm text-amber-400 font-bold">{Math.round(progressToNext)}%</span>
            </div>
            <div className="h-3 rounded-full bg-black/30 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progressToNext}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
                className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 rounded-full"
              />
            </div>
            <p className="text-xs text-amber-500/60 mt-2">
              {nextTier.xpRequired - userXP} XP pour atteindre {nextTier.name}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Current Benefits */}
      <section className="space-y-4">
        <h2 className="text-xl font-black uppercase">Tes Avantages Actifs</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {currentTier.benefits.map((benefit, idx) => {
            const Icon = benefit.icon
            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="flex items-center gap-4 p-4 rounded-2xl bg-gen-z-mint/10 border border-gen-z-mint/30"
              >
                <div className="w-10 h-10 rounded-xl bg-gen-z-mint/20 flex items-center justify-center">
                  <Icon className="w-5 h-5 text-gen-z-mint" />
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-white">{benefit.text}</h4>
                </div>
                <Check className="w-5 h-5 text-gen-z-mint" />
              </motion.div>
            )
          })}
        </div>
      </section>

      {/* All Tiers */}
      <section className="space-y-4">
        <h2 className="text-xl font-black uppercase">Niveaux VIP</h2>

        <div className="space-y-4">
          {VIP_TIERS.map((tier, idx) => {
            const isUnlocked = userXP >= tier.xpRequired
            const isCurrent = tier.id === currentTier.id

            return (
              <motion.div
                key={tier.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
                className={cn(
                  "p-6 rounded-3xl border transition-all",
                  isCurrent 
                    ? `bg-gradient-to-r ${tier.bgColor} ${tier.borderColor}` 
                    : isUnlocked
                      ? "bg-zinc-900/50 border-white/10"
                      : "bg-zinc-900/30 border-white/5 opacity-60"
                )}
              >
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "w-16 h-16 rounded-2xl flex items-center justify-center bg-gradient-to-br",
                    tier.color
                  )}>
                    <Crown className="w-8 h-8 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h4 className="font-black text-xl">{tier.name}</h4>
                      {isCurrent && (
                        <span className="px-2 py-0.5 rounded-full bg-gen-z-mint/20 text-gen-z-mint text-[10px] font-bold uppercase">
                          Actuel
                        </span>
                      )}
                      {!isUnlocked && (
                        <Lock className="w-4 h-4 text-zinc-500" />
                      )}
                    </div>
                    <p className="text-sm text-zinc-400">
                      {tier.xpRequired === 0 ? "Niveau de départ" : `${tier.xpRequired.toLocaleString()} XP requis`}
                    </p>
                  </div>
                  <Button 
                    variant={isCurrent ? "default" : "outline"} 
                    size="sm"
                    disabled={!isUnlocked && !isCurrent}
                  >
                    {isCurrent ? "Actif" : isUnlocked ? "Débloqué" : "Verrouillé"}
                  </Button>
                </div>

                {/* Benefits Preview */}
                <div className="flex flex-wrap gap-2 mt-4">
                  {tier.benefits.map((benefit, i) => {
                    const Icon = benefit.icon
                    return (
                      <span 
                        key={i} 
                        className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 text-xs text-zinc-400"
                      >
                        <Icon className="w-3 h-3" />
                        {benefit.text}
                      </span>
                    )
                  })}
                </div>
              </motion.div>
            )
          })}
        </div>
      </section>

      {/* Usage Stats — hidden until backend exposes vip_perks_used */}
      {VIP_PERKS_USED.length > 0 && (
      <section className="space-y-4">
        <h2 className="text-xl font-black uppercase">Utilisation</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {VIP_PERKS_USED.map((perk, idx) => {
            const Icon = perk.icon
            return (
              <motion.div
                key={perk.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="p-4 rounded-2xl bg-zinc-900/50 border border-white/5"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gen-z-lavender/20 flex items-center justify-center">
                    <Icon className="w-6 h-6 text-gen-z-lavender" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-white">{perk.perk}</h4>
                    <p className="text-sm text-zinc-400">Utilisé {perk.usedCount} fois</p>
                  </div>
                  <TrendingUp className="w-5 h-5 text-gen-z-mint" />
                </div>
              </motion.div>
            )
          })}
        </div>
      </section>
      )}

      {/* Upgrade CTA */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="p-6 rounded-3xl bg-gradient-to-r from-purple-500/10 to-pink-500/5 border border-purple-500/20"
      >
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-black text-white">Monte de niveau!</h3>
            <p className="text-sm text-zinc-400">Gagne plus d'XP pour débloquer des avantages exclusifs</p>
          </div>
          <Button className="bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold">
            Voir les quêtes
          </Button>
        </div>
      </motion.div>
    </div>
  )
}
