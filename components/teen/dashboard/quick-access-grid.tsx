'use client'

import * as React from 'react'
import Link from 'next/link'
import { motion, useMotionValue, useSpring, useTransform, AnimatePresence } from 'framer-motion'
import {
  ShoppingBag,
  Target,
  ArrowRight,
  Zap,
  Crown,
  Sparkles,
  Star
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useNotificationCounts } from '@/lib/hooks/teen-dashboard'
import { HolographicBorder } from '@/components/ui/effects/animated-border'
import { CursorHoverArea } from '@/components/ui/effects/elite-cursor'

interface QuickAccessItem {
  label: string
  shortLabel: string
  description: string
  href: string
  icon: React.ElementType
  gradient: string
  iconBg: string
  badge?: string
  badgeType?: 'hot' | 'new' | 'live'
  notificationCount?: number
  borderGradient?: 'lavender' | 'coral' | 'gold' | 'mint' | 'holographic'
}

// Badge styles
const badgeStyles = {
  hot: "bg-gradient-to-r from-coral to-destructive animate-pulse",
  new: "bg-gradient-to-r from-brand-soft to-pink",
  live: "bg-gradient-to-r from-lime to-lime animate-pulse",
}

/* ==========================================================================
   QUICK ACCESS CARD - Individual card with 3D tilt effect
   ========================================================================== */

interface QuickAccessCardProps {
  item: QuickAccessItem
  index: number
}

function QuickAccessCard({ item, index }: QuickAccessCardProps) {
  const [isHovered, setIsHovered] = React.useState(false)
  const [clickEffect, setClickEffect] = React.useState(false)
  const cardRef = React.useRef<HTMLDivElement>(null)
  
  // 3D tilt effect with enhanced springs
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)
  const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [15, -15]), { stiffness: 400, damping: 25 })
  const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-15, 15]), { stiffness: 400, damping: 25 })
  
  // Glow position
  const glowX = useSpring(useTransform(mouseX, [-0.5, 0.5], [0, 100]), { stiffness: 200, damping: 20 })
  const glowY = useSpring(useTransform(mouseY, [-0.5, 0.5], [0, 100]), { stiffness: 200, damping: 20 })

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

  const handleClick = () => {
    setClickEffect(true)
    setTimeout(() => setClickEffect(false), 500)
  }

  return (
    <CursorHoverArea variant="pointer" magnetic={0.4} magneticDistance={120}>
      <Link 
        href={item.href} 
        className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent rounded-2xl" 
        onClick={handleClick}
        aria-label={`${item.label}: ${item.description}${item.notificationCount ? `, ${item.notificationCount} notifications` : ''}${item.badge ? `, ${item.badge}` : ''}`}
      >
        <motion.div
          ref={cardRef}
          initial={{ opacity: 0, y: 30, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          whileTap={{ scale: 0.95 }}
          transition={{ 
            delay: 0.08 * index, 
            type: "spring", 
            stiffness: 200,
            damping: 20 
          }}
          onMouseMove={handleMouseMove}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={handleMouseLeave}
          style={{
            rotateX,
            rotateY,
            transformStyle: 'preserve-3d',
            perspective: 1000,
          }}
          className="relative h-full"
        >
        <HolographicBorder
          gradient={item.borderGradient}
          borderWidth={2}
          borderRadius={24}
          speed="medium"
          intensity={isHovered ? 'strong' : 'subtle'}
          glow={isHovered}
          glowSize={isHovered ? 30 : 0}
          hover={false}
        >
          <div
            className={cn(
              "relative h-full min-h-[120px] sm:min-h-[140px] overflow-hidden rounded-2xl p-3 sm:p-4",
              "bg-gradient-to-br", item.gradient,
              "shadow-lg transition-all duration-300 group",
              "flex flex-col justify-between"
            )}
            style={{ transformStyle: 'preserve-3d' }}
          >
            {/* Cursor-following glow effect */}
            <motion.div
              className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              style={{
                background: useTransform(
                  [glowX, glowY],
                  ([x, y]) => `radial-gradient(150px circle at ${x}% ${y}%, rgba(255,255,255,0.2), transparent 60%)`
                ),
              }}
            />
            
            {/* Shimmer effect on hover */}
            <motion.div 
              className="absolute inset-0 pointer-events-none rounded-2xl"
              style={{
                background: 'linear-gradient(110deg, transparent 30%, rgba(255,255,255,0.15) 50%, transparent 70%)',
                backgroundSize: '200% 100%',
              }}
              animate={isHovered ? {
                backgroundPosition: ['200% 0%', '-100% 0%'],
              } : {}}
              transition={{
                duration: 1,
                repeat: Infinity,
                repeatDelay: 0.5,
              }}
            />
            
            {/* Top row: Icon + Badge */}
            <div 
              className="flex justify-between items-start relative z-10"
              style={{ transform: 'translateZ(30px)' }}
            >
              <motion.div 
                className={cn(
                  "w-11 h-11 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-paper-2  flex items-center justify-center border border-ink"
                )}
                animate={isHovered ? {
                  scale: [1, 1.1, 1],
                  rotate: [0, -5, 5, 0],
                } : {}}
                transition={{ duration: 0.5 }}
              >
                <item.icon className="w-5 h-5 sm:w-6 sm:h-6 text-ink" />
              </motion.div>
              
              {/* Badge or notification */}
              {item.badge && (
                <motion.span 
                  className={cn(
                    "px-2 py-0.5 text-[8px] sm:text-[9px] font-black rounded-full text-ink uppercase tracking-wider shadow-lg",
                    badgeStyles[item.badgeType || 'new']
                  )}
                  initial={{ scale: 0, rotate: -10 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ delay: 0.2 + index * 0.05, type: "spring", stiffness: 500 }}
                  whileHover={{ scale: 1.1 }}
                >
                  {item.badge}
                </motion.span>
              )}
              
              {item.notificationCount && item.notificationCount > 0 && (
                <motion.span 
                  className="min-w-[20px] h-5 px-1.5 flex items-center justify-center text-[10px] font-bold rounded-full bg-destructive text-ink shadow-lg"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: "spring", stiffness: 500 }}
                  style={{
                    boxShadow: '0 0 15px rgba(239, 68, 68, 0.5)',
                  }}
                >
                  {item.notificationCount > 9 ? '9+' : item.notificationCount}
                </motion.span>
              )}
            </div>
            
            {/* Bottom: Label + Arrow */}
            <div 
              className="relative z-10 space-y-0.5"
              style={{ transform: 'translateZ(20px)' }}
            >
              <div className="flex items-center justify-between">
                <h3 className="font-black text-ink text-sm sm:text-base tracking-tight leading-tight">
                  <span className="sm:hidden">{item.shortLabel}</span>
                  <span className="hidden sm:inline">{item.label}</span>
                </h3>
                <motion.div
                  animate={isHovered ? { x: 5, scale: 1.2 } : { x: 0, scale: 1 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                >
                  <ArrowRight className="w-4 h-4 text-ink/70 group-hover:text-ink transition-colors duration-300" />
                </motion.div>
              </div>
              <p className="text-ink/70 text-[10px] sm:text-xs font-medium line-clamp-1 hidden sm:block">
                {item.description}
              </p>
            </div>
          </div>
        </HolographicBorder>

        {/* Click ripple effect */}
        <AnimatePresence>
          {clickEffect && (
            <motion.div
              className="absolute inset-0 rounded-2xl pointer-events-none"
              initial={{ opacity: 0.8, scale: 0.8 }}
              animate={{ opacity: 0, scale: 1.2 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
              style={{
                border: '2px solid white',
                boxShadow: '0 0 30px rgba(255, 255, 255, 0.5)',
              }}
            />
          )}
        </AnimatePresence>

      </motion.div>
    </Link>
    </CursorHoverArea>
  )
}

/* ==========================================================================
   QUICK ACCESS GRID - Main component
   ========================================================================== */

export function QuickAccessGrid({ userId }: { userId?: string }) {
  const notificationCounts = useNotificationCounts(userId)
  // #201 Stop the lies — 4 raccourcis vers des destinations DISTINCTES qui
  // résolvent toutes (plus de doublon Clubs/Crew Battle → /teen/circles), et
  // AUCUN badge NEW/HOT/LIVE codé en dur (seuls les compteurs réels issus de
  // useNotificationCounts subsistent). Cible finale (4 piliers) traitée en #205.
  const items = React.useMemo<QuickAccessItem[]>(() => [
    {
      label: "Quêtes",
      shortLabel: "Quêtes",
      description: "Missions quotidiennes et défis",
      href: "/teen/quests",
      icon: Target,
      gradient: "from-accent-soft to-pink",
      iconBg: "bg-accent-soft/20",
      notificationCount: notificationCounts.quests,
      borderGradient: 'coral',
    },
    {
      label: "Quiz",
      shortLabel: "Quiz",
      description: "Teste tes connaissances et gagne des XP",
      href: "/teen/quiz",
      icon: Star,
      gradient: "from-brand-soft to-pink",
      iconBg: "bg-brand-soft/20",
      borderGradient: 'lavender',
    },
    {
      label: "Crew",
      shortLabel: "Crew",
      description: "Ton crew, tes amis et le classement",
      href: "/teen/circles",
      icon: Crown,
      gradient: "from-gold to-gold",
      iconBg: "bg-gold/20",
      notificationCount: notificationCounts.social,
      borderGradient: 'gold',
    },
    {
      label: "Wallet",
      shortLabel: "Wallet",
      description: "Tes coins, ta boutique et tes badges",
      href: "/teen/wallet",
      icon: ShoppingBag,
      gradient: "from-success-soft to-teal",
      iconBg: "bg-success-soft/20",
      notificationCount: notificationCounts.wallet,
      borderGradient: 'mint',
    },
  ], [notificationCounts])
  return (
    <div className="p-4 sm:p-6 md:p-8 h-full flex flex-col">
      {/* Section title */}
      <motion.div 
        className="flex items-center justify-between mb-4 sm:mb-6"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="flex items-center gap-2 sm:gap-3">
          <motion.div 
            className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-brand-soft/20 flex items-center justify-center relative"
            whileHover={{ scale: 1.1, rotate: 5 }}
          >
            <motion.div
              className="absolute inset-0 rounded-lg sm:rounded-xl bg-brand-soft/30"
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.5, 0.2, 0.5],
              }}
              transition={{ duration: 2, repeat: Infinity }}
            />
            <Zap className="w-4 h-4 sm:w-6 sm:h-6 text-brand-soft relative z-10" />
          </motion.div>
          <div>
            <h2 className="text-lg sm:text-xl md:text-2xl font-black text-ink tracking-tight flex items-center gap-2">
              Accès rapide
              <motion.span
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
              >
                <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-brand-soft" />
              </motion.span>
            </h2>
            <p className="text-[10px] sm:text-xs text-ink/50 font-medium hidden sm:block">Tes raccourcis favoris</p>
          </div>
        </div>
        
        {/* Animated dots */}
        <motion.div 
          className="flex gap-1.5"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          {[0, 0.2, 0.4].map((delay, i) => (
            <motion.div 
              key={i}
              animate={{ 
                scale: [1, 1.5, 1],
                opacity: [0.5, 1, 0.5],
              }} 
              transition={{ 
                repeat: Infinity, 
                duration: 1.5,
                delay,
              }}
              className={cn(
                "w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full",
                i === 0 && "bg-brand-soft",
                i === 1 && "bg-accent-soft",
                i === 2 && "bg-success-soft",
              )}
            />
          ))}
        </motion.div>
      </motion.div>

      {/* Grid - 2x2 on mobile, 4x1 on desktop */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 flex-1">
        {items.map((item, i) => (
          <QuickAccessCard key={item.label} item={item} index={i} />
        ))}
      </div>
    </div>
  )
}
