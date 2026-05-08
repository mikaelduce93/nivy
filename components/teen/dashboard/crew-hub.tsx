'use client'

import * as React from 'react'
import { useState, useEffect } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from 'framer-motion'
import { Users, Trophy, Zap, Shield, ChevronRight, Plus, Crown, Star, Swords, Sparkles, TrendingUp } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button, PremiumButton } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { HolographicBadge, AnimatedProgress } from '@/components/ui/gen-z-effects'
import { getUserCrew } from '@/gamification-system/features/crews/actions'
import { type UserCrewData, getCrewTier, getTierProgress } from '@/gamification-system/features/crews/schema'
import { GlowPulse, FloatingParticles, OrbitParticles, RisingSparks, PALETTES } from '@/components/ui/effects/particle-system'
import { HolographicBorder } from '@/components/ui/effects/animated-border'
import { CursorHoverArea } from '@/components/ui/effects/elite-cursor'
import { CountUpText } from '@/components/ui/effects/text-effects'
import Link from 'next/link'

/* ==========================================================================
   CREW HUB - Elite Silicon Valley Grade
   
   Premium crew management with:
   - 3D card effects
   - Animated tier badges
   - Live member presence
   - Battle launch animations
   - Particle effects
   ========================================================================== */

// Tier color schemes
const TIER_COLORS: Record<string, { primary: string; secondary: string; glow: string }> = {
  Bronze: { primary: '#cd7f32', secondary: '#b87333', glow: 'rgba(205, 127, 50, 0.4)' },
  Silver: { primary: '#c0c0c0', secondary: '#a8a8a8', glow: 'rgba(192, 192, 192, 0.4)' },
  Gold: { primary: '#ffd700', secondary: '#ffcc00', glow: 'rgba(255, 215, 0, 0.4)' },
  Platinum: { primary: '#e5e4e2', secondary: '#d4d4d4', glow: 'rgba(229, 228, 226, 0.4)' },
  Diamond: { primary: '#b9f2ff', secondary: '#9ee5f5', glow: 'rgba(185, 242, 255, 0.4)' },
  Legendary: { primary: '#ff6b35', secondary: '#ff4d00', glow: 'rgba(255, 107, 53, 0.5)' },
}

export function CrewHub() {
  const [data, setData] = useState<UserCrewData | null>(null)
  const [loading, setLoading] = useState(true)
  const [isHovered, setIsHovered] = useState(false)

  useEffect(() => {
    async function loadCrew() {
      const { data, error } = await getUserCrew()
      if (data) setData(data)
      setLoading(false)
    }
    loadCrew()
  }, [])

  if (loading) {
    return <CrewHubSkeleton />
  }

  if (!data?.has_crew) {
    return <NoCrewState />
  }

  const { crew, members, user_role } = data
  const tier = getCrewTier(crew?.total_xp || 0)
  const progress = getTierProgress(crew?.total_xp || 0)
  const tierColors = TIER_COLORS[tier.tier] || TIER_COLORS.Bronze

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="h-full"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="relative h-full rounded-[2rem] sm:rounded-[2.5rem] overflow-hidden bg-zinc-950 border border-white/10">
        {/* Animated header gradient */}
        <div className="relative h-20 sm:h-24 overflow-hidden">
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600"
            style={{ backgroundSize: '200% 100%' }}
            animate={{ backgroundPosition: ['0% 0%', '100% 0%', '0% 0%'] }}
            transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
          />
          
          {/* Floating particles in header */}
          {isHovered && (
            <div className="absolute inset-0 pointer-events-none">
              <FloatingParticles count={12} colors={PALETTES.lavender} direction="up" speed="fast" glow />
            </div>
          )}
          
          {/* Rising sparks */}
          <RisingSparks count={8} colors={['#8b5cf6', '#a78bfa', '#c4b5fd']} intensity="low" />
        </div>
        
        <div className="p-4 sm:p-6 md:p-8 -mt-12 sm:-mt-14 relative z-10 space-y-4 sm:space-y-6">
          {/* Crew Header */}
          <div className="flex items-end justify-between gap-4">
            <div className="flex items-end gap-3 sm:gap-4">
              {/* Crew Avatar with glow */}
              <motion.div 
                className="relative"
                whileHover={{ scale: 1.05 }}
              >
                <motion.div
                  className="absolute -inset-2 rounded-[1.75rem] sm:rounded-[2rem]"
                  style={{ background: tierColors.glow }}
                  animate={{ scale: [1, 1.1, 1], opacity: [0.5, 0.8, 0.5] }}
                  transition={{ duration: 3, repeat: Infinity }}
                />
                <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-[1.75rem] sm:rounded-[2rem] bg-zinc-900 border-4 border-zinc-950 flex items-center justify-center shadow-2xl overflow-hidden">
                  {crew?.avatar_url ? (
                    <Image
                      src={crew.avatar_url}
                      alt={crew.name}
                      fill
                      sizes="(max-width: 640px) 80px, 96px"
                      className="object-cover"
                      unoptimized
                    />
                  ) : (
                    <Users className="w-8 h-8 sm:w-10 sm:h-10 text-indigo-400" />
                  )}
                </div>
                
                {/* Owner crown badge */}
                {user_role === 'owner' && (
                  <motion.div
                    className="absolute -top-2 -right-2 z-20"
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: 'spring', stiffness: 500 }}
                  >
                    <GlowPulse color="#fbbf24" intensity="strong" speed="medium">
                      <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-yellow-500 flex items-center justify-center border-2 border-zinc-950">
                        <Crown className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
                      </div>
                    </GlowPulse>
                  </motion.div>
                )}
              </motion.div>
              
              <div className="pb-1 sm:pb-2 min-w-0">
                <h3 className="text-xl sm:text-2xl md:text-3xl font-black text-white tracking-tighter uppercase truncate">
                  {crew?.name}
                </h3>
                <p className="text-zinc-500 font-bold text-[10px] sm:text-xs uppercase tracking-[0.15em] sm:tracking-[0.2em] truncate">
                  {crew?.motto || "Squad goals 🔥"}
                </p>
              </div>
            </div>
            
            {/* Tier Badge */}
            <CursorHoverArea variant="pointer" magnetic={0.2}>
              <motion.div
                whileHover={{ scale: 1.1, rotate: 5 }}
                className="mb-1 sm:mb-2 flex-shrink-0"
              >
                <HolographicBorder
                  gradient={tier.tier === 'Legendary' ? 'holographic' : tier.tier === 'Diamond' ? 'ice' : 'gold'}
                  borderWidth={2}
                  borderRadius={16}
                  speed="medium"
                  intensity="strong"
                  glow
                  glowSize={15}
                >
                  <div 
                    className="text-center px-3 sm:px-4 py-2 sm:py-3 rounded-xl"
                    style={{ background: `${tierColors.primary}20` }}
                  >
                    <p className="text-[8px] sm:text-[10px] font-black uppercase text-zinc-400">Rang</p>
                    <p 
                      className="text-sm sm:text-lg font-black uppercase tracking-tighter"
                      style={{ color: tierColors.primary }}
                    >
                      {tier.tier}
                    </p>
                  </div>
                </HolographicBorder>
              </motion.div>
            </CursorHoverArea>
          </div>

          {/* Stats Grid with animations */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3 md:gap-4">
            {[
              { icon: Zap, label: 'Total XP', value: crew?.total_xp || 0, color: '#8b5cf6' },
              { icon: Star, label: 'Events', value: crew?.total_events_attended || 0, color: '#f59e0b' },
              { icon: Shield, label: 'Battles', value: crew?.total_challenges_won || 0, color: '#10b981' },
            ].map((stat, i) => (
              <CursorHoverArea key={stat.label} variant="pointer" magnetic={0.15}>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + i * 0.1 }}
                  whileHover={{ scale: 1.05, y: -2 }}
                  className="p-3 sm:p-4 rounded-2xl sm:rounded-3xl bg-white/5 border border-white/5 space-y-1 hover:border-white/20 transition-colors"
                >
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <motion.div
                      animate={{ rotate: [0, 10, -10, 0] }}
                      transition={{ duration: 4, repeat: Infinity, delay: i * 0.5 }}
                    >
                      <stat.icon className="w-3 h-3 sm:w-3.5 sm:h-3.5" style={{ color: stat.color }} />
                    </motion.div>
                    <span className="text-[8px] sm:text-[10px] font-black uppercase text-zinc-500">{stat.label}</span>
                  </div>
                  <p className="text-lg sm:text-xl font-black text-white">
                    <CountUpText value={stat.value} duration={1.5} />
                  </p>
                </motion.div>
              </CursorHoverArea>
            ))}
          </div>

          {/* Progress to Next Tier */}
          <div className="space-y-2 sm:space-y-3">
            <div className="flex justify-between items-center text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-zinc-500">
              <span>Progression Tier</span>
              <motion.span 
                className="text-indigo-400 flex items-center gap-1"
                animate={{ opacity: [0.7, 1, 0.7] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <TrendingUp className="w-3 h-3" />
                {progress}%
              </motion.span>
            </div>
            <div className="relative h-2 sm:h-2.5 bg-white/5 rounded-full overflow-hidden border border-white/5">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 1.5, ease: [0.23, 1, 0.32, 1] }}
                style={{ boxShadow: '0 0 15px rgba(139, 92, 246, 0.5)' }}
              >
                <motion.div
                  className="absolute inset-0"
                  style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)' }}
                  animate={{ x: ['-100%', '200%'] }}
                  transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
                />
              </motion.div>
              
              {progress > 0 && progress < 100 && (
                <motion.div
                  className="absolute top-1/2 -translate-y-1/2 w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-white"
                  style={{
                    left: `calc(${progress}% - 4px)`,
                    boxShadow: '0 0 10px #fff, 0 0 20px #8b5cf6',
                  }}
                  animate={{ scale: [1, 1.4, 1], opacity: [0.8, 1, 0.8] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
              )}
            </div>
          </div>

          {/* Members Preview */}
          <div className="space-y-3 sm:space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-[10px] sm:text-xs font-black uppercase tracking-[0.15em] sm:tracking-[0.2em] text-zinc-500">Top Members</p>
              <Link href="/teen/circles" aria-label="Voir tous les membres du crew">
                <motion.span 
                  className="text-[10px] sm:text-xs font-bold text-indigo-400 hover:text-indigo-300 cursor-pointer focus-visible:outline-none focus-visible:underline"
                  whileHover={{ x: 3 }}
                >
                  Voir tous →
                </motion.span>
              </Link>
            </div>
            <div className="flex flex-col gap-2">
              {members?.slice(0, 3).map((member, i) => (
                <motion.div 
                  key={member.user_id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + i * 0.1 }}
                  whileHover={{ x: 4, backgroundColor: 'rgba(255,255,255,0.05)' }}
                  className="flex items-center justify-between p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-white/[0.02] border border-white/5 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="relative">
                      <div className="relative w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-zinc-800 overflow-hidden border border-white/10">
                        <Image
                          src={member.avatar_url || '/placeholder-user.jpg'}
                          alt={member.pseudo}
                          fill
                          sizes="32px"
                          className="object-cover"
                          unoptimized
                        />
                      </div>
                      {i === 0 && (
                        <div className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-yellow-500 flex items-center justify-center">
                          <Crown className="w-2 h-2 text-white" />
                        </div>
                      )}
                    </div>
                    <span className="text-xs sm:text-sm font-bold text-white tracking-tight">{member.pseudo}</span>
                  </div>
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <span className="text-[9px] sm:text-[10px] font-black text-zinc-500">Lvl {member.level}</span>
                    <motion.div 
                      className="px-1.5 sm:px-2 py-0.5 rounded-full bg-indigo-500/10 text-[7px] sm:text-[8px] font-black text-indigo-400 uppercase"
                      animate={{ scale: [1, 1.05, 1] }}
                      transition={{ duration: 2, repeat: Infinity, delay: i * 0.3 }}
                    >
                      +{member.xp_contributed} XP
                    </motion.div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Battle Button */}
          <CursorHoverArea variant="pointer" magnetic={0.3}>
            <Link href="/teen/circles?action=battle">
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <PremiumButton
                  variant="default"
                  size="lg"
                  className="w-full h-12 sm:h-14 rounded-xl sm:rounded-2xl bg-white text-black font-black text-sm sm:text-lg"
                  glow
                  glowColor="#8b5cf6"
                  ripple
                >
                  <Swords className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                  Lancer une Crew Battle
                  <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 ml-2 text-brand-soft" />
                </PremiumButton>
              </motion.div>
            </Link>
          </CursorHoverArea>
        </div>
      </div>
    </motion.div>
  )
}

/* ==========================================================================
   NO CREW STATE - Premium empty state
   ========================================================================== */

function NoCrewState() {
  const [isHovered, setIsHovered] = useState(false)
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="h-full"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <HolographicBorder
        gradient="holographic"
        borderWidth={2}
        borderRadius={32}
        speed="slow"
        intensity={isHovered ? 'strong' : 'medium'}
        glow={isHovered}
        glowSize={25}
      >
        <div className="relative h-full rounded-[2rem] bg-gradient-to-br from-indigo-900/40 via-zinc-900/60 to-black overflow-hidden">
          {/* Background effects */}
          {isHovered && (
            <div className="absolute inset-0 pointer-events-none">
              <FloatingParticles count={15} colors={PALETTES.lavender} direction="up" speed="medium" glow />
            </div>
          )}
          
          <div className="relative z-10 p-6 sm:p-8 flex flex-col items-center text-center h-full justify-center space-y-4 sm:space-y-6">
            <motion.div 
              className="relative"
              animate={isHovered ? { y: -5 } : { y: 0 }}
            >
              <motion.div
                className="absolute -inset-4 rounded-[2rem] bg-indigo-500/20"
                animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
                transition={{ duration: 3, repeat: Infinity }}
              />
              <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-[1.5rem] sm:rounded-[2rem] bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30">
                <Users className="w-8 h-8 sm:w-10 sm:h-10 text-indigo-400" />
              </div>
            </motion.div>
            
            <div className="space-y-2">
              <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">PAS DE CREW ?</h3>
              <p className="text-zinc-400 max-w-[240px] text-xs sm:text-sm">
                Rejoins tes potes pour gagner 2x plus d'XP et dominer le classement.
              </p>
            </div>
            
            <CursorHoverArea variant="pointer" magnetic={0.3}>
              <Link href="/teen/circles?action=create" aria-label="Créer un nouveau crew" className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 rounded-2xl">
                <PremiumButton
                  variant="lavender"
                  size="lg"
                  className="h-12 sm:h-14 px-6 sm:px-8 rounded-xl sm:rounded-2xl font-black"
                  glow
                  ripple
                >
                  <Plus className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                  CRÉER OU REJOINDRE
                </PremiumButton>
              </Link>
            </CursorHoverArea>
          </div>
        </div>
      </HolographicBorder>
    </motion.div>
  )
}

/* ==========================================================================
   SKELETON - Premium loading state
   ========================================================================== */

function CrewHubSkeleton() {
  return (
    <div className="h-full rounded-[2.5rem] bg-zinc-900/50 overflow-hidden animate-pulse">
      <div className="h-24 bg-gradient-to-r from-indigo-600/20 to-purple-600/20" />
      <div className="p-8 -mt-14 space-y-6">
        <div className="flex items-end gap-4">
          <div className="w-24 h-24 rounded-[2rem] bg-white/5" />
          <div className="space-y-2 pb-2">
            <div className="h-8 w-32 rounded-lg bg-white/5" />
            <div className="h-4 w-24 rounded bg-white/5" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 rounded-3xl bg-white/5" />
          ))}
        </div>
        <div className="h-3 rounded-full bg-white/5" />
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-14 rounded-2xl bg-white/5" />
          ))}
        </div>
        <div className="h-14 rounded-2xl bg-white/5" />
      </div>
    </div>
  )
}
