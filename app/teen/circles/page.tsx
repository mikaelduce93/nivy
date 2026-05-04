"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Shield, Users, Swords, Crown, Zap, Trophy, MessageCircle, Search, Plus, Star, TrendingUp, Target, UserPlus } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"

// Static circles/crews data
const MY_CREW = {
  id: "alpha-squad",
  name: "Alpha Squad",
  emoji: "🦁",
  tier: "Gold",
  members: [
    { id: "1", name: "Toi", role: "Leader", xp: 2450, avatar: null, isOwner: true },
    { id: "2", name: "Salma K.", role: "Co-Leader", xp: 4250, avatar: null },
    { id: "3", name: "Omar B.", role: "Membre", xp: 3820, avatar: null },
    { id: "4", name: "Nadia L.", role: "Membre", xp: 3650, avatar: null },
    { id: "5", name: "Youssef M.", role: "Membre", xp: 3420, avatar: null },
  ],
  stats: {
    totalXp: 17590,
    battlesWon: 12,
    battlesLost: 3,
    cityRank: 8,
    weeklyXp: 2450,
  },
  activeBattles: [
    { id: "b1", opponent: "Night Wolves", status: "in_progress", ourScore: 1250, theirScore: 980, endsIn: "2h 30m" },
  ],
}

const DISCOVER_CREWS = [
  { id: "c1", name: "Night Wolves", emoji: "🐺", members: 8, tier: "Gold", weeklyXp: 3200, rank: 5 },
  { id: "c2", name: "Phoenix Rising", emoji: "🔥", members: 6, tier: "Silver", weeklyXp: 2100, rank: 12 },
  { id: "c3", name: "Thunder Squad", emoji: "⚡", members: 5, tier: "Bronze", weeklyXp: 1500, rank: 25 },
  { id: "c4", name: "Diamond Team", emoji: "💎", members: 7, tier: "Platinum", weeklyXp: 4500, rank: 2 },
]

const TIER_CONFIG = {
  Bronze: { color: "from-amber-700 to-amber-800", border: "border-amber-700/30" },
  Silver: { color: "from-zinc-400 to-zinc-500", border: "border-zinc-400/30" },
  Gold: { color: "from-yellow-500 to-amber-500", border: "border-yellow-500/30" },
  Platinum: { color: "from-purple-500 to-pink-500", border: "border-purple-500/30" },
}

export default function CirclesPage() {
  const [tab, setTab] = useState<"crew" | "discover">("crew")
  const [searchQuery, setSearchQuery] = useState("")

  const hasCrew = MY_CREW !== null
  const tierConfig = TIER_CONFIG[MY_CREW.tier as keyof typeof TIER_CONFIG]

  const filteredCrews = DISCOVER_CREWS.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="min-h-screen pb-32 space-y-8 pt-6">
      {/* Header */}
      <header className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-gen-z-coral to-pink-500 flex items-center justify-center">
                <Shield className="w-6 h-6 text-black" />
              </div>
              <div>
                <h1 className="text-4xl font-black tracking-tighter uppercase italic">Circles</h1>
                <p className="text-zinc-500 text-sm font-medium">Tes crews et communautés</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setTab("crew")}
            className={cn(
              "px-4 py-2 rounded-xl font-bold text-sm transition-all",
              tab === "crew"
                ? "bg-gen-z-coral text-black"
                : "bg-zinc-900/50 text-zinc-400 hover:text-white"
            )}
          >
            Ma Crew
          </button>
          <button
            onClick={() => setTab("discover")}
            className={cn(
              "px-4 py-2 rounded-xl font-bold text-sm transition-all",
              tab === "discover"
                ? "bg-gen-z-coral text-black"
                : "bg-zinc-900/50 text-zinc-400 hover:text-white"
            )}
          >
            Découvrir
          </button>
        </div>
      </header>

      {tab === "crew" ? (
        hasCrew ? (
          <>
            {/* Crew Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className={cn(
                "relative overflow-hidden rounded-3xl p-8 border bg-gradient-to-br from-gen-z-coral/10 to-pink-500/5",
                tierConfig.border
              )}
            >
              <div className="absolute top-4 right-4">
                <div className={cn(
                  "px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider",
                  `bg-gradient-to-r ${tierConfig.color} text-black`
                )}>
                  {MY_CREW.tier} Tier
                </div>
              </div>

              <div className="flex items-center gap-6 mb-8">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-gen-z-coral to-pink-500 flex items-center justify-center">
                  <span className="text-4xl">{MY_CREW.emoji}</span>
                </div>
                <div>
                  <h2 className="text-3xl font-black text-white">{MY_CREW.name}</h2>
                  <p className="text-zinc-400">{MY_CREW.members.length} membres • Active now</p>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-4 gap-4 mb-8">
                <div className="text-center p-4 rounded-2xl bg-black/20">
                  <p className="text-2xl font-black text-gen-z-coral">{MY_CREW.stats.totalXp.toLocaleString()}</p>
                  <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Total XP</p>
                </div>
                <div className="text-center p-4 rounded-2xl bg-black/20">
                  <p className="text-2xl font-black text-gen-z-mint">{MY_CREW.stats.battlesWon}</p>
                  <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Victoires</p>
                </div>
                <div className="text-center p-4 rounded-2xl bg-black/20">
                  <p className="text-2xl font-black text-gen-z-lavender">#{MY_CREW.stats.cityRank}</p>
                  <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Rang City</p>
                </div>
                <div className="text-center p-4 rounded-2xl bg-black/20">
                  <p className="text-2xl font-black text-yellow-500">+{MY_CREW.stats.weeklyXp}</p>
                  <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Cette semaine</p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-4">
                <Button className="flex-1 bg-gen-z-coral text-black font-bold">
                  <Swords className="w-4 h-4 mr-2" />
                  Lancer un Battle
                </Button>
                <Button variant="outline" className="flex-1">
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Chat Crew
                </Button>
              </div>
            </motion.div>

            {/* Active Battles */}
            {MY_CREW.activeBattles.length > 0 && (
              <section className="space-y-4">
                <h2 className="text-xl font-black uppercase">Battles en cours</h2>

                {MY_CREW.activeBattles.map((battle) => (
                  <motion.div
                    key={battle.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-6 rounded-3xl bg-gradient-to-r from-orange-500/10 to-red-500/5 border border-orange-500/20"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-xs font-bold text-orange-500 uppercase tracking-wider">En cours</span>
                      <span className="text-sm text-zinc-400">Termine dans {battle.endsIn}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="text-center">
                        <p className="text-4xl font-black text-gen-z-coral">{battle.ourScore}</p>
                        <p className="text-sm text-zinc-400 mt-1">{MY_CREW.name}</p>
                      </div>
                      <div className="text-3xl font-black text-zinc-600">VS</div>
                      <div className="text-center">
                        <p className="text-4xl font-black text-white">{battle.theirScore}</p>
                        <p className="text-sm text-zinc-400 mt-1">{battle.opponent}</p>
                      </div>
                    </div>

                    {battle.ourScore > battle.theirScore && (
                      <p className="text-center text-gen-z-mint font-bold mt-4">Tu gagnes! Continue comme ça!</p>
                    )}
                  </motion.div>
                ))}
              </section>
            )}

            {/* Members */}
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-black uppercase">Membres</h2>
                <Button variant="outline" size="sm">
                  <UserPlus className="w-4 h-4 mr-2" />
                  Inviter
                </Button>
              </div>

              <div className="space-y-3">
                {MY_CREW.members.map((member, idx) => (
                  <motion.div
                    key={member.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="flex items-center gap-4 p-4 rounded-2xl bg-zinc-900/50 border border-white/5"
                  >
                    <div className="relative">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gen-z-lavender to-gen-z-sky flex items-center justify-center text-lg font-bold text-white">
                        {member.name.charAt(0)}
                      </div>
                      {member.isOwner && (
                        <Crown className="absolute -top-1 -right-1 w-5 h-5 text-yellow-500 fill-current" />
                      )}
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-white">{member.name}</h4>
                        <span className={cn(
                          "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase",
                          member.role === "Leader" ? "bg-yellow-500/20 text-yellow-500" :
                          member.role === "Co-Leader" ? "bg-gen-z-lavender/20 text-gen-z-lavender" :
                          "bg-zinc-800 text-zinc-400"
                        )}>
                          {member.role}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 text-gen-z-lavender">
                      <Zap className="w-4 h-4" />
                      <span className="font-bold">{member.xp.toLocaleString()}</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </section>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-gen-z-coral/20 to-pink-500/20 flex items-center justify-center mb-6 border border-gen-z-coral/30">
              <Shield className="w-12 h-12 text-gen-z-coral" />
            </div>
            <h3 className="text-2xl font-black text-white mb-2">Pas encore de Crew</h3>
            <p className="text-zinc-500 max-w-sm mb-8">Rejoins ou crée une crew pour participer aux battles et gagner des bonus XP!</p>
            <div className="flex gap-4">
              <Button className="bg-gen-z-coral text-black font-bold">
                <Shield className="w-4 h-4 mr-2" />
                Créer une Crew
              </Button>
              <Button variant="outline">
                <Search className="w-4 h-4 mr-2" />
                Trouver une Crew
              </Button>
            </div>
          </div>
        )
      ) : (
        <>
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher une crew..."
              className="pl-12 h-12 rounded-xl bg-zinc-900/50 border-white/10"
            />
          </div>

          {/* Discover Crews */}
          <section className="space-y-4">
            <h2 className="text-xl font-black uppercase">Crews populaires</h2>

            <div className="space-y-4">
              {filteredCrews.map((crew, idx) => {
                const tierCfg = TIER_CONFIG[crew.tier as keyof typeof TIER_CONFIG]
                
                return (
                  <motion.div
                    key={crew.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className={cn(
                      "p-6 rounded-3xl border transition-all cursor-pointer hover:border-white/20",
                      "bg-zinc-900/50 border-white/5"
                    )}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-gen-z-coral to-pink-500 flex items-center justify-center">
                        <span className="text-3xl">{crew.emoji}</span>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="font-black text-lg text-white">{crew.name}</h3>
                          <span className={cn(
                            "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-gradient-to-r",
                            tierCfg.color
                          )}>
                            {crew.tier}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-zinc-400">
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {crew.members} membres
                          </span>
                          <span className="flex items-center gap-1">
                            <Trophy className="w-3 h-3" />
                            Rang #{crew.rank}
                          </span>
                          <span className="flex items-center gap-1 text-gen-z-lavender">
                            <Zap className="w-3 h-3" />
                            +{crew.weeklyXp}/sem
                          </span>
                        </div>
                      </div>
                      <Button>Rejoindre</Button>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </section>

          {/* Create Crew CTA */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-6 rounded-3xl bg-gradient-to-r from-gen-z-coral/10 to-pink-500/5 border border-gen-z-coral/20"
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gen-z-coral/20 flex items-center justify-center">
                <Plus className="w-7 h-7 text-gen-z-coral" />
              </div>
              <div className="flex-1">
                <h3 className="font-black text-white">Crée ta propre Crew!</h3>
                <p className="text-sm text-zinc-400">Invite tes amis et domine le classement</p>
              </div>
              <Button className="bg-gen-z-coral text-black font-bold">
                Créer
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </div>
  )
}
