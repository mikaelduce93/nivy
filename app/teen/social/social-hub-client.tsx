"use client"

import { useState, useEffect } from "react"
import { Users, UserPlus, Trophy, Map, MessageCircle, Search, Crown, Zap, Shield, MapPin, Loader2 } from "lucide-react"
import Link from "next/link"
import { HubTabs, type HubTab } from "@/components/teen/hub-tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { StickerCard } from "@/components/ui/sticker-card"
import { StatHero, NivEmpty } from "@/components/brand"
import { cn } from "@/lib/utils"
import Image from "next/image"
import { useSearchParams } from "next/navigation"
import dynamic from "next/dynamic"
import { EmptyState } from "@/components/ui/states/empty-state"
import { useT } from "@/lib/i18n"
import type { Translator } from "@/lib/i18n"

// Lazy load the map component
const TeenMapWrapper = dynamic(
  () => import("@/components/maps/teen-map-wrapper").then(mod => ({ default: mod.TeenMapWrapper })),
  {
    loading: () => <div className="h-[400px] bg-card rounded-2xl animate-pulse" />,
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

export function SocialHubClient({ teenId, teenName }: SocialHubClientProps) {
  const t = useT()
  const searchParams = useSearchParams()
  const currentTab = searchParams.get("tab") || "crew"
  const [friendsCount, setFriendsCount] = useState<number | null>(null)

  const SOCIAL_TABS: HubTab[] = [
    { id: "crew", label: t("teen.social.tabCrew"), icon: Shield },
    { id: "friends", label: t("teen.social.tabFriends"), icon: Users },
    { id: "ranking", label: t("teen.social.tabRanking"), icon: Trophy },
    { id: "map", label: t("teen.social.tabMap"), icon: Map },
  ]

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
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <p className="eyebrow tracking-[0.16em]">{t("teen.social.eyebrow")}</p>
            <h1 className="font-display text-4xl font-extrabold tracking-tight">
              {t("teen.social.titleLead")} <em className="font-semibold italic text-pink">{t("teen.social.titleEm")}</em>
            </h1>
            <p className="text-sm text-mute">{t("teen.social.subtitle")}</p>
          </div>

          {/* Quick Stat */}
          <div className="flex items-center gap-2 self-start rounded-xl border-2 border-ink bg-white px-4 py-2 shadow-stkr-sm">
            <Users className="w-4 h-4 text-teal" />
            <span className="font-mono text-sm font-bold tabular-nums">
              {friendsCount !== null ? t("teen.social.friendsCount", { count: friendsCount }) : t("teen.social.loading")}
            </span>
          </div>
        </div>

        {/* Tabs */}
        <HubTabs tabs={SOCIAL_TABS} defaultTab="crew" ariaLabel={t("teen.social.tabsAria")} />
      </header>

      {/* Tab Content */}
      <div key={currentTab}>
        {currentTab === "crew" && <CrewTab teenId={teenId} t={t} />}
        {currentTab === "friends" && <FriendsTab teenId={teenId} t={t} />}
        {currentTab === "ranking" && <RankingTab teenId={teenId} t={t} />}
        {currentTab === "map" && <MapTab t={t} />}
      </div>
    </div>
  )
}

function CrewTab({ teenId, t }: { teenId: string; t: Translator }) {
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
        <Loader2 className="w-8 h-8 animate-spin text-pink" />
      </div>
    )
  }

  if (!hasCrew || !crewData) {
    return (
      <NivEmpty
        mood="hype"
        title={t("teen.social.crewEmptyTitle")}
        description={t("teen.social.crewEmptyDesc")}
        action={
          <Button asChild variant="pink">
            <Link href="/teen/circles">
              <Shield className="w-4 h-4 mr-2" />
              {t("teen.social.createCrew")}
            </Link>
          </Button>
        }
      />
    )
  }

  const { stats, members } = crewData

  return (
    <div className="space-y-6">
      {/* Crew hero — surface sombre ponctuelle */}
      <StatHero
        eyebrow={`${crewData.name || t("teen.social.crewDefaultName")} · ${crewData.tier || t("teen.social.crewDefaultTier")}`}
        value={(stats?.totalXp || 0).toLocaleString()}
        unit="XP"
        tone="gold"
        size="lg"
        meta={t("teen.social.crewMembersMeta", { count: stats?.memberCount || 0 })}
      />

      {/* Secondary stats */}
      <div className="grid grid-cols-2 gap-3">
        <StickerCard className="items-center p-4 text-center">
          <p className="font-display text-2xl font-extrabold tabular-nums text-lime">{stats?.battlesWon || 0}</p>
          <p className="eyebrow mt-1 text-mute">{t("teen.social.battlesWon")}</p>
        </StickerCard>
        <StickerCard className="items-center p-4 text-center">
          <p className="font-display text-2xl font-extrabold tabular-nums text-teal">#{stats?.cityRank || "—"}</p>
          <p className="eyebrow mt-1 text-mute">{t("teen.social.cityRank")}</p>
        </StickerCard>
      </div>

      {/* Members */}
      <div>
        <p className="eyebrow mb-3">{t("teen.social.members")}</p>
        <div className="flex items-center gap-3 flex-wrap">
          {(members || []).slice(0, 6).map((member: any, i: number) => (
            <div key={member.id || i} className="relative">
              {member.avatar_url ? (
                <Image
                  src={member.avatar_url}
                  alt={member.name}
                  width={48}
                  height={48}
                  className="w-12 h-12 rounded-full border-2 border-ink object-cover"
                />
              ) : (
                <div className="w-12 h-12 rounded-full border-2 border-ink bg-paper flex items-center justify-center text-sm font-bold text-ink">
                  {member.name?.charAt(0) || '?'}
                </div>
              )}
              {member.isOwner && (
                <Crown className="absolute -top-2 -right-1 w-5 h-5 text-gold fill-current" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Actions — vers la source canonique */}
      <div className="flex gap-3">
        <Button asChild variant="pink" className="flex-1">
          <Link href="/teen/circles">
            <Shield className="w-4 h-4 mr-2" />
            {t("teen.social.viewCrew")}
          </Link>
        </Button>
        <Button asChild variant="outline" className="flex-1">
          <Link href="/teen/circles">
            <MessageCircle className="w-4 h-4 mr-2" />
            {t("teen.social.crewChat")}
          </Link>
        </Button>
      </div>
    </div>
  )
}

function FriendsTab({ teenId, t }: { teenId?: string; t: Translator }) {
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
        <Loader2 className="w-8 h-8 animate-spin text-pink" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-mute" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t("teen.social.searchFriends")}
          className="pl-12 h-14 rounded-xl border-2 border-ink"
        />
      </div>

      {/* Friends List */}
      {filteredFriends.length === 0 ? (
        friends.length === 0 ? (
          <EmptyState
            preset="feed"
            size="default"
            title={t("teen.social.feedEmptyTitle")}
            description={t("teen.social.feedEmptyDesc")}
            action={{ label: t("teen.social.findFriends"), href: "/teen/friends" }}
          />
        ) : (
          <EmptyState
            preset="search"
            size="small"
            title={t("teen.social.noFriendFoundTitle")}
            description={t("teen.social.noFriendFoundDesc")}
          />
        )
      ) : (
        <div className="space-y-3">
          {filteredFriends.map((friend) => (
            <StickerCard
              key={friend.id}
              variant="hover"
              className="flex-row items-center gap-4 p-4"
            >
              <div className="relative">
                {friend.avatar_url ? (
                  <Image
                    src={friend.avatar_url}
                    alt={friend.name}
                    width={56}
                    height={56}
                    className="w-14 h-14 rounded-full border-2 border-ink object-cover"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-full border-2 border-ink bg-paper flex items-center justify-center text-xl font-bold text-ink">
                    {friend.name.charAt(0)}
                  </div>
                )}
                <div className={cn(
                  "absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-ink",
                  friend.status === "online" ? "bg-lime" :
                  friend.status === "away" ? "bg-gold" : "bg-muted"
                )} />
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-ink">{friend.name}</h4>
                <p className="text-sm text-mute">{t("teen.social.mutualFriends", { count: friend.mutual })}</p>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-1 text-gold">
                  <Zap className="w-4 h-4" />
                  <span className="font-mono font-bold tabular-nums">{friend.xp.toLocaleString()}</span>
                </div>
                <p className="eyebrow text-mute">XP</p>
              </div>
              <Button variant="ghost" size="icon">
                <MessageCircle className="w-5 h-5" />
              </Button>
            </StickerCard>
          ))}
        </div>
      )}

      {/* Add Friends */}
      <Button asChild variant="pink" className="w-full h-14">
        <Link href="/teen/friends">
          <UserPlus className="w-5 h-5 mr-2" />
          {t("teen.social.addFriends")}
        </Link>
      </Button>
    </div>
  )
}

function RankingTab({ teenId, t }: { teenId: string; t: Translator }) {
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
      } finally {
        setLoading(false)
      }
    }
    fetchLeaderboard()
  }, [teenId, timeframe])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-pink" />
      </div>
    )
  }

  if (rankings.length === 0) {
    return (
      <NivEmpty
        title={t("teen.social.rankingEmptyTitle")}
        description={t("teen.social.rankingEmptyDesc")}
      />
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

          return (
            <div key={rank} className="flex flex-col items-center">
              <div className="w-16 h-16 rounded-full border-2 border-ink bg-paper mb-2 flex items-center justify-center text-lg font-bold text-ink">
                {player.name.charAt(0)}
              </div>
              <span className="font-bold text-sm mb-2">{player.name}</span>
              <div className={cn(
                "w-20 rounded-t-xl border-2 border-b-0 border-ink bg-gold flex items-end justify-center pb-3",
                heights[rank as 1 | 2 | 3]
              )}>
                <span className="text-2xl">{player.badge || rank}</span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Rest of Rankings */}
      <div className="space-y-3">
        {rankings.filter(r => r.rank > 3).map((player) => (
          <StickerCard
            key={player.rank}
            variant={player.isYou ? "default" : "hover"}
            className={cn(
              "flex-row items-center gap-4 p-4",
              player.isYou && "bg-pink"
            )}
          >
            <div className="w-10 h-10 rounded-full border-2 border-ink bg-paper flex items-center justify-center font-extrabold">
              {player.rank}
            </div>
            <div className="w-12 h-12 rounded-full border-2 border-ink bg-paper flex items-center justify-center font-bold text-ink">
              {player.name.charAt(0)}
            </div>
            <div className="flex-1">
              <h4 className="font-bold text-ink">{player.name}</h4>
            </div>
            <div className="flex items-center gap-2 text-gold">
              <Zap className="w-4 h-4" />
              <span className="font-mono font-extrabold tabular-nums">{player.xp.toLocaleString()}</span>
            </div>
          </StickerCard>
        ))}
      </div>
    </div>
  )
}

function MapTab({ t }: { t: Translator }) {
  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-2xl border-2 border-ink shadow-stkr-md">
        <div className="absolute top-4 left-4 z-10 flex items-center gap-2 rounded-xl border-2 border-ink bg-ink/80 px-4 py-2 text-paper">
          <MapPin className="w-4 h-4 text-lime" />
          <span className="font-mono text-sm font-bold">{t("teen.social.mapTitle")}</span>
        </div>
        <div className="h-[400px]">
          <TeenMapWrapper />
        </div>
      </div>
    </div>
  )
}
