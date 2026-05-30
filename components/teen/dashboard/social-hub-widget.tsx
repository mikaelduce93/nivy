'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Users, Swords, Crown, ChevronRight, Plus, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { usePresence, type PresenceStatus } from '@/lib/hooks/use-presence'

type TabType = 'friends' | 'crew' | 'clubs'

interface SocialHubWidgetProps {
  userId: string
  className?: string
}

interface TabConfig {
  id: TabType
  label: string
  icon: React.ElementType
  color: string
  bgColor: string
}

const tabs: TabConfig[] = [
  { id: 'friends', label: 'Amis', icon: Users, color: 'text-brand-soft', bgColor: 'bg-brand-soft/10' },
  { id: 'crew', label: 'Crew', icon: Swords, color: 'text-accent-soft', bgColor: 'bg-accent-soft/10' },
  { id: 'clubs', label: 'Clubs', icon: Crown, color: 'text-gold', bgColor: 'bg-gold/10' },
]

// Status styling
const statusColors: Record<PresenceStatus, string> = {
  online: 'bg-lime',
  away: 'bg-gold',
  playing: 'bg-pink',
  busy: 'bg-destructive',
  offline: 'bg-muted',
}

export function SocialHubWidget({ userId, className }: SocialHubWidgetProps) {
  const [activeTab, setActiveTab] = useState<TabType>('friends')
  const [crewData, setCrewData] = useState<any[]>([])
  const [clubsData, setClubsData] = useState<any[]>([])
  const [loadingCrew, setLoadingCrew] = useState(false)
  const [loadingClubs, setLoadingClubs] = useState(false)
  const [hasLoadedCrew, setHasLoadedCrew] = useState(false)
  const [hasLoadedClubs, setHasLoadedClubs] = useState(false)

  // Get friends presence
  const { friendsPresence, onlineCount, loading: loadingFriends } = usePresence({
    userId,
    enableHeartbeat: false,
    enableRealtime: true,
  })

  // Sort friends by status
  const sortedFriends = [...friendsPresence].sort((a, b) => {
    const order: Record<PresenceStatus, number> = {
      online: 0, playing: 1, busy: 2, away: 3, offline: 4
    }
    return order[a.status] - order[b.status]
  }).slice(0, 5)

  // Load crew and clubs on demand
  useEffect(() => {
    if (activeTab === 'crew' && !hasLoadedCrew) {
      setLoadingCrew(true)
      fetch('/api/teen/crew')
        .then(async (res) => {
          if (!res.ok) throw new Error('Failed to load crew')
          return res.json()
        })
        .then((data) => {
          if (data?.crew) {
            const crew = data.crew
            setCrewData([
              {
                id: crew.id,
                name: crew.name,
                members: crew.stats?.memberCount || 0,
                rank: crew.stats?.cityRank || 0,
                xpTotal: crew.stats?.totalXp || 0,
                isActive: true,
              },
            ])
          } else {
            setCrewData([])
          }
          setHasLoadedCrew(true)
        })
        .catch(() => {
          setCrewData([])
          setHasLoadedCrew(true)
        })
        .finally(() => setLoadingCrew(false))
    }
    
    if (activeTab === 'clubs' && !hasLoadedClubs) {
      if (!userId) return
      setLoadingClubs(true)
      fetch(`/api/teen/circles?teenId=${userId}&includePublic=true`)
        .then(async (res) => {
          if (!res.ok) throw new Error('Failed to load circles')
          return res.json()
        })
        .then((data) => {
          const joined = (data.circles || []).map((circle: any) => ({
            id: circle.id,
            name: circle.name,
            members: circle.stats?.member_count || 0,
            category: circle.circle_type || 'club',
            joined: true,
          }))
          const publicClubs = (data.publicCircles || []).map((circle: any) => ({
            id: circle.id,
            name: circle.name,
            members: circle.member_count || 0,
            category: circle.circle_type || 'club',
            joined: false,
          }))
          setClubsData([...joined, ...publicClubs].slice(0, 5))
          setHasLoadedClubs(true)
        })
        .catch(() => {
          setClubsData([])
          setHasLoadedClubs(true)
        })
        .finally(() => setLoadingClubs(false))
    }
  }, [activeTab, hasLoadedCrew, hasLoadedClubs, userId])

  return (
    <div className={cn("h-full flex flex-col p-4 sm:p-5", className)}>
      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-paper-2 rounded-xl mb-4">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs sm:text-sm font-semibold transition-all",
                isActive 
                  ? "bg-paper-2 text-ink shadow-inner" 
                  : "text-mute hover:text-ink hover:bg-paper-2"
              )}
            >
              <Icon className="w-4 h-4" />
              <span className="hidden sm:inline">{tab.label}</span>
              {tab.id === 'friends' && onlineCount > 0 && (
                <span className="ml-1 min-w-[18px] h-[18px] flex items-center justify-center text-[10px] font-bold bg-lime text-ink rounded-full">
                  {onlineCount}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          {/* Friends Tab */}
          {activeTab === 'friends' && (
            <motion.div
              key="friends"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.2 }}
              className="h-full flex flex-col"
            >
              {loadingFriends ? (
                <div className="flex-1 flex items-center justify-center">
                  <Loader2 className="w-6 h-6 animate-spin text-mute" />
                </div>
              ) : sortedFriends.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
                  <Users className="w-10 h-10 text-mute mb-3" />
                  <p className="text-sm text-mute font-medium">Aucun ami connecté</p>
                  <Button size="sm" variant="ghost" className="mt-2 text-brand-soft">
                    <Plus className="w-4 h-4 mr-1" />
                    Inviter des amis
                  </Button>
                </div>
              ) : (
                <div className="space-y-2 flex-1 overflow-y-auto">
                  {sortedFriends.map((friend) => (
                    <motion.div
                      key={friend.user_id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center gap-3 p-2 rounded-xl hover:bg-paper-2 transition-colors cursor-pointer group"
                    >
                      <div className="relative">
                        <Avatar size="sm" className="w-9 h-9">
                          <AvatarImage src={friend.avatar_url || undefined} />
                          <AvatarFallback variant="gradient">
                            {friend.full_name?.[0] || '?'}
                          </AvatarFallback>
                        </Avatar>
                        <div className={cn(
                          "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-ink",
                          statusColors[friend.status]
                        )} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-ink truncate">
                          {friend.full_name || 'Anonyme'}
                        </p>
                        <p className="text-xs text-mute truncate">
                          {friend.current_activity || (friend.status === 'online' ? 'En ligne' : 'Hors ligne')}
                        </p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-mute opacity-0 group-hover:opacity-100 transition-opacity" />
                    </motion.div>
                  ))}
                </div>
              )}
              
              {sortedFriends.length > 0 && (
                <Link href="/teen/social" className="block mt-3">
                  <Button variant="ghost" size="sm" className="w-full text-mute hover:text-ink">
                    Voir tous les amis
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </Link>
              )}
            </motion.div>
          )}

          {/* Crew Tab */}
          {activeTab === 'crew' && (
            <motion.div
              key="crew"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.2 }}
              className="h-full flex flex-col"
            >
              {loadingCrew ? (
                <div className="flex-1 flex items-center justify-center">
                  <Loader2 className="w-6 h-6 animate-spin text-mute" />
                </div>
              ) : crewData.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
                  <Swords className="w-10 h-10 text-mute mb-3" />
                  <p className="text-sm text-mute font-medium">Rejoins un Crew</p>
                  <Button size="sm" className="mt-2 bg-accent-soft hover:bg-accent-soft/80">
                    Explorer les Crews
                  </Button>
                </div>
              ) : (
                <div className="space-y-3 flex-1 overflow-y-auto">
                  {crewData.map((crew) => (
                    <motion.div
                      key={crew.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-3 rounded-xl bg-paper-2 border border-ink hover:border-accent-soft/30 transition-colors cursor-pointer group"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-bold text-ink">{crew.name}</h4>
                        {crew.isActive && (
                          <Badge variant="glass" size="sm" className="bg-lime/20 text-lime">
                            Active
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-xs text-mute">
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {crew.members}
                        </span>
                        <span>Rank #{crew.rank}</span>
                        <span className="text-accent-soft font-semibold">{crew.xpTotal.toLocaleString()} XP</span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
              
              <Link href="/teen/circles" className="block mt-3">
                <Button variant="ghost" size="sm" className="w-full text-mute hover:text-ink">
                  Gérer mes Crews
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </motion.div>
          )}

          {/* Clubs Tab */}
          {activeTab === 'clubs' && (
            <motion.div
              key="clubs"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.2 }}
              className="h-full flex flex-col"
            >
              {loadingClubs ? (
                <div className="flex-1 flex items-center justify-center">
                  <Loader2 className="w-6 h-6 animate-spin text-mute" />
                </div>
              ) : (
                <div className="space-y-2 flex-1 overflow-y-auto">
                  {clubsData.map((club) => (
                    <motion.div
                      key={club.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-paper-2 transition-colors cursor-pointer group"
                    >
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center",
                        club.joined ? "bg-gold/20" : "bg-paper-2"
                      )}>
                        <Crown className={cn(
                          "w-5 h-5",
                          club.joined ? "text-gold" : "text-mute"
                        )} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-ink truncate">{club.name}</p>
                        <p className="text-xs text-mute">
                          {club.members} membres • {club.category}
                        </p>
                      </div>
                      {club.joined ? (
                        <Badge variant="glass" size="sm" className="text-[10px]">Membre</Badge>
                      ) : (
                        <Button size="sm" variant="ghost" className="h-7 text-xs text-gold">
                          Rejoindre
                        </Button>
                      )}
                    </motion.div>
                  ))}
                </div>
              )}
              
              <Link href="/teen/circles" className="block mt-3">
                <Button variant="ghost" size="sm" className="w-full text-mute hover:text-ink">
                  Explorer les Clubs
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
