'use client'

import * as React from 'react'
import { useMemo, useEffect, useState } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button, PremiumButton } from '@/components/ui/button'
import { Heart, MessageCircle, Share2, Wifi, Gamepad2, LogIn, Sparkles, Zap, Trophy, Star } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from 'framer-motion'
import { cn } from '@/lib/utils'
import { GlowPulse, PALETTES } from '@/components/ui/effects/particle-system'
import { CursorHoverArea } from '@/components/ui/effects/elite-cursor'

/* ==========================================================================
   SOCIAL FEED - Elite Silicon Valley Grade
   
   Premium activity feed with:
   - 3D card hover effects
   - Animated interactions
   - Live presence indicators
   - Premium glass morphism
   - Smooth staggered animations
   ========================================================================== */

type SocialFeedProps = {
  initialActivities?: any[]
  userId?: string
}

type PresenceActivityType = 'came_online' | 'started_playing' | 'activity_update'

type FeedActivity = {
  id: string
  created_at?: string
  user?: {
    id?: string
    username?: string
    avatar_url?: string
  }
  activity_type?: {
    name?: string
    emoji?: string
    type?: string
  }
  title?: string
  content?: string
  likes_count?: number
  comments_count?: number
  shares_count?: number
  isPresenceEvent?: boolean
  presenceType?: PresenceActivityType
}

const fallbackActivities: FeedActivity[] = [
  {
    id: 'demo-1',
    created_at: new Date().toISOString(),
    user: { username: 'Amine', avatar_url: '/avatars/amine.jpg' },
    activity_type: { name: 'Nouvelle mission', emoji: '🎯', type: 'achievement' },
    title: 'A complété un défi quotidien',
    likes_count: 12,
    comments_count: 3,
    shares_count: 1,
  },
  {
    id: 'demo-2',
    created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    user: { username: 'Sara', avatar_url: '/avatars/sara.jpg' },
    activity_type: { name: 'Event', emoji: '🎉', type: 'event' },
    title: "S'est inscrite à la soirée de vendredi",
    likes_count: 24,
    comments_count: 8,
    shares_count: 4,
  },
  {
    id: 'demo-3',
    created_at: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
    user: { username: 'Lina', avatar_url: '/avatars/lina.jpg' },
    activity_type: { name: 'XP gagné', emoji: '✨', type: 'xp' },
    title: 'A gagné 150 XP',
    likes_count: 7,
    comments_count: 0,
    shares_count: 0,
  },
]

// Activity type colors
const activityTypeColors: Record<string, { bg: string; border: string; glow: string }> = {
  achievement: { bg: 'bg-amber-500/10', border: 'border-amber-500/20', glow: 'rgba(245, 158, 11, 0.3)' },
  event: { bg: 'bg-gen-z-coral/10', border: 'border-gen-z-coral/20', glow: 'rgba(244, 63, 94, 0.3)' },
  xp: { bg: 'bg-gen-z-lavender/10', border: 'border-gen-z-lavender/20', glow: 'rgba(139, 92, 246, 0.3)' },
  presence: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', glow: 'rgba(16, 185, 129, 0.3)' },
  default: { bg: 'bg-white/5', border: 'border-white/10', glow: 'rgba(255, 255, 255, 0.1)' },
}

// Presence event configs
const presenceEventConfig: Record<PresenceActivityType, { emoji: string; label: string; icon: typeof Wifi; color: string }> = {
  came_online: { emoji: '🟢', label: 'Vient de se connecter', icon: LogIn, color: '#10b981' },
  started_playing: { emoji: '🎮', label: 'Joue maintenant', icon: Gamepad2, color: '#8b5cf6' },
  activity_update: { emoji: '⚡', label: 'Activité', icon: Wifi, color: '#f59e0b' },
}

export function SocialFeed({ initialActivities = [], userId }: SocialFeedProps) {
  const [presenceEvents, setPresenceEvents] = useState<FeedActivity[]>([])
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set())

  useEffect(() => {
    const handlePresenceEvent = (event: CustomEvent) => {
      const { friend, type } = event.detail
      
      if (!friend) return

      const newEvent: FeedActivity = {
        id: `presence-${friend.user_id}-${Date.now()}`,
        created_at: new Date().toISOString(),
        user: {
          id: friend.user_id,
          username: friend.full_name,
          avatar_url: friend.avatar_url,
        },
        activity_type: {
          name: presenceEventConfig[type as PresenceActivityType]?.label || 'Activité',
          emoji: presenceEventConfig[type as PresenceActivityType]?.emoji || '⚡',
          type: 'presence',
        },
        title: presenceEventConfig[type as PresenceActivityType]?.label || 'Mise à jour',
        isPresenceEvent: true,
        presenceType: type,
        likes_count: 0,
        comments_count: 0,
        shares_count: 0,
      }

      setPresenceEvents(prev => {
        const updated = [newEvent, ...prev].slice(0, 5)
        return updated
      })

      setTimeout(() => {
        setPresenceEvents(prev => prev.filter(e => e.id !== newEvent.id))
      }, 5 * 60 * 1000)
    }

    window.addEventListener('presence:friend_online' as any, handlePresenceEvent)
    window.addEventListener('presence:friend_playing' as any, handlePresenceEvent)

    return () => {
      window.removeEventListener('presence:friend_online' as any, handlePresenceEvent)
      window.removeEventListener('presence:friend_playing' as any, handlePresenceEvent)
    }
  }, [])

  const activities = useMemo(() => {
    const baseActivities = Array.isArray(initialActivities) && initialActivities.length > 0
      ? initialActivities as FeedActivity[]
      : fallbackActivities

    return [...presenceEvents, ...baseActivities]
  }, [initialActivities, presenceEvents])

  const handleLike = (id: string) => {
    setLikedPosts(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  return (
    <div className="h-full flex flex-col px-4 sm:px-6 pb-4 sm:pb-6">
      {/* Activity cards */}
      <div className="flex-1 overflow-y-auto space-y-3 scrollbar-hide">
        <AnimatePresence mode="popLayout">
          {activities.map((activity, index) => (
            <EliteActivityCard
              key={activity.id}
              activity={activity}
              index={index}
              isLiked={likedPosts.has(activity.id)}
              onLike={() => handleLike(activity.id)}
            />
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}

/* ==========================================================================
   ELITE ACTIVITY CARD - Premium card with 3D effects
   ========================================================================== */

interface EliteActivityCardProps {
  activity: FeedActivity
  index: number
  isLiked: boolean
  onLike: () => void
}

function EliteActivityCard({ activity, index, isLiked, onLike }: EliteActivityCardProps) {
  const [isHovered, setIsHovered] = useState(false)
  const cardRef = React.useRef<HTMLDivElement>(null)
  
  // 3D tilt
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)
  const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [3, -3]), { stiffness: 300, damping: 30 })
  const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-3, 3]), { stiffness: 300, damping: 30 })
  
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return
    const rect = cardRef.current.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width - 0.5
    const y = (e.clientY - rect.top) / rect.height - 0.5
    mouseX.set(x)
    mouseY.set(y)
  }

  const handleMouseLeave = () => {
    mouseX.set(0)
    mouseY.set(0)
    setIsHovered(false)
  }

  const username = activity.user?.username || 'Utilisateur'
  const timeLabel = activity.created_at
    ? formatDistanceToNow(new Date(activity.created_at), { addSuffix: true, locale: fr })
    : "à l'instant"
  const title =
    activity.title ||
    activity.content ||
    activity.activity_type?.name ||
    'Nouvelle activité'

  const isPresence = activity.isPresenceEvent
  const activityType = activity.activity_type?.type || 'default'
  const colors = activityTypeColors[activityType] || activityTypeColors.default

  return (
    <motion.div 
      ref={cardRef}
      layout
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.95 }}
      transition={{ duration: 0.4, delay: index * 0.06, type: 'spring', stiffness: 300 }}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      style={{
        rotateX,
        rotateY,
        transformStyle: 'preserve-3d',
        perspective: 1000,
      }}
      whileHover={{ scale: 1.01 }}
      className={cn(
        "relative rounded-xl sm:rounded-2xl p-3 sm:p-4 transition-all duration-300 cursor-pointer",
        colors.bg,
        "border",
        isHovered ? 'border-white/20' : colors.border,
        "backdrop-blur-sm"
      )}
    >
      {/* Glow effect on hover */}
      <motion.div
        className="absolute inset-0 rounded-xl sm:rounded-2xl pointer-events-none"
        style={{ boxShadow: `0 0 30px ${colors.glow}` }}
        animate={{ opacity: isHovered ? 1 : 0 }}
        transition={{ duration: 0.3 }}
      />
      
      {/* Shimmer */}
      <motion.div
        className="absolute inset-0 rounded-xl sm:rounded-2xl overflow-hidden pointer-events-none"
        style={{
          background: 'linear-gradient(110deg, transparent 25%, rgba(255,255,255,0.05) 50%, transparent 75%)',
        }}
        animate={isHovered ? { x: ['-100%', '200%'] } : {}}
        transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 1 }}
      />

      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center gap-2 sm:gap-3">
          <motion.div 
            className="relative"
            whileHover={{ scale: 1.1 }}
          >
            {isPresence && (
              <motion.div
                className="absolute -inset-1 rounded-full"
                style={{ background: presenceEventConfig[activity.presenceType || 'came_online'].color }}
                animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.6, 0.3] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            )}
            <Avatar 
              className="h-9 w-9 sm:h-10 sm:w-10 border border-white/10"
              showStatus={isPresence}
              presenceStatus={isPresence ? 'online' : undefined}
            >
              <AvatarImage src={activity.user?.avatar_url} />
              <AvatarFallback className="bg-zinc-800 text-white font-bold text-sm">
                {username[0]}
              </AvatarFallback>
            </Avatar>
          </motion.div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-bold text-white">
              <span className="truncate">{username}</span>
              {activity.activity_type?.emoji && (
                <motion.span
                  animate={isHovered ? { scale: [1, 1.2, 1] } : {}}
                  transition={{ duration: 0.5 }}
                >
                  {activity.activity_type.emoji}
                </motion.span>
              )}
              {isPresence && (
                <motion.span 
                  className="ml-1 text-[8px] sm:text-[10px] font-black px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 uppercase tracking-wider"
                  animate={{ opacity: [0.7, 1, 0.7] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  LIVE
                </motion.span>
              )}
            </div>
            <div className="text-[10px] sm:text-xs text-zinc-500">{timeLabel}</div>
          </div>
        </div>

        {/* Content */}
        <div className="mt-2 sm:mt-3 text-xs sm:text-sm text-white/90 font-medium">{title}</div>

        {/* Interaction buttons */}
        {!isPresence && (
          <div className="mt-3 sm:mt-4 flex items-center gap-1.5 sm:gap-2">
            <CursorHoverArea variant="pointer" magnetic={0.2}>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={(e) => { e.stopPropagation(); onLike(); }}
                className={cn(
                  "flex items-center gap-1 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-bold transition-all",
                  isLiked 
                    ? "bg-red-500/20 text-red-400 border border-red-500/30" 
                    : "bg-white/5 text-zinc-400 border border-white/10 hover:text-red-400 hover:border-red-500/30"
                )}
              >
                <motion.div
                  animate={isLiked ? { scale: [1, 1.3, 1] } : {}}
                  transition={{ duration: 0.3 }}
                >
                  <Heart className={cn("h-3 w-3 sm:h-3.5 sm:w-3.5", isLiked && "fill-current")} />
                </motion.div>
                {(activity.likes_count ?? 0) + (isLiked ? 1 : 0)}
              </motion.button>
            </CursorHoverArea>
            
            <CursorHoverArea variant="pointer" magnetic={0.2}>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="flex items-center gap-1 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-lg sm:rounded-xl bg-white/5 text-zinc-400 border border-white/10 text-[10px] sm:text-xs font-bold hover:text-gen-z-lavender hover:border-gen-z-lavender/30 transition-all"
              >
                <MessageCircle className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                {activity.comments_count ?? 0}
              </motion.button>
            </CursorHoverArea>
            
            <CursorHoverArea variant="pointer" magnetic={0.2}>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="flex items-center gap-1 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-lg sm:rounded-xl bg-white/5 text-zinc-400 border border-white/10 text-[10px] sm:text-xs font-bold hover:text-gen-z-mint hover:border-gen-z-mint/30 transition-all"
              >
                <Share2 className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                {activity.shares_count ?? 0}
              </motion.button>
            </CursorHoverArea>
          </div>
        )}

        {/* Presence action */}
        {isPresence && (
          <div className="mt-3">
            <CursorHoverArea variant="pointer" magnetic={0.3}>
              <motion.button
                whileHover={{ scale: 1.03, y: -1 }}
                whileTap={{ scale: 0.97 }}
                className="flex items-center gap-1.5 px-3 py-1.5 sm:py-2 rounded-lg sm:rounded-xl bg-gen-z-lavender/10 border border-gen-z-lavender/30 text-gen-z-lavender text-[10px] sm:text-xs font-bold hover:bg-gen-z-lavender/20 transition-all"
              >
                <MessageCircle className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                Envoyer un message
                <Sparkles className="h-2.5 w-2.5 sm:h-3 sm:w-3 opacity-60" />
              </motion.button>
            </CursorHoverArea>
          </div>
        )}
      </div>
    </motion.div>
  )
}

// Export helper to dispatch presence events
export function dispatchPresenceEvent(type: PresenceActivityType, friend: any) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(`presence:friend_${type === 'came_online' ? 'online' : 'playing'}`, {
      detail: { friend, type }
    }))
  }
}
