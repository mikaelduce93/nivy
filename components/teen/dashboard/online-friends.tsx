'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Users, UserPlus, Loader2, Gamepad2 } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { usePresence, type FriendPresence, type PresenceStatus } from '@/lib/hooks/use-presence'
import { cn } from '@/lib/utils'
import Link from 'next/link'

interface OnlineFriendsProps {
  userId: string
  className?: string
}

// Activity labels for different presence statuses
const activityLabels: Record<PresenceStatus, string> = {
  online: 'En ligne',
  away: 'Absent',
  playing: 'En jeu',
  busy: 'Occupé',
  offline: 'Hors ligne',
}

// Status color classes
const statusColors: Record<PresenceStatus, string> = {
  online: 'bg-success',
  away: 'bg-yellow-500',
  playing: 'bg-gen-z-lavender',
  busy: 'bg-destructive',
  offline: 'bg-muted-foreground',
}

export function OnlineFriends({ userId, className }: OnlineFriendsProps) {
  const { 
    friendsPresence, 
    onlineCount, 
    loading, 
    error 
  } = usePresence({ 
    userId,
    enableHeartbeat: false, // Don't send heartbeats from this component
    enableRealtime: true,
  })

  // Filter to show online/active friends first, then recently seen
  const sortedFriends = [...friendsPresence].sort((a, b) => {
    const statusOrder: Record<PresenceStatus, number> = {
      online: 0,
      playing: 1,
      busy: 2,
      away: 3,
      offline: 4,
    }
    return statusOrder[a.status] - statusOrder[b.status]
  })

  // Show max 6 friends + invite button
  const visibleFriends = sortedFriends.slice(0, 6)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className={cn("mb-8", className)}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
          <Users className="w-5 h-5 text-info" />
          Amis en ligne
        </h2>
        <span className="text-xs text-muted-foreground">
          {loading ? (
            <Loader2 className="w-3 h-3 animate-spin inline" />
          ) : (
            `${onlineCount} actif${onlineCount !== 1 ? 's' : ''}`
          )}
        </span>
      </div>

      {/* Friends List */}
      <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
        <AnimatePresence mode="popLayout">
          {loading ? (
            // Loading skeleton
            [...Array(4)].map((_, i) => (
              <motion.div
                key={`skeleton-${i}`}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="flex flex-col items-center gap-2 min-w-[64px]"
              >
                <div className="w-14 h-14 rounded-full bg-muted animate-pulse" />
                <div className="w-10 h-3 rounded bg-muted animate-pulse" />
              </motion.div>
            ))
          ) : error ? (
            // Error state
            <div className="flex items-center gap-2 text-destructive text-sm">
              <span>Erreur de chargement</span>
            </div>
          ) : visibleFriends.length === 0 ? (
            // Empty state
            <div className="flex flex-col items-center justify-center py-4 text-center w-full">
              <Users className="w-8 h-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                Aucun ami pour l'instant
              </p>
            </div>
          ) : (
            // Friends list
            visibleFriends.map((friend, index) => (
              <FriendAvatar key={friend.user_id} friend={friend} index={index} />
            ))
          )}
        </AnimatePresence>
        
        {/* Invite Button */}
        <Link 
          href="/teen/social?tab=friends" 
          aria-label="Inviter des amis ou voir tous tes amis"
          className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 rounded-2xl"
        >
          <motion.div 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex flex-col items-center gap-2 min-w-[64px] cursor-pointer"
          >
            <div className="w-14 h-14 rounded-full border-2 border-dashed border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-muted-foreground transition-colors bg-muted/40">
              <UserPlus className="w-5 h-5" />
            </div>
            <span className="text-xs font-medium text-muted-foreground">Inviter</span>
          </motion.div>
        </Link>
      </div>
    </motion.div>
  )
}

// Individual friend avatar with presence indicator
function FriendAvatar({ friend, index }: { friend: FriendPresence; index: number }) {
  const isActive = friend.status !== 'offline'
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8, x: -20 }}
      animate={{ opacity: 1, scale: 1, x: 0 }}
      exit={{ opacity: 0, scale: 0.8, x: 20 }}
      transition={{ delay: index * 0.05 }}
      className="flex flex-col items-center gap-2 min-w-[64px]"
    >
      <Link 
        href={`/teen/profile/${friend.user_id}`}
        aria-label={`Voir le profil de ${friend.full_name || 'ami'}${friend.status === 'online' ? ', en ligne' : friend.status === 'playing' ? ', en jeu' : ''}`}
        className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 rounded-full"
      >
        <motion.div 
          whileHover={{ scale: 1.1, y: -2 }}
          whileTap={{ scale: 0.95 }}
          className="relative cursor-pointer"
        >
          <Avatar 
            className="w-14 h-14 border-2 border-border"
            showStatus
            presenceStatus={friend.status}
          >
            <AvatarImage src={friend.avatar_url || undefined} />
            <AvatarFallback className="bg-muted text-muted-foreground">
              {friend.full_name?.[0]?.toUpperCase() || '?'}
            </AvatarFallback>
          </Avatar>
          
          {/* Playing indicator */}
          {friend.status === 'playing' && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-gen-z-lavender flex items-center justify-center"
            >
              <Gamepad2 className="w-3 h-3 text-white" />
            </motion.div>
          )}
        </motion.div>
      </Link>
      
      <div className="text-center">
        <span className="text-xs font-medium text-muted-foreground block truncate max-w-[64px]">
          {friend.full_name?.split(' ')[0] || 'Ami'}
        </span>
        {friend.current_activity && isActive && (
          <span className="text-[10px] text-gen-z-lavender truncate block max-w-[64px]">
            {friend.current_activity}
          </span>
        )}
      </div>
    </motion.div>
  )
}export default OnlineFriends