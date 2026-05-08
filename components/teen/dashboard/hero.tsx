'use client'

/* ==========================================================================
   UNIFIED HERO - Silicon Valley Grade Dashboard Hero
   
   Consolidates teen-hero.tsx, elite-hero.tsx, and teen-dashboard-hero.tsx
   into a single performant component with variant-based rendering.
   
   Variants:
   - standard: Clean, performant hero for most users
   - elite: Enhanced with subtle effects for engaged users
   - legendary: Full premium experience for top users
   ========================================================================== */

import * as React from 'react'
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion'
import { Zap, TrendingUp, Sparkles, Flame } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { UserRoleInfo } from '@/lib/auth/get-user-role'
import { cn } from '@/lib/utils'
import { MotionSurface } from '@/components/ui/primitives/surface'
import { HStack, VStack } from '@/components/ui/primitives/stack'
import { Text, Heading } from '@/components/ui/primitives/text'
import { 
  cardVariants, 
  staggerItem,
  getReducedMotionVariants,
  microInteractions,
} from '@/lib/design-system/motion'
import { semantic, palette } from '@/lib/design-system/colors'
import { useDashboardContext } from './teen-dashboard-client'

/* ==========================================================================
   TYPES
   ========================================================================== */

export type HeroVariant = 'standard' | 'elite' | 'legendary'

export interface HeroProps {
  /** Visual variant */
  variant?: HeroVariant
  /** User data */
  user: UserRoleInfo
  /** XP and level data */
  xpData: {
    total: number
    level: number
    xpToNextLevel?: number
    xpInLevel?: number
    xpForNextLevel?: number
    progressPercent?: number
  }
  /** Current streak in days */
  currentStreak: number
  /** Optional className */
  className?: string
}

/* ==========================================================================
   HELPER FUNCTIONS
   ========================================================================== */

// Tier colors based on level/streak
const TIER_PALETTES = {
  legendary: {
    primary: ['#fbbf24', '#f59e0b', '#d97706'],
    glow: 'rgba(251, 191, 36, 0.4)',
    accent: '#fbbf24',
  },
  epic: {
    primary: ['#a78bfa', '#8b5cf6', '#7c3aed'],
    glow: 'rgba(139, 92, 246, 0.4)',
    accent: '#8b5cf6',
  },
  rare: {
    primary: ['#60a5fa', '#3b82f6', '#2563eb'],
    glow: 'rgba(59, 130, 246, 0.4)',
    accent: '#3b82f6',
  },
  common: {
    primary: ['#10b981', '#059669', '#047857'],
    glow: 'rgba(16, 185, 129, 0.4)',
    accent: '#10b981',
  },
} as const

type TierName = keyof typeof TIER_PALETTES

function getTier(level: number, streak: number): TierName {
  if (level >= 50 || streak >= 30) return 'legendary'
  if (level >= 30 || streak >= 14) return 'epic'
  if (level >= 15 || streak >= 7) return 'rare'
  return 'common'
}

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 6) return 'Nuit blanche ?'
  if (hour < 12) return 'Bonjour'
  if (hour < 18) return 'Hey'
  return 'Bonsoir'
}

function getMotivation(tier: TierName): { text: string; emoji: string } {
  switch (tier) {
    case 'legendary': return { text: 'Légendaire', emoji: '👑' }
    case 'epic': return { text: 'Inarrêtable', emoji: '🔥' }
    case 'rare': return { text: 'En progression', emoji: '⚡' }
    default: return { text: "Let's go", emoji: '🚀' }
  }
}

/* ==========================================================================
   MAIN COMPONENT
   ========================================================================== */

export function Hero({ 
  variant = 'standard', 
  user, 
  xpData, 
  currentStreak,
  className,
}: HeroProps) {
  // Context for reduced motion preference
  const { prefersReducedMotion = false } = useDashboardContext?.() || {}
  
  // Computed values
  const tier = getTier(xpData.level, currentStreak)
  const tierPalette = TIER_PALETTES[tier]
  const greeting = React.useMemo(() => getGreeting(), [])
  const motivation = React.useMemo(() => getMotivation(tier), [tier])
  const firstName = user.fullName?.split(' ')[0] || 'Champion'
  
  // XP calculations
  const xpInLevel = xpData.xpInLevel || 0
  const xpForNextLevel = xpData.xpForNextLevel || 1000
  const xpProgress = Math.min((xpInLevel / xpForNextLevel) * 100, 100)
  const xpRemaining = Math.max(xpForNextLevel - xpInLevel, 0)
  
  // 3D tilt effect (elite/legendary only)
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)
  const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [5, -5]), { 
    stiffness: 300, 
    damping: 30 
  })
  const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-5, 5]), { 
    stiffness: 300, 
    damping: 30 
  })
  
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (variant === 'standard' || prefersReducedMotion) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width - 0.5
    const y = (e.clientY - rect.top) / rect.height - 0.5
    mouseX.set(x)
    mouseY.set(y)
  }
  
  const handleMouseLeave = () => {
    mouseX.set(0)
    mouseY.set(0)
  }
  
  // Get motion variants based on reduced motion preference
  const variants = getReducedMotionVariants(cardVariants, prefersReducedMotion)
  
  // Decide whether to show premium effects
  const showPremiumEffects = variant !== 'standard' && !prefersReducedMotion
  const showLegendaryEffects = variant === 'legendary' && !prefersReducedMotion
  
  return (
    <motion.div
      variants={variants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className={className}
      style={{ perspective: showPremiumEffects ? 1200 : undefined }}
    >
      <motion.div
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={showPremiumEffects ? {
          rotateX: prefersReducedMotion ? 0 : rotateX,
          rotateY: prefersReducedMotion ? 0 : rotateY,
          transformStyle: 'preserve-3d',
        } : undefined}
      >
        <MotionSurface
          elevation="raised"
          padding="none"
          radius="3xl"
          animate={false}
          className={cn(
            'relative overflow-hidden',
            showPremiumEffects && 'shadow-xl',
            showLegendaryEffects && 'ring-1 ring-white/10'
          )}
        >
          {/* Background gradient */}
          <div className="absolute inset-0 pointer-events-none">
            <div 
              className="absolute top-0 right-0 w-2/3 h-full opacity-30"
              style={{
                background: `linear-gradient(to left, ${tierPalette.primary[0]}20, transparent)`,
              }}
            />
            {showPremiumEffects && (
              <div 
                className="absolute bottom-0 left-0 w-1/2 h-1/2 opacity-20"
                style={{
                  background: `linear-gradient(to top-right, ${tierPalette.primary[2]}15, transparent)`,
                }}
              />
            )}
            
            {/* Ambient glow for legendary */}
            {showLegendaryEffects && (
              <motion.div
                className="absolute -top-1/2 -right-1/4 w-96 h-96 rounded-full"
                style={{
                  background: `radial-gradient(circle, ${tierPalette.glow}, transparent 70%)`,
                }}
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [0.3, 0.5, 0.3],
                }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              />
            )}
          </div>
          
          <div className="relative z-10 p-5 sm:p-7 md:p-9">
            {/* Main row: Avatar + Name + Stats */}
            <HStack gap="lg" align="center" className="flex-wrap sm:flex-nowrap">
              {/* Avatar Section */}
              <HeroAvatar
                src={user.teenData?.avatar_url}
                name={firstName}
                level={xpData.level}
                palette={tierPalette}
                showEffects={showPremiumEffects}
                showLegendaryEffects={showLegendaryEffects}
              />
              
              {/* Name and Status */}
              <VStack gap="xs" className="flex-1 min-w-0">
                {/* Greeting */}
                <HStack gap="xs" align="center">
                  <Text size="sm" color="tertiary" weight="medium">
                    {greeting}
                  </Text>
                  {!prefersReducedMotion && (
                    <motion.span
                      animate={{
                        rotate: [0, 14, -8, 14, -4, 10, 0],
                        scale: [1, 1.2, 1.1, 1.2, 1.1, 1.15, 1],
                      }}
                      transition={{
                        duration: 2.5,
                        repeat: Infinity,
                        repeatDelay: 3,
                      }}
                      className="text-lg"
                    >
                      👋
                    </motion.span>
                  )}
                  {prefersReducedMotion && <span className="text-lg">👋</span>}
                </HStack>
                
                {/* Name */}
                <Heading 
                  level={1} 
                  size="3xl"
                  weight="black"
                  tracking="tight"
                  className="truncate"
                >
                  {firstName}
                </Heading>
                
                {/* Status badge */}
                <motion.div
                  className="mt-1 inline-flex"
                  initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <div
                    className={cn(
                      'px-3 py-1 rounded-full flex items-center gap-2 text-sm font-bold',
                      'border backdrop-blur-sm',
                    )}
                    style={{
                      background: `${tierPalette.primary[0]}20`,
                      borderColor: `${tierPalette.primary[0]}40`,
                      color: tierPalette.accent,
                    }}
                  >
                    {!prefersReducedMotion ? (
                      <motion.span
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                      >
                        {motivation.emoji}
                      </motion.span>
                    ) : (
                      <span>{motivation.emoji}</span>
                    )}
                    <span>{motivation.text}</span>
                  </div>
                </motion.div>
              </VStack>
              
              {/* Stats - Hidden on mobile */}
              <HStack gap="sm" className="hidden sm:flex shrink-0">
                {/* Streak Counter */}
                <HeroStreakCounter 
                  streak={currentStreak}
                  showAnimation={!prefersReducedMotion}
                />
                
                {/* XP Badge */}
                <HeroXPBadge 
                  xp={xpData.total}
                  palette={tierPalette}
                  showAnimation={!prefersReducedMotion}
                />
              </HStack>
            </HStack>
            
            {/* XP Progress Bar */}
            <motion.div
              className="mt-6 sm:mt-8"
              initial={prefersReducedMotion ? false : { opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <HeroXPBar
                xpInLevel={xpInLevel}
                xpForNextLevel={xpForNextLevel}
                xpProgress={xpProgress}
                xpRemaining={xpRemaining}
                level={xpData.level}
                palette={tierPalette}
                showAnimation={!prefersReducedMotion}
              />
            </motion.div>
            
            {/* Mobile stats row */}
            <HStack justify="between" align="center" className="flex sm:hidden mt-4">
              <HStack gap="xs" align="center">
                <Sparkles className="w-4 h-4" style={{ color: tierPalette.accent }} />
                <Text size="sm" color="tertiary">Niveau {xpData.level}</Text>
              </HStack>
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/20">
                <Flame className="w-4 h-4 text-orange-400" />
                <span className="text-sm font-bold text-orange-400">{currentStreak}</span>
              </div>
            </HStack>
          </div>
        </MotionSurface>
      </motion.div>
    </motion.div>
  )
}

/* ==========================================================================
   SUB-COMPONENTS
   ========================================================================== */

interface HeroAvatarProps {
  src?: string | null
  name: string
  level: number
  palette: typeof TIER_PALETTES[TierName]
  showEffects: boolean
  showLegendaryEffects: boolean
}

function HeroAvatar({ 
  src, 
  name, 
  level, 
  palette,
  showEffects,
  showLegendaryEffects,
}: HeroAvatarProps) {
  return (
    <div className="relative shrink-0">
      {/* Glow pulse (effects only) */}
      {showEffects && (
        <motion.div
          className="absolute -inset-3 rounded-full"
          style={{
            background: `radial-gradient(circle, ${palette.glow}, transparent 70%)`,
          }}
          animate={{
            scale: [1, 1.15, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{ duration: 3, repeat: Infinity }}
        />
      )}
      
      {/* Rotating ring */}
      <motion.div
        className="relative rounded-full p-[3px]"
        style={{
          background: `conic-gradient(from 0deg, ${palette.primary.join(', ')}, ${palette.primary[0]})`,
        }}
        animate={showEffects ? { rotate: 360 } : undefined}
        transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
      >
        <Avatar className="relative w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 border-3 border-zinc-900">
          <AvatarImage src={src || undefined} />
          <AvatarFallback
            className="text-xl sm:text-2xl md:text-3xl font-black"
            style={{
              background: `linear-gradient(135deg, ${palette.primary.join(', ')})`,
              color: 'white',
            }}
          >
            {name[0]}
          </AvatarFallback>
        </Avatar>
      </motion.div>
      
      {/* Level badge */}
      <motion.div
        className="absolute -bottom-1 -right-1 z-20"
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ delay: 0.4, type: 'spring', stiffness: 500, damping: 15 }}
      >
        <div
          className="px-2.5 py-1 rounded-lg text-xs sm:text-sm font-black text-white border border-white/20"
          style={{
            background: `linear-gradient(135deg, ${palette.primary.join(', ')})`,
            boxShadow: `0 4px 15px ${palette.glow}`,
          }}
        >
          {level}
        </div>
      </motion.div>
    </div>
  )
}

interface HeroStreakCounterProps {
  streak: number
  showAnimation: boolean
}

function HeroStreakCounter({ streak, showAnimation }: HeroStreakCounterProps) {
  return (
    <div
      className="relative p-3 sm:p-4 rounded-xl sm:rounded-2xl overflow-hidden bg-gradient-to-br from-orange-400/20 to-red-500/20 border border-orange-400/30"
    >
      <HStack gap="sm" align="center">
        {showAnimation ? (
          <motion.div
            animate={{
              scale: [1, 1.1, 1],
            }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            <Flame className="w-6 h-6 sm:w-7 sm:h-7 text-orange-400" />
          </motion.div>
        ) : (
          <Flame className="w-6 h-6 sm:w-7 sm:h-7 text-orange-400" />
        )}
        <VStack gap="none">
          <span className="text-lg sm:text-2xl font-black text-white">{streak}</span>
          <span className="text-[10px] sm:text-xs text-orange-400/80 font-medium">jours</span>
        </VStack>
      </HStack>
    </div>
  )
}

interface HeroXPBadgeProps {
  xp: number
  palette: typeof TIER_PALETTES[TierName]
  showAnimation: boolean
}

function HeroXPBadge({ xp, palette, showAnimation }: HeroXPBadgeProps) {
  return (
    <div
      className="relative p-3 sm:p-4 rounded-xl sm:rounded-2xl"
      style={{
        background: `linear-gradient(135deg, ${palette.primary[0]}20, ${palette.primary[2]}20)`,
        border: `1px solid ${palette.primary[0]}40`,
      }}
    >
      <HStack gap="sm" align="center">
        {showAnimation ? (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
          >
            <Zap className="w-5 h-5 sm:w-6 sm:h-6" style={{ color: palette.accent }} />
          </motion.div>
        ) : (
          <Zap className="w-5 h-5 sm:w-6 sm:h-6" style={{ color: palette.accent }} />
        )}
        <VStack gap="none">
          <span className="text-lg sm:text-xl font-black text-white">{xp.toLocaleString()}</span>
          <span className="text-[10px] sm:text-xs font-medium" style={{ color: palette.accent }}>XP</span>
        </VStack>
      </HStack>
    </div>
  )
}

interface HeroXPBarProps {
  xpInLevel: number
  xpForNextLevel: number
  xpProgress: number
  xpRemaining: number
  level: number
  palette: typeof TIER_PALETTES[TierName]
  showAnimation: boolean
}

function HeroXPBar({
  xpInLevel,
  xpForNextLevel,
  xpProgress,
  xpRemaining,
  level,
  palette,
  showAnimation,
}: HeroXPBarProps) {
  return (
    <VStack gap="sm">
      {/* Labels */}
      <HStack justify="between" align="center">
        <HStack gap="xs" align="center">
          {showAnimation ? (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
            >
              <Zap className="w-4 h-4" style={{ color: palette.accent }} />
            </motion.div>
          ) : (
            <Zap className="w-4 h-4" style={{ color: palette.accent }} />
          )}
          <Text size="sm" weight="bold">
            {xpInLevel.toLocaleString()}
            <Text as="span" color="muted" weight="medium"> / {xpForNextLevel.toLocaleString()}</Text>
          </Text>
        </HStack>
        
        <motion.div
          className="text-xs font-semibold px-3 py-1 rounded-full flex items-center gap-1.5"
          style={{
            background: `${palette.primary[0]}20`,
            color: palette.accent,
          }}
          animate={showAnimation ? { opacity: [0.7, 1, 0.7] } : undefined}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <TrendingUp className="w-3 h-3" />
          {xpRemaining.toLocaleString()} pour lvl {level + 1}
        </motion.div>
      </HStack>
      
      {/* Progress bar */}
      <div className="relative h-3 sm:h-4 rounded-full overflow-hidden bg-white/5 border border-white/10">
        {/* Animated fill */}
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{
            background: `linear-gradient(90deg, ${palette.primary.join(', ')})`,
            boxShadow: `0 0 20px ${palette.glow}`,
          }}
          initial={{ width: 0 }}
          animate={{ width: `${xpProgress}%` }}
          transition={{ 
            duration: showAnimation ? 1.5 : 0, 
            delay: showAnimation ? 0.5 : 0, 
            ease: [0.4, 0, 0.2, 1] 
          }}
        >
          {/* Shimmer effect */}
          {showAnimation && (
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
              animate={{ x: ['-100%', '200%'] }}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
            />
          )}
        </motion.div>
        
        {/* Glowing tip */}
        {xpProgress > 0 && showAnimation && (
          <motion.div
            className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white"
            style={{
              left: `calc(${xpProgress}% - 6px)`,
              boxShadow: `0 0 15px #fff, 0 0 30px ${palette.accent}`,
            }}
            animate={{
              scale: [1, 1.5, 1],
              opacity: [0.8, 1, 0.8],
            }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
        )}
        
        {/* Milestone markers */}
        {[25, 50, 75].map((milestone) => (
          <div
            key={milestone}
            className={cn(
              'absolute top-0 bottom-0 w-px transition-colors',
              xpProgress >= milestone ? 'bg-white/40' : 'bg-white/10'
            )}
            style={{ left: `${milestone}%` }}
          />
        ))}
      </div>
    </VStack>
  )
}

/* ==========================================================================
   EXPORTS
   ========================================================================== */

export default Hero

// Re-export for backwards compatibility during migration
export { Hero as TeenHero, Hero as EliteHero }
