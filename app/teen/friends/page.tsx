"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { Users, Search, UserPlus, MessageCircle, Zap, Trophy, MoreVertical, Check, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { EmptyState } from "@/components/ui/states/empty-state"

type ApiFriend = {
  id: string
  name: string
  avatar_url?: string | null
  status: string
  xp: number
  mutual: number
  mutual_calculated?: boolean
}

// TODO(data): pending friend requests, suggestions and per-friend level need
// dedicated endpoints. Backend currently only returns accepted friendships
// via /api/teen/friends. See report for prioritized backend work.
const PENDING_REQUESTS: any[] = []
const SUGGESTIONS: any[] = []

const TABS = [
  { id: "all", label: "Tous" },
  { id: "online", label: "En ligne" },
  { id: "requests", label: "Demandes" },
]

export default function FriendsPage() {
  const [tab, setTab] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [friends, setFriends] = useState<ApiFriend[]>([])

  useEffect(() => {
    let cancelled = false
    fetch("/api/teen/friends")
      .then((r) => (r.ok ? r.json() : { friends: [] }))
      .then((data) => {
        if (cancelled) return
        setFriends(Array.isArray(data?.friends) ? data.friends : [])
      })
      .catch(() => {
        if (!cancelled) setFriends([])
      })
    return () => {
      cancelled = true
    }
  }, [])

  const filteredFriends = friends.filter(friend => {
    if (!friend.name.toLowerCase().includes(searchQuery.toLowerCase())) return false
    if (tab === "online" && friend.status !== "online") return false
    return true
  })

  const onlineCount = friends.filter(f => f.status === "online").length

  return (
    <div className="min-h-screen pb-32 space-y-8 pt-6">
      {/* Header */}
      <header className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-gen-z-coral to-pink-500 flex items-center justify-center">
                <Users className="w-6 h-6 text-black" />
              </div>
              <div>
                <h1 className="text-4xl font-black tracking-tighter uppercase italic">Amis</h1>
                <p className="text-zinc-500 text-sm font-medium">{friends.length} amis • {onlineCount} en ligne</p>
              </div>
            </div>
          </div>

          <Button className="bg-gen-z-coral text-black font-bold">
            <UserPlus className="w-4 h-4 mr-2" />
            Ajouter
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher un ami..."
            className="pl-12 h-12 rounded-xl bg-zinc-900/50 border-white/10"
          />
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "px-4 py-2 rounded-xl font-bold text-sm transition-all",
                tab === t.id
                  ? "bg-gen-z-coral text-black"
                  : "bg-zinc-900/50 text-zinc-400 hover:text-white"
              )}
            >
              {t.label}
              {t.id === "requests" && PENDING_REQUESTS.length > 0 && (
                <span className="ml-2 px-2 py-0.5 rounded-full bg-white/20 text-[10px]">
                  {PENDING_REQUESTS.length}
                </span>
              )}
            </button>
          ))}
        </div>
      </header>

      {/* Pending Requests */}
      {tab === "requests" && PENDING_REQUESTS.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-xl font-black uppercase">Demandes en attente</h2>

          <div className="space-y-3">
            {PENDING_REQUESTS.map((request, idx) => (
              <motion.div
                key={request.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="flex items-center gap-4 p-4 rounded-2xl bg-gen-z-coral/10 border border-gen-z-coral/30"
              >
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-gen-z-lavender to-gen-z-sky flex items-center justify-center text-xl font-bold text-white">
                  {request.name.charAt(0)}
                </div>

                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-white">{request.name}</h4>
                  <p className="text-sm text-zinc-400">{request.mutual} amis en commun • {request.sentAt}</p>
                </div>

                <div className="flex items-center gap-2">
                  <Button size="icon" className="rounded-full bg-gen-z-mint text-black">
                    <Check className="w-5 h-5" />
                  </Button>
                  <Button size="icon" variant="outline" className="rounded-full">
                    <X className="w-5 h-5" />
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* Friends List */}
      {tab !== "requests" && (
        <section className="space-y-4">
          <h2 className="text-xl font-black uppercase">
            {tab === "online" ? "En ligne maintenant" : "Tous les amis"}
          </h2>

          {filteredFriends.length === 0 ? (
            friends.length === 0 ? (
              <EmptyState
                preset="friends"
                size="default"
              />
            ) : (
              <EmptyState
                preset="search"
                size="small"
                title={searchQuery ? "Aucun ami trouvé" : "Aucun ami en ligne"}
                description={searchQuery ? "Essaie une autre recherche" : "Tes amis sont hors ligne pour le moment."}
              />
            )
          ) : (
            <div className="space-y-3">
              {filteredFriends.map((friend, idx) => (
                <motion.div
                  key={friend.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="flex items-center gap-4 p-4 rounded-2xl bg-zinc-900/50 border border-white/5 hover:border-white/10 transition-colors"
                >
                  {/* Avatar */}
                  <div className="relative">
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-gen-z-lavender to-gen-z-sky flex items-center justify-center text-xl font-bold text-white">
                      {friend.name.charAt(0)}
                    </div>
                    <div className={cn(
                      "absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-zinc-900",
                      friend.status === "online" ? "bg-green-500" :
                      friend.status === "away" ? "bg-yellow-500" : "bg-zinc-500"
                    )} />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-white">{friend.name}</h4>
                    </div>
                    {friend.mutual_calculated && friend.mutual > 0 && (
                      <p className="text-sm text-zinc-400">{friend.mutual} amis en commun</p>
                    )}
                  </div>

                  {/* XP */}
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-gen-z-lavender">
                      <Zap className="w-4 h-4" />
                      <span className="font-bold">{friend.xp.toLocaleString()}</span>
                    </div>
                    <p className="text-[10px] text-zinc-500 uppercase">XP</p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" className="rounded-full">
                      <MessageCircle className="w-5 h-5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="rounded-full">
                      <MoreVertical className="w-5 h-5" />
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Suggestions */}
      {tab !== "requests" && (
        <section className="space-y-4">
          <h2 className="text-xl font-black uppercase">Suggestions</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {SUGGESTIONS.map((suggestion, idx) => (
              <motion.div
                key={suggestion.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="p-6 rounded-2xl bg-zinc-900/50 border border-white/5 text-center"
              >
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-gen-z-lavender to-gen-z-sky flex items-center justify-center text-2xl font-bold text-white mx-auto mb-4">
                  {suggestion.name.charAt(0)}
                </div>
                
                <h4 className="font-bold text-white">{suggestion.name}</h4>
                <p className="text-xs text-zinc-500 mb-2">Lvl {suggestion.level}</p>
                <p className="text-sm text-gen-z-coral mb-4">{suggestion.reason}</p>

                <Button className="w-full bg-gen-z-coral text-black font-bold">
                  <UserPlus className="w-4 h-4 mr-2" />
                  Ajouter
                </Button>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* Leaderboard Preview */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="p-6 rounded-3xl bg-gradient-to-r from-yellow-500/10 to-amber-500/5 border border-yellow-500/20"
      >
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-yellow-500/20 flex items-center justify-center">
            <Trophy className="w-7 h-7 text-yellow-500" />
          </div>
          <div className="flex-1">
            <h3 className="font-black text-white">Classement Amis</h3>
            <p className="text-sm text-zinc-400">Vois qui a le plus d'XP parmi tes amis</p>
          </div>
          <Button variant="outline">
            Voir le classement
          </Button>
        </div>
      </motion.div>
    </div>
  )
}
