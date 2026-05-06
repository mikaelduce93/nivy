"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Users, UserPlus, Trophy, Map, MessageCircle, Search, Crown, Zap, Shield, Swords, MapPin, Loader2, RefreshCw } from "lucide-react"
import { HubTabs, type HubTab } from "@/components/teen/hub-tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { useSearchParams } from "next/navigation"
import dynamic from "next/dynamic"
import { EmptyState } from "@/components/ui/states/empty-state"

// Lazy load the map component
const TeenMapWrapper = dynamic(
  () => import("@/components/maps/teen-map-wrapper").then(mod => ({ default: mod.TeenMapWrapper })),
  { 
    loading: () => <div className="h-[400px] bg-zinc-900/50 rounded-3xl animate-pulse" />,
    ssr: false 
  }
)

interface Friend {
  id: string
  name: string
  avatar_url?: string
  status: 'online' | 'offline' | 'away'
  xp: number
  mutual: number
}

interface RankingEntry {
  rank: number
  id: string
  name: string
  avatar_url?: string
  xp: number
  level?: number
  badge?: string
  isYou?: boolean
}

interface SocialHubClientProps {
  teenId: string
  teenName: string
}

const SOCIAL_TABS: HubTab[] = [
  { id: "crew", label: "Crew", icon: Shield },
  { id: "friends", label: "Friends", icon: Users },
  { id: "ranking", label: "Ranking", icon: Trophy },
  { id: "map", label: "Map", icon: Map },
]

export function SocialHubClient({ teenId, teenName }: SocialHubClientProps) {
  const searchParams = useSearchParams()
  const currentTab = searchParams.get("tab") || "crew"
  const [friendsCount, setFriendsCount] = useState<number | null>(null)

  // Fetch friends count on mount
  useEffect(() => {
    const fetchFriendsCount = async () => {
      try {
        const response = await fetch('/api/teen/friends')
        if (response.ok) {
          const data = await response.json()
          setFriendsCount(data.total || 0)
        }
      } catch (error) {
        console.error('Failed to fetch friends count:', error)
      }
    }
    fetchFriendsCount()
  }, [])

  return (
    <div className="space-y-8 pt-6">
      {/* Header */}
      <header className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-gen-z-coral to-pink-500 flex items-center justify-center">
                <Users className="w-6 h-6 text-black" />
              </div>
              <div>
                <h1 className="text-4xl font-black tracking-tighter uppercase italic">Social</h1>
                <p className="text-zinc-500 text-sm font-medium">Connect with your tribe</p>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10">
              <Users className="w-4 h-4 text-gen-z-coral" />
              <span className="font-bold text-sm">
                {friendsCount !== null ? `${friendsCount} Friends` : 'Loading...'}
              </span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <HubTabs tabs={SOCIAL_TABS} defaultTab="crew" />
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
          {currentTab === "crew" && <CrewTab teenId={teenId} />}
          {currentTab === "friends" && <FriendsTab teenId={teenId} />}
          {currentTab === "ranking" && <RankingTab teenId={teenId} />}
          {currentTab === "map" && <MapTab />}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

function CrewTab({ teenId }: { teenId: string }) {
  const [hasCrew, setHasCrew] = useState(true)
  const [crewData, setCrewData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchCrew = async () => {
      try {
        const response = await fetch('/api/teen/crew')
        if (response.ok) {
          const data = await response.json()
          setCrewData(data.crew)
          setHasCrew(!!data.crew)
        } else {
          setHasCrew(false)
        }
      } catch (error) {
        console.error('Failed to fetch crew:', error)
        setHasCrew(false)
      } finally {
        setLoading(false)
      }
    }
    fetchCrew()
  }, [teenId])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-gen-z-coral" />
      </div>
    )
  }

  if (!hasCrew || !crewData) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-gen-z-coral/20 to-pink-500/20 flex items-center justify-center mb-6 border border-gen-z-coral/30">
          <Shield className="w-12 h-12 text-gen-z-coral" />
        </div>
        <h3 className="text-2xl font-black text-white mb-2">No Crew Yet</h3>
        <p className="text-zinc-500 max-w-sm mb-8">Join forces with your friends to compete in crew battles and earn bonus XP!</p>
        <div className="flex gap-4">
          <Button className="bg-gen-z-coral text-black font-bold">
            <Shield className="w-4 h-4 mr-2" />
            Create Crew
          </Button>
          <Button variant="outline">
            <Search className="w-4 h-4 mr-2" />
            Find Crew
          </Button>
        </div>
      </div>
    )
  }

  const { stats, members, activeBattles } = crewData

  return (
    <div className="space-y-8">
      {/* Crew Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative overflow-hidden rounded-3xl p-8 border border-white/10 bg-gradient-to-br from-gen-z-coral/10 to-pink-500/5"
      >
        <div className="absolute top-4 right-4">
          <div className="px-3 py-1 rounded-full bg-gen-z-coral/20 text-gen-z-coral text-xs font-black uppercase tracking-wider">
            {crewData.tier || 'Bronze'} Tier
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-gen-z-coral to-pink-500 flex items-center justify-center">
            {crewData.emoji ? (
              <span className="text-4xl">{crewData.emoji}</span>
            ) : (
              <Shield className="w-10 h-10 text-black" />
            )}
          </div>
          <div>
            <h2 className="text-3xl font-black">{crewData.name || 'MY CREW'}</h2>
            <p className="text-zinc-400">{stats?.memberCount || 0} members • Active now</p>
          </div>
        </div>

        {/* Crew Stats */}
        <div className="grid grid-cols-3 gap-6 mt-8">
          <div className="text-center p-4 rounded-2xl bg-black/20">
            <p className="text-3xl font-black text-gen-z-coral">{(stats?.totalXp || 0).toLocaleString()}</p>
            <p className="text-[10px] text-zinc-500 uppercase tracking-wider mt-1">Total XP</p>
          </div>
          <div className="text-center p-4 rounded-2xl bg-black/20">
            <p className="text-3xl font-black text-gen-z-mint">{stats?.battlesWon || 0}</p>
            <p className="text-[10px] text-zinc-500 uppercase tracking-wider mt-1">Battles Won</p>
          </div>
          <div className="text-center p-4 rounded-2xl bg-black/20">
            <p className="text-3xl font-black text-gen-z-lavender">#{stats?.cityRank || '-'}</p>
            <p className="text-[10px] text-zinc-500 uppercase tracking-wider mt-1">City Rank</p>
          </div>
        </div>

        {/* Members */}
        <div className="mt-8">
          <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-4">Members</h3>
          <div className="flex items-center gap-3 flex-wrap">
            {(members || []).slice(0, 6).map((member: any, i: number) => (
              <div key={member.id || i} className="relative">
                {member.avatar_url ? (
                  <img 
                    src={member.avatar_url} 
                    alt={member.name}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gen-z-lavender to-gen-z-sky flex items-center justify-center text-sm font-bold text-white">
                    {member.name?.charAt(0) || '?'}
                  </div>
                )}
                {member.isOwner && (
                  <Crown className="absolute -top-2 -right-1 w-5 h-5 text-yellow-500 fill-current" />
                )}
              </div>
            ))}
            <Button variant="outline" size="icon" className="w-12 h-12 rounded-full">
              <UserPlus className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-4 mt-8">
          <Button className="flex-1 bg-gen-z-coral text-black font-bold">
            <Swords className="w-4 h-4 mr-2" />
            Start Battle
          </Button>
          <Button variant="outline" className="flex-1">
            <MessageCircle className="w-4 h-4 mr-2" />
            Crew Chat
          </Button>
        </div>
      </motion.div>

      {/* Active Battles */}
      {activeBattles && activeBattles.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-bold">Active Battles</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeBattles.map((battle: any) => (
              <BattleCard
                key={battle.id}
                opponent={battle.opponent}
                status={battle.status === 'in_progress' ? 'In Progress' : 'Pending'}
                ourScore={battle.ourScore}
                theirScore={battle.theirScore}
                endsIn={battle.endsIn}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function BattleCard({ opponent, status, ourScore, theirScore, endsIn }: any) {
  const isWinning = ourScore > theirScore

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className="p-6 rounded-2xl bg-zinc-900/50 border border-white/5"
    >
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">{status}</span>
        <span className="text-xs text-zinc-400">{endsIn}</span>
      </div>
      <div className="flex items-center justify-between">
        <div className="text-center">
          <p className="text-2xl font-black text-gen-z-coral">{ourScore}</p>
          <p className="text-xs text-zinc-500">US</p>
        </div>
        <div className="text-2xl font-black text-zinc-600">VS</div>
        <div className="text-center">
          <p className="text-2xl font-black text-white">{theirScore}</p>
          <p className="text-xs text-zinc-500">{opponent}</p>
        </div>
      </div>
      {isWinning && ourScore > 0 && (
        <div className="mt-4 text-center text-xs font-bold text-gen-z-mint">
          You're winning! Keep it up!
        </div>
      )}
    </motion.div>
  )
}

function FriendsTab({ teenId }: { teenId?: string }) {
  const [searchQuery, setSearchQuery] = useState("")
  const [friends, setFriends] = useState<Friend[]>([])
  const [loading, setLoading] = useState(true)
  const [totalFriends, setTotalFriends] = useState(0)

  useEffect(() => {
    const fetchFriends = async () => {
      try {
        const response = await fetch('/api/teen/friends')
        if (response.ok) {
          const data = await response.json()
          setFriends(data.friends || [])
          setTotalFriends(data.total || 0)
        }
      } catch (error) {
        console.error('Failed to fetch friends:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchFriends()
  }, [teenId])

  // Filter friends by search query
  const filteredFriends = friends.filter(friend =>
    friend.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-gen-z-coral" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search friends..."
          className="pl-12 h-14 rounded-2xl bg-zinc-900/50 border-white/10"
        />
      </div>

      {/* Friends List */}
      {filteredFriends.length === 0 ? (
        friends.length === 0 ? (
          <EmptyState
            preset="feed"
            size="default"
            title="Ton feed est vide"
            description="Suis tes potes et rejoins une crew pour voir leur activité ici."
            action={{ label: "Trouver des amis", href: "/teen/friends" }}
          />
        ) : (
          <EmptyState
            preset="search"
            size="small"
            title="Aucun ami trouvé"
            description="Essaie une autre recherche."
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
              className="flex items-center gap-4 p-4 rounded-2xl bg-zinc-900/50 border border-white/5 hover:border-white/10 transition-colors cursor-pointer"
            >
              <div className="relative">
                {friend.avatar_url ? (
                  <img 
                    src={friend.avatar_url} 
                    alt={friend.name}
                    className="w-14 h-14 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-gen-z-lavender to-gen-z-sky flex items-center justify-center text-xl font-bold text-white">
                    {friend.name.charAt(0)}
                  </div>
                )}
                <div className={cn(
                  "absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-zinc-900",
                  friend.status === "online" ? "bg-green-500" :
                  friend.status === "away" ? "bg-yellow-500" : "bg-zinc-500"
                )} />
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-white">{friend.name}</h4>
                <p className="text-sm text-zinc-500">{friend.mutual} mutual friends</p>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-1 text-gen-z-lavender">
                  <Zap className="w-4 h-4" />
                  <span className="font-bold">{friend.xp.toLocaleString()}</span>
                </div>
                <p className="text-[10px] text-zinc-500 uppercase">XP</p>
              </div>
              <Button variant="ghost" size="icon">
                <MessageCircle className="w-5 h-5" />
              </Button>
            </motion.div>
          ))}
        </div>
      )}

      {/* Add Friends */}
      <Button className="w-full h-14 rounded-2xl bg-gen-z-coral text-black font-bold">
        <UserPlus className="w-5 h-5 mr-2" />
        Add New Friends
      </Button>
    </div>
  )
}

function RankingTab({ teenId }: { teenId: string }) {
  const [rankings, setRankings] = useState<RankingEntry[]>([])
  const [userRank, setUserRank] = useState<number>(-1)
  const [loading, setLoading] = useState(true)
  const [timeframe, setTimeframe] = useState('all_time')

  useEffect(() => {
    const fetchLeaderboard = async () => {
      setLoading(true)
      try {
        const response = await fetch(`/api/teen/leaderboard?timeframe=${timeframe}`)
        if (response.ok) {
          const data = await response.json()
          setRankings(data.rankings || [])
          setUserRank(data.userRank || -1)
        }
      } catch (error) {
        console.error('Failed to fetch leaderboard:', error)
        // Fallback data
        setRankings([
          { rank: 1, id: '1', name: "Salma K.", xp: 4250, badge: "🏆" },
          { rank: 2, id: '2', name: "Youssef M.", xp: 3820, badge: "🥈" },
          { rank: 3, id: '3', name: "Nadia L.", xp: 3650, badge: "🥉" },
          { rank: 4, id: '4', name: "Omar B.", xp: 3420 },
          { rank: 5, id: '5', name: "Toi", xp: 2450, isYou: true },
        ])
      } finally {
        setLoading(false)
      }
    }
    fetchLeaderboard()
  }, [teenId, timeframe])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-gen-z-lavender" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Top 3 Podium */}
      <div className="flex items-end justify-center gap-4 py-8">
        {[2, 1, 3].map((rank) => {
          const player = rankings.find(r => r.rank === rank)
          if (!player) return null

          const heights = { 1: "h-32", 2: "h-24", 3: "h-20" }
          const colors = { 
            1: "from-yellow-500 to-amber-500", 
            2: "from-zinc-400 to-zinc-500", 
            3: "from-amber-700 to-amber-800" 
          }

          return (
            <motion.div
              key={rank}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: rank * 0.1 }}
              className="flex flex-col items-center"
            >
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-gen-z-lavender to-gen-z-sky mb-2" />
              <span className="font-bold text-sm mb-2">{player.name}</span>
              <div className={cn(
                "w-20 rounded-t-xl flex items-end justify-center pb-3",
                heights[rank as 1 | 2 | 3],
                `bg-gradient-to-t ${colors[rank as 1 | 2 | 3]}`
              )}>
                <span className="text-2xl">{player.badge || rank}</span>
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* Rest of Rankings */}
      <div className="space-y-3">
        {rankings.filter(r => r.rank > 3).map((player, idx) => (
          <motion.div
            key={player.rank}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.05 }}
            className={cn(
              "flex items-center gap-4 p-4 rounded-2xl border transition-colors",
              player.isYou 
                ? "bg-gen-z-lavender/10 border-gen-z-lavender/30" 
                : "bg-zinc-900/50 border-white/5"
            )}
          >
            <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center font-black">
              {player.rank}
            </div>
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gen-z-lavender to-gen-z-sky" />
            <div className="flex-1">
              <h4 className="font-bold text-white">{player.name}</h4>
            </div>
            <div className="flex items-center gap-2 text-gen-z-lavender">
              <Zap className="w-4 h-4" />
              <span className="font-black">{player.xp.toLocaleString()}</span>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

function MapTab() {
  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-3xl border border-white/10">
        <div className="absolute top-4 left-4 z-10 flex items-center gap-2 px-4 py-2 rounded-xl bg-black/60 backdrop-blur-xl border border-white/10">
          <MapPin className="w-4 h-4 text-gen-z-mint" />
          <span className="text-sm font-bold">3 friends nearby</span>
        </div>
        <div className="h-[400px]">
          <TeenMapWrapper />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <motion.div
          whileHover={{ scale: 1.02 }}
          className="p-6 rounded-2xl bg-zinc-900/50 border border-white/5 cursor-pointer"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gen-z-coral/20 flex items-center justify-center">
              <Swords className="w-6 h-6 text-gen-z-coral" />
            </div>
            <div>
              <h4 className="font-bold text-white">Active Event</h4>
              <p className="text-sm text-zinc-500">Gaming Night @ Casa</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.02 }}
          className="p-6 rounded-2xl bg-zinc-900/50 border border-white/5 cursor-pointer"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gen-z-mint/20 flex items-center justify-center">
              <Users className="w-6 h-6 text-gen-z-mint" />
            </div>
            <div>
              <h4 className="font-bold text-white">Crew Meetup</h4>
              <p className="text-sm text-zinc-500">2 members at Morocco Mall</p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
