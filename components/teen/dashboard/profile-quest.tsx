'use client'

import * as React from 'react'
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from 'framer-motion'
import { User, Music, MapPin, Camera, ChevronRight, Check, ArrowRight, Zap, Sparkles, Star } from 'lucide-react'
import { Progress } from '@/components/ui/progress'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { GlowPulse, FloatingParticles, PALETTES, ParticleBurst } from '@/components/ui/effects/particle-system'
import { HolographicBorder } from '@/components/ui/effects/animated-border'
import { CursorHoverArea } from '@/components/ui/effects/elite-cursor'
import Link from 'next/link'

/* ==========================================================================
   PROFILE QUEST - Elite Silicon Valley Grade
   
   Premium profile completion widget with:
   - Animated progress tracking
   - 3D step cards
   - XP reward animations
   - Particle celebrations
   - Smooth expand/collapse
   ========================================================================== */

interface ProfileQuestProps {
  initialProgress?: number
}

export function ProfileQuest({ }: ProfileQuestProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const [celebrateStep, setCelebrateStep] = useState<string | null>(null)
  const [profile, setProfile] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    const loadProfile = async () => {
      try {
        const response = await fetch('/api/teen/profile')
        if (!response.ok) throw new Error('Failed to load profile')
        const data = await response.json()
        if (mounted) setProfile(data?.data || null)
      } catch {
        if (mounted) setProfile(null)
      } finally {
        if (mounted) setLoading(false)
      }
    }

    loadProfile()
    return () => {
      mounted = false
    }
  }, [])

  const steps = React.useMemo(() => {
    const hasAvatar = !!profile?.avatar_url || !!profile?.avatar_emoji
    const hasUsername = !!profile?.username
    const hasBio = !!profile?.bio
    const hasCity = !!profile?.city

    return [
      { id: 'photo', label: 'Ajoute ta photo', xp: 50, completed: hasAvatar, icon: Camera, color: '#f43f5e' },
      { id: 'username', label: 'Choisis un pseudo', xp: 100, completed: hasUsername, icon: User, color: '#8b5cf6' },
      { id: 'bio', label: 'Ta bio', xp: 50, completed: hasBio, icon: Music, color: '#10b981' },
      { id: 'city', label: 'Ajoute ta ville', xp: 50, completed: hasCity, icon: MapPin, color: '#f59e0b' },
    ]
  }, [profile])

  const completedCount = steps.filter(s => s.completed).length
  const progress = (completedCount / steps.length) * 100
  const totalXPEarnable = steps.reduce((acc, s) => acc + (s.completed ? 0 : s.xp), 0)

  const handleComplete = (id: string) => {
    setCelebrateStep(id)
    setTimeout(() => setCelebrateStep(null), 1000)
    toast.info("Ouvre l'édition du profil pour compléter.")
  }

  if (loading || progress === 100) return null

  return (
    <motion.div
      layout
      className="relative z-10 h-full"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <HolographicBorder
        gradient="lavender"
        borderWidth={2}
        borderRadius={28}
        speed="slow"
        intensity={isHovered ? 'medium' : 'subtle'}
        glow={isHovered}
        glowSize={20}
        hover={false}
      >
        <div 
          className={cn(
            "h-full overflow-hidden transition-all duration-500",
            "bg-gradient-to-br from-zinc-900/95 via-zinc-900/90 to-zinc-950/95 backdrop-blur-xl rounded-[28px]"
          )}
        >
          {/* Ambient particles */}
          {isHovered && (
            <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-[28px]">
              <FloatingParticles count={8} colors={PALETTES.lavender} direction="up" speed="slow" glow />
            </div>
          )}
          
          {/* Header Section */}
          <CursorHoverArea variant="pointer" magnetic={0.1}>
            <motion.div 
              className="p-4 sm:p-6 cursor-pointer relative"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {/* Background glow */}
              <motion.div
                className="absolute -top-1/2 -right-1/4 w-48 h-48 sm:w-64 sm:h-64 rounded-full pointer-events-none"
                style={{ background: 'radial-gradient(circle, rgba(59, 130, 246, 0.1) 0%, transparent 70%)' }}
                animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
                transition={{ duration: 4, repeat: Infinity }}
              />
              
              <div className="flex items-center justify-between mb-3 sm:mb-4 relative z-10">
                <div className="flex items-center gap-2 sm:gap-3">
                  <motion.div 
                    className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-blue-500/20 flex items-center justify-center"
                    whileHover={{ scale: 1.1, rotate: 5 }}
                  >
                    <motion.div
                      className="absolute inset-0 rounded-lg sm:rounded-xl bg-blue-500/30"
                      animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0.2, 0.5] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    />
                    <User className="w-5 h-5 sm:w-6 sm:h-6 text-blue-400 relative z-10" />
                  </motion.div>
                  <div>
                    <h3 className="font-black text-white tracking-tight text-sm sm:text-base flex items-center gap-1.5">
                      Complete Profile
                      <Sparkles className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-blue-400" />
                    </h3>
                    <p className="text-zinc-500 text-[10px] sm:text-xs font-bold uppercase tracking-tighter">Level Up Opportunity</p>
                  </div>
                </div>
                
                {/* XP Badge with glow */}
                <motion.div 
                  className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20"
                  animate={{ 
                    scale: [1, 1.05, 1],
                    boxShadow: [
                      '0 0 0px rgba(59, 130, 246, 0.3)',
                      '0 0 15px rgba(59, 130, 246, 0.3)',
                      '0 0 0px rgba(59, 130, 246, 0.3)',
                    ]
                  }}
                  transition={{ repeat: Infinity, duration: 2 }}
                >
                  <Zap className="w-3 h-3 text-blue-400" />
                  <span className="text-[10px] sm:text-xs font-black text-blue-400">+{totalXPEarnable} XP</span>
                </motion.div>
              </div>
              
              {/* Progress section */}
              <div className="space-y-2 relative z-10">
                <div className="flex items-center justify-between text-[10px] sm:text-xs font-black uppercase tracking-widest text-zinc-500">
                  <span>Progression</span>
                  <motion.span 
                    className="text-blue-400"
                    animate={{ opacity: [0.7, 1, 0.7] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    {Math.round(progress)}%
                  </motion.span>
                </div>
                <div className="flex items-center gap-3 sm:gap-4">
                  {/* Premium progress bar */}
                  <div className="relative h-2 sm:h-2.5 bg-white/10 flex-1 rounded-full overflow-hidden border border-white/5">
                    <motion.div
                      className="h-full rounded-full bg-gradient-to-r from-blue-500 via-blue-400 to-cyan-400"
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 1, ease: [0.23, 1, 0.32, 1] }}
                      style={{ boxShadow: '0 0 15px rgba(59, 130, 246, 0.5)' }}
                    >
                      <motion.div
                        className="absolute inset-0"
                        style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)' }}
                        animate={{ x: ['-100%', '200%'] }}
                        transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
                      />
                    </motion.div>
                    
                    {progress > 0 && (
                      <motion.div
                        className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-white"
                        style={{
                          left: `calc(${progress}% - 4px)`,
                          boxShadow: '0 0 8px #fff, 0 0 15px #3b82f6',
                        }}
                        animate={{ scale: [1, 1.3, 1], opacity: [0.8, 1, 0.8] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                      />
                    )}
                  </div>
                  
                  {/* Expand button */}
                  <motion.div 
                    animate={{ rotate: isExpanded ? 90 : 0 }}
                    whileHover={{ scale: 1.1 }}
                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/5 flex items-center justify-center border border-white/10 hover:border-blue-500/30 transition-colors"
                  >
                    <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
                  </motion.div>
                </div>
              </div>
            </motion.div>
          </CursorHoverArea>

          {/* Expanded Steps */}
          <AnimatePresence>
            {isExpanded && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className="px-4 sm:px-6 pb-4 sm:pb-6 space-y-2 sm:space-y-3"
              >
                {steps.map((step, idx) => (
                  <CursorHoverArea key={step.id} variant={step.completed ? undefined : 'pointer'} magnetic={0.15}>
                    <motion.div 
                      initial={{ x: -20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: idx * 0.08, type: 'spring', stiffness: 300 }}
                      whileHover={!step.completed ? { x: 4, scale: 1.01 } : {}}
                      whileTap={!step.completed ? { scale: 0.98 } : {}}
                      className={cn(
                        "relative flex items-center justify-between p-3 sm:p-4 rounded-xl sm:rounded-2xl border transition-all duration-300",
                        step.completed 
                          ? 'bg-zinc-900/50 border-white/5 opacity-50' 
                          : 'bg-white/5 border-white/10 hover:bg-white/10 cursor-pointer group'
                      )}
                      style={!step.completed ? { 
                        '--hover-border': `${step.color}40`,
                      } as React.CSSProperties : {}}
                      onClick={() => !step.completed && handleComplete(step.id)}
                    >
                      {/* Celebration burst */}
                      {celebrateStep === step.id && (
                        <ParticleBurst
                          trigger={true}
                          x={50}
                          y={50}
                          count={15}
                          colors={[step.color, '#fff']}
                          spread={80}
                        />
                      )}
                      
                      <div className="flex items-center gap-3 sm:gap-4">
                        <motion.div 
                          className={cn(
                            "w-9 h-9 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl flex items-center justify-center transition-all duration-300",
                            step.completed ? 'bg-zinc-800 text-zinc-500' : 'shadow-lg'
                          )}
                          style={!step.completed ? { 
                            background: `${step.color}20`,
                            color: step.color,
                          } : {}}
                          whileHover={!step.completed ? { scale: 1.15, rotate: 10 } : {}}
                        >
                          {step.completed ? (
                            <Check className="w-4 h-4 sm:w-5 sm:h-5" />
                          ) : (
                            <step.icon className="w-4 h-4 sm:w-5 sm:h-5" />
                          )}
                        </motion.div>
                        <span className={cn(
                          "font-bold text-xs sm:text-sm tracking-tight",
                          step.completed ? 'text-zinc-500 line-through' : 'text-white'
                        )}>
                          {step.label}
                        </span>
                      </div>
                      
                      {!step.completed && (
                        <div className="flex items-center gap-1.5 sm:gap-2">
                          <motion.span 
                            className="text-[10px] sm:text-xs font-black tracking-widest uppercase flex items-center gap-1"
                            style={{ color: step.color }}
                            animate={{ opacity: [0.7, 1, 0.7] }}
                            transition={{ duration: 2, repeat: Infinity }}
                          >
                            <Star className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                            +{step.xp}
                          </motion.span>
                          <motion.div
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                            animate={{ x: [0, 4, 0] }}
                            transition={{ duration: 1.5, repeat: Infinity }}
                          >
                            <ArrowRight className="w-3 h-3 sm:w-3.5 sm:h-3.5" style={{ color: step.color }} />
                          </motion.div>
                        </div>
                      )}
                    </motion.div>
                  </CursorHoverArea>
                ))}
                
                {/* Edit Profile CTA */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="pt-2"
                >
                  <Link href="/teen/profile/edit">
                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="flex items-center justify-center gap-2 py-2.5 sm:py-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 font-bold text-xs sm:text-sm hover:bg-blue-500/20 transition-colors cursor-pointer"
                    >
                      <User className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      Éditer mon profil
                      <ArrowRight className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                    </motion.div>
                  </Link>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </HolographicBorder>
    </motion.div>
  )
}

