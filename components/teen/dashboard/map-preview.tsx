'use client'

import * as React from 'react'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from 'framer-motion'
import { MapPin, Users, Calendar, ChevronRight, Sparkles, Navigation, Zap, Compass } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { GlowPulse, FloatingParticles, OrbitParticles, PALETTES } from '@/components/ui/effects/particle-system'
import { CursorHoverArea } from '@/components/ui/effects/elite-cursor'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

/* ==========================================================================
   MAP PREVIEW - Elite Silicon Valley Grade
   
   Premium discovery map preview with:
   - Animated friend markers with avatars
   - Glowing event pins
   - Radar sweep animation
   - 3D hover effects
   - Premium glass overlays
   ========================================================================== */

interface Friend {
  id: string
  name: string
  avatar_url?: string
  distance?: string
}

interface Event {
  id: string
  name: string
  type: 'meetup' | 'challenge' | 'party'
}

interface MapPreviewProps {
  userId?: string
  className?: string
}

// Event type colors
const EVENT_COLORS: Record<string, { bg: string; text: string; glow: string }> = {
  meetup: { bg: 'bg-emerald-500/90', text: 'text-white', glow: 'rgba(16, 185, 129, 0.5)' },
  challenge: { bg: 'bg-orange-500/90', text: 'text-white', glow: 'rgba(249, 115, 22, 0.5)' },
  party: { bg: 'bg-gen-z-coral/90', text: 'text-white', glow: 'rgba(244, 63, 94, 0.5)' },
}

export function MapPreview({ userId, className }: MapPreviewProps) {
  const [nearbyFriends, setNearbyFriends] = useState<Friend[]>([])
  const [nearbyEvents, setNearbyEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [isHovered, setIsHovered] = useState(false)
  
  // 3D tilt
  const cardRef = React.useRef<HTMLDivElement>(null)
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)
  const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [4, -4]), { stiffness: 300, damping: 30 })
  const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-4, 4]), { stiffness: 300, damping: 30 })
  
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

  const mapEventType = (category?: string | null): Event['type'] => {
    const normalized = (category || '').toLowerCase()
    if (normalized.includes('challenge') || normalized.includes('sport')) return 'challenge'
    if (normalized.includes('party') || normalized.includes('soir') || normalized.includes('event')) return 'party'
    return 'meetup'
  }

  useEffect(() => {
    const fetchNearbyData = async () => {
      if (!userId) {
        setLoading(false)
        return
      }

      try {
        const supabase = createClient()
        const friendsResponse = await fetch('/api/teen/friends')

        if (friendsResponse.ok) {
          const data = await friendsResponse.json()
          const friends = (data.friends || []).slice(0, 4).map((f: any) => ({
            id: f.id,
            name: f.name || 'Ami',
            avatar_url: f.avatar_url,
            distance: f.status === 'online' ? 'En ligne' : 'À proximité',
          }))
          setNearbyFriends(friends)
        } else {
          setNearbyFriends([
            { id: '1', name: 'Max', avatar_url: undefined, distance: '500m' },
            { id: '2', name: 'Emma', avatar_url: undefined, distance: '1.2km' },
            { id: '3', name: 'Lucas', avatar_url: undefined, distance: '2km' },
          ])
        }

        const todayIso = new Date().toISOString()
        const { data: eventsData } = await supabase
          .from('events')
          .select('id, title, category, event_date')
          .gte('event_date', todayIso)
          .order('event_date', { ascending: true })
          .limit(2)

        if (eventsData && eventsData.length > 0) {
          setNearbyEvents(eventsData.map((event: any) => ({
            id: event.id,
            name: event.title || 'Event',
            type: mapEventType(event.category),
          })))
        } else {
          setNearbyEvents([
            { id: '1', name: 'Meetup Gaming', type: 'meetup' },
            { id: '2', name: 'Challenge Fitness', type: 'challenge' },
          ])
        }
      } catch (error) {
        console.error('Error fetching map data:', error)
        setNearbyFriends([
          { id: '1', name: 'Max', distance: '500m' },
          { id: '2', name: 'Emma', distance: '1.2km' },
        ])
        setNearbyEvents([
          { id: '1', name: 'Meetup Gaming', type: 'meetup' },
        ])
      } finally {
        setLoading(false)
      }
    }

    fetchNearbyData()
  }, [userId])

  return (
    <CursorHoverArea variant="pointer" magnetic={0.15}>
      <Link href="/teen/social?tab=map" className="block h-full">
        <motion.div
          ref={cardRef}
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
          whileTap={{ scale: 0.99 }}
          className={cn(
            "relative h-full rounded-2xl sm:rounded-3xl overflow-hidden bg-zinc-900/80 border border-white/10 group cursor-pointer",
            className
          )}
        >
          {/* Premium map background */}
          <div className="absolute inset-0">
            {/* Animated grid pattern */}
            <motion.div 
              className="absolute inset-0 opacity-15"
              animate={isHovered ? { opacity: 0.25 } : { opacity: 0.15 }}
            >
              <div 
                className="h-full w-full"
                style={{
                  backgroundImage: `
                    linear-gradient(to right, rgba(139, 92, 246, 0.3) 1px, transparent 1px),
                    linear-gradient(to bottom, rgba(139, 92, 246, 0.3) 1px, transparent 1px)
                  `,
                  backgroundSize: '35px 35px',
                }}
              />
            </motion.div>

            {/* Gradient meshes */}
            <motion.div
              className="absolute -top-1/4 -left-1/4 w-96 h-96 rounded-full"
              style={{ background: 'radial-gradient(circle, rgba(139, 92, 246, 0.2) 0%, transparent 70%)' }}
              animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
              transition={{ duration: 6, repeat: Infinity }}
            />
            <motion.div
              className="absolute -bottom-1/4 -right-1/4 w-80 h-80 rounded-full"
              style={{ background: 'radial-gradient(circle, rgba(244, 63, 94, 0.15) 0%, transparent 70%)' }}
              animate={{ scale: [1, 1.3, 1], opacity: [0.4, 0.7, 0.4] }}
              transition={{ duration: 8, repeat: Infinity, delay: 2 }}
            />
            
            {/* Radar sweep animation */}
            <motion.div
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200%] h-[200%]"
              style={{
                background: 'conic-gradient(from 0deg, transparent 0deg, rgba(139, 92, 246, 0.15) 30deg, transparent 60deg)',
              }}
              animate={{ rotate: 360 }}
              transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
            />
            
            {/* Center point (user location) */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
              <motion.div
                className="w-3 h-3 rounded-full bg-gen-z-lavender"
                style={{ boxShadow: '0 0 20px rgba(139, 92, 246, 0.8)' }}
                animate={{ scale: [1, 1.3, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
              {/* Pulse rings */}
              {[1, 2, 3].map((i) => (
                <motion.div
                  key={i}
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-gen-z-lavender/40"
                  animate={{ 
                    width: [0, 100 + i * 40],
                    height: [0, 100 + i * 40],
                    opacity: [0.6, 0]
                  }}
                  transition={{ duration: 3, repeat: Infinity, delay: i * 0.8 }}
                />
              ))}
            </div>

            {/* Friend markers with avatars */}
            {!loading && nearbyFriends.map((friend, i) => (
              <motion.div
                key={friend.id}
                className="absolute"
                style={{
                  left: `${20 + i * 18}%`,
                  top: `${25 + (i % 2) * 30}%`,
                }}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.3 + i * 0.15, type: 'spring' }}
              >
                {/* Glow */}
                <motion.div
                  className="absolute -inset-3 rounded-full bg-gen-z-lavender/30"
                  animate={{ scale: [1, 1.5, 1], opacity: [0.3, 0.6, 0.3] }}
                  transition={{ duration: 2, repeat: Infinity, delay: i * 0.4 }}
                />
                
                {/* Avatar */}
                <motion.div
                  whileHover={{ scale: 1.2 }}
                  className="relative"
                >
                  <Avatar className="w-8 h-8 sm:w-10 sm:h-10 border-2 border-gen-z-lavender shadow-lg">
                    <AvatarImage src={friend.avatar_url} />
                    <AvatarFallback className="bg-gen-z-lavender text-white text-xs font-bold">
                      {friend.name[0]}
                    </AvatarFallback>
                  </Avatar>
                  
                  {/* Online indicator */}
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-zinc-900" />
                </motion.div>
                
                {/* Distance label (on hover) */}
                <AnimatePresence>
                  {isHovered && (
                    <motion.div
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 5 }}
                      className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap"
                    >
                      <span className="text-[10px] font-bold text-white bg-black/60 px-1.5 py-0.5 rounded">
                        {friend.distance}
                      </span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}

            {/* Event markers */}
            {!loading && nearbyEvents.map((event, i) => {
              const colors = EVENT_COLORS[event.type] || EVENT_COLORS.party
              return (
                <motion.div
                  key={event.id}
                  className="absolute z-10"
                  style={{
                    right: `${12 + i * 22}%`,
                    top: `${35 + i * 18}%`,
                  }}
                  initial={{ scale: 0, opacity: 0, y: 20 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 + i * 0.2, type: 'spring' }}
                >
                  <motion.div
                    animate={{ y: [0, -6, 0] }}
                    transition={{ duration: 2.5, repeat: Infinity, delay: i * 0.5 }}
                  >
                    <GlowPulse color={colors.glow} intensity="medium" speed="medium">
                      <div 
                        className={cn(
                          "flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl backdrop-blur-md border border-white/20 shadow-xl",
                          colors.bg
                        )}
                      >
                        <Calendar className={cn("w-3 h-3", colors.text)} />
                        <span className={cn("text-[10px] sm:text-xs font-bold whitespace-nowrap", colors.text)}>
                          {event.name}
                        </span>
                      </div>
                    </GlowPulse>
                  </motion.div>
                </motion.div>
              )
            })}
          </div>

          {/* Header badge with glass effect */}
          <div className="absolute top-3 left-3 sm:top-4 sm:left-4 z-20">
            <motion.div 
              className="inline-flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl sm:rounded-2xl bg-black/40 backdrop-blur-xl border border-white/20 shadow-2xl"
              whileHover={{ scale: 1.05 }}
            >
              <motion.div
                className="relative"
                animate={{ rotate: 360 }}
                transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
              >
                <Compass className="w-4 h-4 sm:w-5 sm:h-5 text-gen-z-mint" />
              </motion.div>
              <span className="text-xs sm:text-sm font-black text-white tracking-tight">Discovery Map</span>
              <motion.div
                className="w-1.5 h-1.5 rounded-full bg-emerald-400"
                animate={{ scale: [1, 1.3, 1], opacity: [1, 0.7, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
            </motion.div>
          </div>

          {/* Stats overlay - Premium glass effect */}
          <div className="absolute bottom-3 left-3 right-3 sm:bottom-4 sm:left-4 sm:right-4 z-20">
            <div className="flex items-center justify-between gap-2">
              <div className="flex gap-1.5 sm:gap-2">
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                  whileHover={{ scale: 1.05 }}
                  className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-black/40 backdrop-blur-xl border border-white/20"
                >
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <Users className="w-3.5 h-3.5 text-gen-z-lavender" />
                  </motion.div>
                  <span className="text-[10px] sm:text-xs font-bold text-white">
                    {nearbyFriends.length} amis
                  </span>
                </motion.div>

                {nearbyEvents.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 }}
                    whileHover={{ scale: 1.05 }}
                    className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/40 backdrop-blur-xl border border-white/20"
                  >
                    <motion.div
                      animate={{ rotate: [0, 10, -10, 0] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      <Sparkles className="w-3.5 h-3.5 text-gen-z-coral" />
                    </motion.div>
                    <span className="text-xs font-bold text-white">{nearbyEvents.length} events</span>
                  </motion.div>
                )}
              </div>

              {/* CTA Button */}
              <motion.div
                whileHover={{ scale: 1.08, x: 3 }}
                whileTap={{ scale: 0.95 }}
                className="flex items-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl bg-gen-z-lavender text-white shadow-lg font-bold text-[10px] sm:text-xs"
                style={{ boxShadow: '0 0 20px rgba(139, 92, 246, 0.4)' }}
              >
                <Navigation className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                Explorer
                <motion.div
                  animate={{ x: [0, 3, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  <ChevronRight className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                </motion.div>
              </motion.div>
            </div>
          </div>

          {/* Bottom gradient fade */}
          <div className="absolute bottom-0 inset-x-0 h-24 sm:h-28 bg-gradient-to-t from-zinc-900 via-zinc-900/70 to-transparent pointer-events-none z-10" />
          <div className="absolute top-0 inset-x-0 h-16 bg-gradient-to-b from-zinc-900/50 to-transparent pointer-events-none z-10" />

          {/* Hover overlay */}
          <motion.div
            className="absolute inset-0 bg-gen-z-lavender/5 pointer-events-none"
            animate={{ opacity: isHovered ? 1 : 0 }}
            transition={{ duration: 0.3 }}
          />
        </motion.div>
      </Link>
    </CursorHoverArea>
  )
}
