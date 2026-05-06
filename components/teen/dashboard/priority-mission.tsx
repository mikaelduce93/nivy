'use client'

import * as React from 'react'
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion'
import { ArrowRight, Zap, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { HolographicBorder } from '@/components/ui/effects/animated-border'
import { FloatingParticles, RisingSparks, GlowPulse, PALETTES, SparkleTrail } from '@/components/ui/effects/particle-system'
import { CursorHoverArea } from '@/components/ui/effects/elite-cursor'
import { useReducedMotion } from '@/components/ui/micro-interactions'

interface PriorityMissionProps {
  action: {
    mission?: {
      id?: string
      name: string
      description?: string
      xp: number
      progress?: number
      type?: 'daily' | 'weekly' | 'challenge' | 'special'
      href?: string
      deadline?: Date | string
    }
  }
  onStart?: (missionId: string) => void
}

// Get mission type styling with particle colors
function getMissionStyle(type?: string) {
  switch (type) {
    case 'daily':
      return { 
        gradient: 'from-gen-z-lavender via-gen-z-grape to-gen-z-lavender', 
        icon: '🌟', 
        color: 'lavender',
        borderGradient: 'lavender' as const,
        particleColors: PALETTES.lavender,
        glowColor: '#8b5cf6'
      }
    case 'weekly':
      return { 
        gradient: 'from-gen-z-coral via-gen-z-peach to-gen-z-coral', 
        icon: '🔥', 
        color: 'coral',
        borderGradient: 'coral' as const,
        particleColors: PALETTES.coral,
        glowColor: '#f43f5e'
      }
    case 'challenge':
      return { 
        gradient: 'from-gen-z-lime via-gen-z-mint to-gen-z-lime', 
        icon: '⚡', 
        color: 'lime',
        borderGradient: 'mint' as const,
        particleColors: PALETTES.mint,
        glowColor: '#10b981'
      }
    case 'special':
      return { 
        gradient: 'from-neon-prestige via-gen-z-yellow to-neon-prestige', 
        icon: '👑', 
        color: 'prestige',
        borderGradient: 'gold' as const,
        particleColors: PALETTES.gold,
        glowColor: '#f59e0b'
      }
    default:
      return { 
        gradient: 'from-gen-z-coral via-gen-z-peach to-gen-z-coral', 
        icon: '🎯', 
        color: 'default',
        borderGradient: 'holographic' as const,
        particleColors: PALETTES.rainbow,
        glowColor: '#f43f5e'
      }
  }
}

export function PriorityMission({ action, onStart }: PriorityMissionProps) {
  const [isHovered, setIsHovered] = React.useState(false)
  const cardRef = React.useRef<HTMLDivElement>(null)
  const prefersReducedMotion = useReducedMotion()
  
  // 3D tilt effect - disabled for reduced motion
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)
  const rotateX = useSpring(
    useTransform(mouseY, [-0.5, 0.5], prefersReducedMotion ? [0, 0] : [5, -5]), 
    { stiffness: 300, damping: 30 }
  )
  const rotateY = useSpring(
    useTransform(mouseX, [-0.5, 0.5], prefersReducedMotion ? [0, 0] : [-5, 5]), 
    { stiffness: 300, damping: 30 }
  )
  
  // Glow position - disabled for reduced motion
  const glowX = useSpring(useTransform(mouseX, [-0.5, 0.5], [0, 100]), { stiffness: 150, damping: 20 })
  const glowY = useSpring(useTransform(mouseY, [-0.5, 0.5], [0, 100]), { stiffness: 150, damping: 20 })
  const glowBackground = useTransform(
    [glowX, glowY],
    ([x, y]) => `radial-gradient(200px circle at ${x}% ${y}%, rgba(255,255,255,0.15), transparent 60%)`
  )
  
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current || prefersReducedMotion) return
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
  
  if (!action?.mission) return null

  const { mission } = action
  const style = getMissionStyle(mission.type)
  
  // Build the href - always navigate to quests page, with specific quest if id exists
  const questHref = mission.id 
    ? `/teen/quests?highlight=${mission.id}` 
    : '/teen/quests'
  
  // Handle button click
  const handleGoClick = (e: React.MouseEvent) => {
    if (onStart && mission.id) {
      e.preventDefault()
      e.stopPropagation()
      onStart(mission.id)
    }
  }

  const content = (
    <motion.div
      ref={cardRef}
      initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={prefersReducedMotion ? { duration: 0 } : { delay: 0.1, type: "spring", stiffness: 200, damping: 20 }}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      style={prefersReducedMotion ? {} : {
        rotateX,
        rotateY,
        transformStyle: 'preserve-3d',
        perspective: 1000,
      }}
      className="h-full"
    >
      {/* Holographic border wrapper - simplified for reduced motion */}
      <HolographicBorder
        gradient={style.borderGradient}
        borderWidth={2}
        borderRadius={24}
        speed={prefersReducedMotion ? "slow" : "medium"}
        intensity={prefersReducedMotion ? 'subtle' : (isHovered ? 'strong' : 'medium')}
        glow={!prefersReducedMotion}
        glowSize={isHovered ? 35 : 15}
        hover={false}
      >
        {/* Main card */}
        <motion.div
          whileHover={prefersReducedMotion ? {} : { scale: 1.01 }}
          whileTap={prefersReducedMotion ? {} : { scale: 0.99 }}
          className={cn(
            "relative h-full overflow-hidden rounded-3xl p-4 sm:p-5 cursor-pointer",
            "bg-gradient-to-br", style.gradient,
            "shadow-lg hover:shadow-xl transition-shadow duration-300"
          )}
          style={prefersReducedMotion ? {} : { transformStyle: 'preserve-3d' }}
        >
          {/* Floating particles - only on full motion */}
          {!prefersReducedMotion && (
            <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-3xl">
              <FloatingParticles
                count={isHovered ? 12 : 6}
                colors={style.particleColors}
                direction="up"
                speed={isHovered ? 'medium' : 'slow'}
                glow={true}
              />
            </div>
          )}
          
          {/* Rising sparks for special missions - only on full motion */}
          {!prefersReducedMotion && (mission.type === 'special' || mission.type === 'challenge') && (
            <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-3xl">
              <RisingSparks
                count={isHovered ? 8 : 4}
                colors={style.particleColors}
                intensity={isHovered ? 'medium' : 'low'}
              />
            </div>
          )}
          
          {/* Decorative elements - static for reduced motion */}
          <div 
            className="absolute top-0 right-0 w-40 h-40 rounded-full blur-3xl -mr-20 -mt-20"
            style={{ background: `${style.glowColor}20`, opacity: 0.4 }}
          />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-black/10 rounded-full blur-2xl -ml-16 -mb-16" />
          
          {/* Cursor-following glow effect - only on full motion */}
          {!prefersReducedMotion && (
            <motion.div
              className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-3xl"
              style={{
                opacity: isHovered ? 1 : 0,
                background: glowBackground,
              }}
            />
          )}
          
          {/* Shimmer effect - only on full motion + hover */}
          {!prefersReducedMotion && isHovered && (
            <motion.div 
              className="absolute inset-0 pointer-events-none rounded-3xl"
              style={{
                background: 'linear-gradient(110deg, transparent 25%, rgba(255,255,255,0.12) 50%, transparent 75%)',
              }}
              animate={{ x: ['-100%', '200%'] }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                repeatDelay: 0.5,
              }}
            />
          )}
          
          {/* Floating icon - static for reduced motion */}
          <motion.div
            className="absolute top-3 right-4 sm:top-4 sm:right-8 text-xl sm:text-2xl"
            animate={prefersReducedMotion ? {} : { 
              y: [0, -8, 0], 
              rotate: [0, 10, -10, 0],
              scale: [1, 1.15, 1]
            }}
            transition={prefersReducedMotion ? {} : { duration: 3, repeat: Infinity, ease: "easeInOut" }}
          >
            {prefersReducedMotion ? (
              <span className="drop-shadow-lg">{style.icon}</span>
            ) : (
              <GlowPulse color={style.glowColor} intensity="medium" speed="medium">
                <span className="drop-shadow-lg">{style.icon}</span>
              </GlowPulse>
            )}
          </motion.div>
          
          <div 
            className="relative z-10 flex flex-col h-full"
            style={prefersReducedMotion ? {} : { transform: 'translateZ(20px)' }}
          >
            {/* Header with badges */}
            <div className="flex items-center gap-2 mb-2 sm:mb-3">
              <motion.div
                whileHover={prefersReducedMotion ? {} : { scale: 1.05 }}
                transition={{ type: 'spring', stiffness: 400 }}
              >
                <Badge variant="glass" size="sm" className="font-bold bg-white/20 backdrop-blur-sm border border-white/20">
                  {prefersReducedMotion ? (
                    <Zap className="w-3 h-3 mr-0.5" />
                  ) : (
                    <motion.span
                      animate={{ rotate: [0, 360] }}
                      transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
                    >
                      <Zap className="w-3 h-3 mr-0.5" />
                    </motion.span>
                  )}
                  +{mission.xp} XP
                </Badge>
              </motion.div>
              {mission.type && (
                <Badge variant="glass" size="sm" className="bg-white/10 backdrop-blur-sm border border-white/10">
                  {mission.type === 'daily' && '📅 Quotidien'}
                  {mission.type === 'weekly' && '📆 Hebdo'}
                  {mission.type === 'challenge' && '🏆 Défi'}
                  {mission.type === 'special' && '⭐ Spécial'}
                </Badge>
              )}
            </div>

            {/* Mission title and description */}
            <h3 className="text-lg sm:text-xl font-black text-white mb-1 tracking-tight line-clamp-1">
              {mission.name}
            </h3>
            <p className="text-white/80 text-xs sm:text-sm mb-3 sm:mb-4 line-clamp-2 flex-grow">
              {mission.description || "Complète cette mission pour progresser !"}
            </p>

            {/* Progress and CTA */}
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="flex-1">
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-white/70 font-medium">Progression</span>
                  <span className="text-white font-bold">{mission.progress || 0}%</span>
                </div>
                <div className="relative">
                  <Progress 
                    value={mission.progress || 0} 
                    size="default"
                    variant="glass"
                    color="default"
                    className="bg-white/20 h-2 [&>div]:bg-white"
                  />
                  {/* Glowing particle at progress tip - simplified for reduced motion */}
                  {mission.progress && mission.progress > 0 && (
                    prefersReducedMotion ? (
                      <div
                        className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-white"
                        style={{
                          left: `calc(${mission.progress}% - 4px)`,
                          boxShadow: `0 0 8px #fff`,
                        }}
                      />
                    ) : (
                      <motion.div
                        className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-white"
                        style={{
                          left: `calc(${mission.progress}% - 4px)`,
                          boxShadow: `0 0 10px #fff, 0 0 20px ${style.glowColor}`,
                        }}
                        animate={{
                          scale: [1, 1.5, 1],
                          opacity: [0.8, 1, 0.8],
                        }}
                        transition={{
                          duration: 1.5,
                          repeat: Infinity,
                          ease: 'easeInOut',
                        }}
                      />
                    )
                  )}
                </div>
              </div>
              
              <motion.div
                whileHover={prefersReducedMotion ? {} : { scale: 1.05, y: -2 }}
                whileTap={prefersReducedMotion ? {} : { scale: 0.95 }}
              >
                <Button 
                  size="lg" 
                  className="bg-white text-gray-900 hover:bg-white/90 rounded-xl sm:rounded-2xl font-bold shadow-lg px-4 sm:px-6 h-10 sm:h-12 relative overflow-hidden group"
                  onClick={handleGoClick}
                >
                  {/* Button glow effect - only on full motion */}
                  {!prefersReducedMotion && (
                    <motion.div
                      className="absolute inset-0 -z-10 rounded-[inherit]"
                      style={{ background: style.glowColor, filter: 'blur(15px)' }}
                      animate={{ opacity: [0, 0.3, 0] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    />
                  )}
                  <Sparkles className="w-4 h-4 mr-1 hidden sm:inline" aria-hidden="true" />
                  {mission.progress && mission.progress > 0 ? 'CONTINUER' : 'GO'}
                  {prefersReducedMotion ? (
                    <ArrowRight className="w-4 h-4 ml-1" aria-hidden="true" />
                  ) : (
                    <motion.span
                      animate={{ x: [0, 5, 0] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    >
                      <ArrowRight className="w-4 h-4 ml-1" aria-hidden="true" />
                    </motion.span>
                  )}
                </Button>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </HolographicBorder>
    </motion.div>
  )

  // Always wrap in link for navigation with elite cursor effects
  return (
    <CursorHoverArea variant="pointer" magnetic={0.3} magneticDistance={150}>
      <Link 
        href={mission.href || questHref} 
        className="block h-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent rounded-3xl"
        aria-label={`${mission.name}: ${mission.description || 'Mission prioritaire'}. Récompense: ${mission.xp} XP${mission.progress ? `, Progression: ${mission.progress}%` : ''}`}
      >
        {content}
      </Link>
    </CursorHoverArea>
  )
}
