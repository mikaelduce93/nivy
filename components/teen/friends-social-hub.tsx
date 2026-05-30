'use client'

import { useState } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Users, UserPlus, UserCheck, Search, Bell, MessageCircle, Trophy, 
  Zap, Target, Flame, Swords, Crown, ChevronRight, Gift, Star, Activity
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { GlassCard } from '@/components/ui/glass-card'
import { NeonButton } from '@/components/ui/neon-button'
import { CrewPulse } from '@/gamification-system/features/crews/components/crew-pulse'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

// Types
interface Friend {
  id: string
  pseudo: string
  level: number
  totalXp: number
  isOnline: boolean
  avatar?: string
  streak?: number
  lastActive?: string
}

interface FriendRequest {
  id: string
  requester: {
    pseudo: string
    level: number
    avatar?: string
  }
  createdAt: string
}

interface ActivityItem {
  id: string
  userId: string
  userName: string
  userAvatar?: string
  type: 'level_up' | 'achievement' | 'challenge_complete' | 'streak' | 'event'
  description: string
  timestamp: string
  xpEarned?: number
}

interface SocialHubProps {
  teenId: string
  friends: Friend[]
  pendingRequests: FriendRequest[]
}

// Components
function OnlineStatusDot({ isOnline }: { isOnline: boolean }) {
  return (
    <motion.div 
      className={cn(
        "absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-ink",
        isOnline ? "bg-lime" : "bg-muted"
      )}
      animate={isOnline ? { scale: [1, 1.2, 1] } : {}}
      transition={{ repeat: Infinity, duration: 2 }}
    />
  )
}

function FriendAvatar({ friend, size = 'md' }: { friend: Friend, size?: 'sm' | 'md' | 'lg' }) {
  const sizeClasses = {
    sm: 'h-8 w-8 text-sm',
    md: 'h-12 w-12 text-lg',
    lg: 'h-16 w-16 text-2xl'
  }

  return (
    <div className="relative">
      <motion.div
        className={cn(
          "relative overflow-hidden rounded-full bg-gradient-to-br from-lime to-teal flex items-center justify-center text-ink font-bold",
          sizeClasses[size]
        )}
        whileHover={{ scale: 1.1 }}
      >
        {friend.avatar ? (
          <Image
            src={friend.avatar}
            alt={friend.pseudo}
            fill
            sizes="(max-width: 768px) 64px, 96px"
            className="rounded-full object-cover"
            unoptimized
          />
        ) : (
          friend.pseudo?.charAt(0) || "?"
        )}
      </motion.div>
      <OnlineStatusDot isOnline={friend.isOnline} />
    </div>
  )
}

function FriendCard({ friend, onChallenge, onMessage }: { friend: Friend, onChallenge?: () => void, onMessage?: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
      className="group"
    >
      <GlassCard 
        variant="hover"
        className={cn(
          "p-4 relative overflow-hidden",
          friend.isOnline && "border-lime/30"
        )}
      >
        {/* Online glow */}
        {friend.isOnline && (
          <div className="absolute inset-0 bg-lime/5" />
        )}

        <div className="relative flex items-center gap-4">
          <FriendAvatar friend={friend} />
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-bold text-ink truncate">{friend.pseudo}</span>
              {friend.streak && friend.streak >= 7 && (
                <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-coral/20">
                  <Flame className="w-3 h-3 text-coral" />
                  <span className="text-[10px] font-bold text-coral">{friend.streak}</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-3 text-xs text-mute mt-1">
              <span className="flex items-center gap-1">
                <Trophy className="w-3 h-3" />
                Niv. {friend.level}
              </span>
              <span className="flex items-center gap-1">
                <Zap className="w-3 h-3" />
                {friend.totalXp.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Action buttons - appear on hover */}
          <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={onChallenge}
              className="p-2 rounded-lg bg-pink/20 text-pink hover:bg-pink/30 transition-colors"
              title="Défier"
            >
              <Swords className="w-4 h-4" />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={onMessage}
              className="p-2 rounded-lg bg-teal/20 text-teal hover:bg-teal/30 transition-colors"
              title="Message"
            >
              <MessageCircle className="w-4 h-4" />
            </motion.button>
          </div>
        </div>
      </GlassCard>
    </motion.div>
  )
}

function ActivityFeed({ activities }: { activities: ActivityItem[] }) {
  const getActivityIcon = (type: ActivityItem['type']) => {
    switch (type) {
      case 'level_up': return { icon: Star, color: 'text-gold', bg: 'bg-gold/20' }
      case 'achievement': return { icon: Trophy, color: 'text-pink', bg: 'bg-pink/20' }
      case 'challenge_complete': return { icon: Target, color: 'text-lime', bg: 'bg-lime/20' }
      case 'streak': return { icon: Flame, color: 'text-coral', bg: 'bg-coral/20' }
      case 'event': return { icon: Users, color: 'text-teal', bg: 'bg-teal/20' }
      default: return { icon: Activity, color: 'text-mute', bg: 'bg-muted' }
    }
  }

  return (
    <GlassCard className="p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-ink flex items-center gap-2">
          <Activity className="w-5 h-5 text-teal" />
          Activité récente
        </h3>
        <span className="text-xs text-mute">Dernières 24h</span>
      </div>

      <div className="space-y-3 max-h-80 overflow-y-auto scrollbar-hide">
        {activities.length > 0 ? activities.map((activity, idx) => {
          const config = getActivityIcon(activity.type)
          const Icon = config.icon
          
          return (
            <motion.div
              key={activity.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="flex items-start gap-3 p-3 rounded-xl bg-card border border-ink"
            >
              <div className={cn("p-2 rounded-lg shrink-0", config.bg)}>
                <Icon className={cn("w-4 h-4", config.color)} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-ink">
                  <span className="font-bold">{activity.userName}</span>{' '}
                  <span className="text-mute">{activity.description}</span>
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-mute">{activity.timestamp}</span>
                  {activity.xpEarned && (
                    <span className="text-xs font-bold text-lime">+{activity.xpEarned} XP</span>
                  )}
                </div>
              </div>
            </motion.div>
          )
        }) : (
          <div className="text-center py-8 text-mute">
            <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Aucune activité récente</p>
          </div>
        )}
      </div>
    </GlassCard>
  )
}

function QuickChallengeWidget({ friends }: { friends: Friend[] }) {
  const onlineFriends = friends.filter(f => f.isOnline)

  return (
    <GlassCard neon="party" className="p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 rounded-xl bg-pink/20">
          <Swords className="w-5 h-5 text-pink" />
        </div>
        <div>
          <h3 className="font-bold text-ink">Défi Rapide</h3>
          <p className="text-xs text-mute">{onlineFriends.length} ami{onlineFriends.length !== 1 ? 's' : ''} en ligne</p>
        </div>
      </div>

      {onlineFriends.length > 0 ? (
        <div className="space-y-2 mb-4">
          <div className="flex -space-x-2">
            {onlineFriends.slice(0, 5).map((friend, idx) => (
              <motion.div
                key={friend.id}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.1 }}
                className="relative"
              >
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-lime to-teal border-2 border-ink flex items-center justify-center text-ink font-bold text-sm">
                  {friend.pseudo?.charAt(0)}
                </div>
              </motion.div>
            ))}
            {onlineFriends.length > 5 && (
              <div className="w-10 h-10 rounded-full bg-card border-2 border-ink flex items-center justify-center text-ink text-xs font-bold">
                +{onlineFriends.length - 5}
              </div>
            )}
          </div>
        </div>
      ) : (
        <p className="text-sm text-mute mb-4">Aucun ami en ligne</p>
      )}

      <NeonButton variant="party" size="sm" className="w-full" disabled={onlineFriends.length === 0}>
        <Swords className="w-4 h-4 mr-2" />
        Lancer un défi
      </NeonButton>
    </GlassCard>
  )
}

function FriendsBenefits() {
  const benefits = [
    { icon: Crown, title: 'Classement privé', desc: 'Compétition entre amis', color: 'yellow' },
    { icon: Swords, title: 'Défis en duo', desc: 'Double XP avec un buddy', color: 'purple' },
    { icon: Users, title: 'Events ensemble', desc: 'Bonus de groupe', color: 'cyan' },
    { icon: Gift, title: '+10% XP', desc: 'Jouer avec des amis', color: 'emerald' },
  ]

  return (
    <GlassCard neon="intellect" className="p-5">
      <h3 className="font-bold text-ink mb-4 flex items-center gap-2">
        <Star className="w-5 h-5 text-gold" />
        Avantages Amis
      </h3>
      <div className="grid grid-cols-2 gap-3">
        {benefits.map((benefit, idx) => {
          const Icon = benefit.icon
          return (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="p-3 rounded-xl bg-card border border-ink"
            >
              <Icon className={cn("w-5 h-5 mb-2", `text-${benefit.color}-400`)} />
              <p className="font-bold text-ink text-sm">{benefit.title}</p>
              <p className="text-[10px] text-mute">{benefit.desc}</p>
            </motion.div>
          )
        })}
      </div>
    </GlassCard>
  )
}

// Main Component
export function FriendsSocialHub({ teenId, friends, pendingRequests }: SocialHubProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [filter, setFilter] = useState<'all' | 'online'>('all')

  // Mock activity data
  const activities: ActivityItem[] = [
    { id: '1', userId: '1', userName: 'Sofia', type: 'level_up', description: 'a atteint le niveau 15', timestamp: 'Il y a 2h', xpEarned: 500 },
    { id: '2', userId: '2', userName: 'Karim', type: 'achievement', description: 'a débloqué "Streak Legend"', timestamp: 'Il y a 3h' },
    { id: '3', userId: '3', userName: 'Youssef', type: 'challenge_complete', description: 'a terminé le défi Sport', timestamp: 'Il y a 5h', xpEarned: 150 },
  ]

  const filteredFriends = friends.filter(f => {
    const matchesSearch = f.pseudo.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesFilter = filter === 'all' || (filter === 'online' && f.isOnline)
    return matchesSearch && matchesFilter
  })

  const onlineFriendsCount = friends.filter(f => f.isOnline).length

  return (
    <div className="space-y-6">
      {/* Crew Progress */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <CrewPulse currentXP={4200} targetXP={5000} />
        <GlassCard className="p-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-lime/20">
              <Users className="w-5 h-5 text-lime" />
            </div>
            <div>
              <span className="text-2xl font-black text-ink">{friends.length}</span>
              <span className="text-mute text-sm ml-2">amis</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-lime animate-pulse" />
            <span className="text-sm text-lime font-medium">{onlineFriendsCount} en ligne</span>
          </div>
        </GlassCard>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-mute" />
          <input
            type="text"
            placeholder="Rechercher un ami..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-xl bg-card border border-ink text-ink placeholder:text-mute focus:outline-none focus:border-teal/50 transition-colors"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={cn(
              "px-4 py-2 rounded-xl text-sm font-medium transition-colors",
              filter === 'all' ? "bg-white text-ink" : "bg-card text-mute hover:text-ink"
            )}
          >
            Tous ({friends.length})
          </button>
          <button
            onClick={() => setFilter('online')}
            className={cn(
              "px-4 py-2 rounded-xl text-sm font-medium transition-colors flex items-center gap-2",
              filter === 'online' ? "bg-lime text-ink" : "bg-card text-mute hover:text-ink"
            )}
          >
            <span className="w-2 h-2 rounded-full bg-lime" />
            En ligne ({onlineFriendsCount})
          </button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Friends List */}
        <div className="lg:col-span-2 space-y-4">
          {/* Pending Requests */}
          {pendingRequests.length > 0 && (
            <GlassCard neon="creativity" className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-ink flex items-center gap-2">
                  <Bell className="w-4 h-4 text-coral" />
                  Demandes en attente
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-coral text-ink text-xs font-bold">
                  {pendingRequests.length}
                </span>
              </div>
              <div className="flex gap-3 overflow-x-auto pb-2">
                {pendingRequests.map((req, idx) => (
                  <motion.div
                    key={req.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: idx * 0.1 }}
                    className="flex-shrink-0 p-3 rounded-xl bg-card border border-coral/20 text-center"
                  >
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-coral to-gold flex items-center justify-center text-ink font-bold mx-auto mb-2">
                      {req.requester.pseudo?.charAt(0)}
                    </div>
                    <p className="font-medium text-ink text-sm">{req.requester.pseudo}</p>
                    <p className="text-[10px] text-mute mb-2">Niv. {req.requester.level}</p>
                    <div className="flex gap-1">
                      <Button size="sm" className="h-7 text-xs bg-lime hover:bg-lime">
                        Accepter
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 text-xs text-mute">
                        Refuser
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </GlassCard>
          )}

          {/* Friends Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <AnimatePresence>
              {filteredFriends.map((friend) => (
                <FriendCard 
                  key={friend.id} 
                  friend={friend}
                  onChallenge={() => console.log('Challenge:', friend.id)}
                  onMessage={() => console.log('Message:', friend.id)}
                />
              ))}
            </AnimatePresence>
          </div>

          {filteredFriends.length === 0 && (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-ink mx-auto mb-4" />
              <p className="text-mute">
                {searchQuery ? 'Aucun ami trouvé' : 'Aucun ami pour le moment'}
              </p>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <QuickChallengeWidget friends={friends} />
          <ActivityFeed activities={activities} />
          <FriendsBenefits />
        </div>
      </div>
    </div>
  )
}


