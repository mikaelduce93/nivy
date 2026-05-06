"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Shield, Users, Crown, Zap, Trophy, MessageCircle, Search, Plus, UserPlus } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

type Member = {
  user_id: string
  pseudo: string
  avatar_url: string | null
  level: number
  role: "owner" | "admin" | "member"
  xp_contributed: number
}

type UserCrewData = {
  has_crew: boolean
  crew?: {
    id: string
    name: string
    slug: string
    description: string | null
    color: string
    badge_icon: string
    total_xp: number
    total_events_attended: number
    total_challenges_won: number
    average_level: number
  }
  user_role?: "owner" | "admin" | "member"
  members?: Member[]
}

type DiscoverCrew = {
  id: string
  name: string
  description: string | null
  color: string
  badge_icon: string
  total_xp: number
  average_level: number
  max_members: number
}

type LeaderboardEntry = {
  crew_id: string
  rank?: number
  position?: number
  total_xp?: number
  weekly_xp?: number
}

interface Props {
  myCrew: UserCrewData | null
  discoverCrews: DiscoverCrew[]
  leaderboard: LeaderboardEntry[]
}

export function CirclesPageClient({ myCrew, discoverCrews, leaderboard }: Props) {
  const [tab, setTab] = useState<"crew" | "discover">("crew")
  const [searchQuery, setSearchQuery] = useState("")

  const hasCrew = !!myCrew?.has_crew && !!myCrew.crew
  const crew = myCrew?.crew
  const members = myCrew?.members || []

  // Find rank from leaderboard if present
  const myRank = crew ? leaderboard.find((l) => l.crew_id === crew.id)?.rank ?? leaderboard.find((l) => l.crew_id === crew.id)?.position ?? null : null

  const filteredCrews = discoverCrews.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="min-h-screen pb-32 space-y-8 pt-6">
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

        <div className="flex items-center gap-2">
          <button
            onClick={() => setTab("crew")}
            className={cn(
              "px-4 py-2 rounded-xl font-bold text-sm transition-all",
              tab === "crew" ? "bg-gen-z-coral text-black" : "bg-zinc-900/50 text-zinc-400 hover:text-white"
            )}
          >
            Ma Crew
          </button>
          <button
            onClick={() => setTab("discover")}
            className={cn(
              "px-4 py-2 rounded-xl font-bold text-sm transition-all",
              tab === "discover" ? "bg-gen-z-coral text-black" : "bg-zinc-900/50 text-zinc-400 hover:text-white"
            )}
          >
            Découvrir
          </button>
        </div>
      </header>

      {tab === "crew" ? (
        hasCrew && crew ? (
          <>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="relative overflow-hidden rounded-3xl p-8 border border-gen-z-coral/20 bg-gradient-to-br from-gen-z-coral/10 to-pink-500/5"
            >
              <div className="flex items-center gap-6 mb-8">
                <div
                  className="w-20 h-20 rounded-2xl flex items-center justify-center"
                  style={{ backgroundColor: crew.color || "#06b6d4" }}
                >
                  <Shield className="w-10 h-10 text-white" />
                </div>
                <div>
                  <h2 className="text-3xl font-black text-white">{crew.name}</h2>
                  <p className="text-zinc-400">
                    {members.length} membres • Lvl moy. {Math.round(crew.average_level)}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-4 mb-8">
                <div className="text-center p-4 rounded-2xl bg-black/20">
                  <p className="text-2xl font-black text-gen-z-coral">{crew.total_xp.toLocaleString()}</p>
                  <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Total XP</p>
                </div>
                <div className="text-center p-4 rounded-2xl bg-black/20">
                  <p className="text-2xl font-black text-gen-z-mint">{crew.total_challenges_won}</p>
                  <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Défis gagnés</p>
                </div>
                <div className="text-center p-4 rounded-2xl bg-black/20">
                  <p className="text-2xl font-black text-gen-z-lavender">
                    {myRank ? `#${myRank}` : "—"}
                  </p>
                  <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Rang</p>
                </div>
                <div className="text-center p-4 rounded-2xl bg-black/20">
                  <p className="text-2xl font-black text-yellow-500">{crew.total_events_attended}</p>
                  <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Events</p>
                </div>
              </div>

              <div className="flex gap-4">
                <Button className="flex-1 bg-gen-z-coral text-black font-bold" disabled>
                  <Trophy className="w-4 h-4 mr-2" />
                  Défi (bientôt)
                </Button>
                <Button variant="outline" className="flex-1">
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Chat Crew
                </Button>
              </div>
            </motion.div>

            {/* TODO(data): crew_battles table is not implemented yet — see report. */}

            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-black uppercase">Membres</h2>
                <Button variant="outline" size="sm">
                  <UserPlus className="w-4 h-4 mr-2" />
                  Inviter
                </Button>
              </div>

              <div className="space-y-3">
                {members.map((member, idx) => (
                  <motion.div
                    key={member.user_id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="flex items-center gap-4 p-4 rounded-2xl bg-zinc-900/50 border border-white/5"
                  >
                    <div className="relative">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gen-z-lavender to-gen-z-sky flex items-center justify-center text-lg font-bold text-white">
                        {member.pseudo.charAt(0).toUpperCase()}
                      </div>
                      {member.role === "owner" && (
                        <Crown className="absolute -top-1 -right-1 w-5 h-5 text-yellow-500 fill-current" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-white">{member.pseudo}</h4>
                        <span
                          className={cn(
                            "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase",
                            member.role === "owner"
                              ? "bg-yellow-500/20 text-yellow-500"
                              : member.role === "admin"
                              ? "bg-gen-z-lavender/20 text-gen-z-lavender"
                              : "bg-zinc-800 text-zinc-400"
                          )}
                        >
                          {member.role}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-500">Lvl {member.level}</p>
                    </div>
                    <div className="flex items-center gap-1 text-gen-z-lavender">
                      <Zap className="w-4 h-4" />
                      <span className="font-bold">{member.xp_contributed.toLocaleString()}</span>
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
            <p className="text-zinc-500 max-w-sm mb-8">
              Rejoins ou crée une crew pour participer aux défis et gagner des bonus XP!
            </p>
            <div className="flex gap-4">
              <Button className="bg-gen-z-coral text-black font-bold">
                <Shield className="w-4 h-4 mr-2" />
                Créer une Crew
              </Button>
              <Button variant="outline" onClick={() => setTab("discover")}>
                <Search className="w-4 h-4 mr-2" />
                Trouver une Crew
              </Button>
            </div>
          </div>
        )
      ) : (
        <>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher une crew..."
              className="pl-12 h-12 rounded-xl bg-zinc-900/50 border-white/10"
            />
          </div>

          <section className="space-y-4">
            <h2 className="text-xl font-black uppercase">Crews populaires</h2>

            {filteredCrews.length === 0 ? (
              <div className="p-8 rounded-3xl bg-zinc-900/50 border border-white/5 text-center">
                <Users className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
                <p className="text-zinc-500">Aucune crew publique pour l'instant.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredCrews.map((c, idx) => {
                  const lbEntry = leaderboard.find((l) => l.crew_id === c.id)
                  const rank = lbEntry?.rank ?? lbEntry?.position
                  return (
                    <motion.div
                      key={c.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      className="p-6 rounded-3xl border transition-all cursor-pointer hover:border-white/20 bg-zinc-900/50 border-white/5"
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className="w-16 h-16 rounded-2xl flex items-center justify-center"
                          style={{ backgroundColor: c.color || "#06b6d4" }}
                        >
                          <Shield className="w-8 h-8 text-white" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-1">
                            <h3 className="font-black text-lg text-white">{c.name}</h3>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-zinc-400">
                            <span className="flex items-center gap-1">
                              <Users className="w-3 h-3" />
                              max {c.max_members}
                            </span>
                            {rank && (
                              <span className="flex items-center gap-1">
                                <Trophy className="w-3 h-3" />
                                Rang #{rank}
                              </span>
                            )}
                            <span className="flex items-center gap-1 text-gen-z-lavender">
                              <Zap className="w-3 h-3" />
                              {c.total_xp.toLocaleString()} XP
                            </span>
                          </div>
                          {c.description && (
                            <p className="text-xs text-zinc-500 mt-2 line-clamp-1">{c.description}</p>
                          )}
                        </div>
                        <Button>Voir</Button>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            )}
          </section>

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
              <Button className="bg-gen-z-coral text-black font-bold">Créer</Button>
            </div>
          </motion.div>
        </>
      )}
    </div>
  )
}
