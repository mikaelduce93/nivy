'use client'

import * as React from 'react'
import Image from 'next/image'
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from 'framer-motion'
import { Ticket, Lock, Unlock, Zap, Sparkles, Gift, TrendingUp, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { GlowPulse, FloatingParticles, PALETTES } from '@/components/ui/effects/particle-system'
import { CursorHoverArea } from '@/components/ui/effects/elite-cursor'
import { CountUpText } from '@/components/ui/effects/text-effects'
import Link from 'next/link'

/* ==========================================================================
   PURCHASING POWER - Elite Silicon Valley Grade
   
   Premium XP to rewards visualization with:
   - Animated progress with glowing tip
   - 3D reward card preview
   - Particle effects
   - Smooth value animations
   - Holographic unlock effects
   ========================================================================== */

interface PurchasingPowerProps {
  currentXP: number
  nextReward: {
    name: string
    xpCost: number
    image?: string
    progressPercent?: number
  } | null
}

export function PurchasingPower({ currentXP, nextReward }: PurchasingPowerProps) {
  const [isHovered, setIsHovered] = React.useState(false)
  const cardRef = React.useRef<HTMLDivElement>(null)
  
  // 3D tilt effect
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)
  const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [6, -6]), { stiffness: 300, damping: 30 })
  const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-6, 6]), { stiffness: 300, damping: 30 })
  
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

  if (!nextReward) return null

  const progress = Math.min((currentXP / nextReward.xpCost) * 100, 100)
  const remaining = Math.max(0, nextReward.xpCost - currentXP)
  const canAfford = currentXP >= nextReward.xpCost

  return (
    <CursorHoverArea variant="pointer" magnetic={0.2}>
      <Link href="/teen/shop">
        <motion.div
          ref={cardRef}
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20 }}
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
          <div className={cn(
            "relative h-full overflow-hidden rounded-2xl sm:rounded-3xl p-4 sm:p-6",
            "bg-gradient-to-br from-zinc-900/90 via-zinc-900/80 to-zinc-950/90",
            "border transition-all duration-300",
            canAfford 
              ? "border-emerald-500/30 shadow-[0_0_30px_rgba(16,185,129,0.15)]" 
              : "border-white/10"
          )}>
            {/* Ambient particles */}
            {isHovered && (
              <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-3xl">
                <FloatingParticles
                  count={10}
                  colors={canAfford ? PALETTES.mint : PALETTES.lavender}
                  direction="up"
                  speed="medium"
                  glow={true}
                />
              </div>
            )}
            
            {/* Background glow */}
            <motion.div
              className="absolute -top-1/2 -right-1/4 w-64 h-64 rounded-full pointer-events-none"
              style={{
                background: canAfford 
                  ? 'radial-gradient(circle, rgba(16, 185, 129, 0.15) 0%, transparent 70%)'
                  : 'radial-gradient(circle, rgba(139, 92, 246, 0.1) 0%, transparent 70%)',
              }}
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.5, 0.8, 0.5],
              }}
              transition={{ duration: 4, repeat: Infinity }}
            />
            
            {/* Shimmer effect */}
            <motion.div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: 'linear-gradient(110deg, transparent 25%, rgba(255,255,255,0.05) 50%, transparent 75%)',
              }}
              animate={isHovered ? { x: ['-100%', '200%'] } : {}}
              transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 1 }}
            />
            
            {/* Header */}
            <div 
              className="flex items-center justify-between mb-4"
              style={{ transform: 'translateZ(20px)' }}
            >
              <div className="flex items-center gap-2">
                <motion.div
                  className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-brand-soft/20 flex items-center justify-center"
                  animate={isHovered ? { rotate: [0, 10, -10, 0] } : {}}
                  transition={{ duration: 0.5 }}
                >
                  <Gift className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-brand-soft" />
                </motion.div>
                <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-zinc-400">
                  Prochain Objectif
                </span>
              </div>
              
              <AnimatePresence mode="wait">
                {canAfford ? (
                  <motion.div
                    key="unlocked"
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    exit={{ scale: 0, rotate: 180 }}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30"
                  >
                    <motion.div
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 1, repeat: Infinity }}
                    >
                      <Unlock className="w-3 h-3 text-emerald-400" />
                    </motion.div>
                    <span className="text-[10px] sm:text-xs font-bold text-emerald-400">DÉBLOQUÉ</span>
                  </motion.div>
                ) : (
                  <motion.div
                    key="locked"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 border border-white/10"
                  >
                    <Lock className="w-3 h-3 text-zinc-500" />
                    <span className="text-[10px] sm:text-xs font-bold text-zinc-400">
                      <CountUpText value={remaining} duration={1} /> XP
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Reward Card */}
            <div 
              className="flex items-center gap-3 sm:gap-4"
              style={{ transform: 'translateZ(30px)' }}
            >
              {/* Reward Icon with Glow */}
              <motion.div 
                className={cn(
                  "relative w-14 h-14 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl flex items-center justify-center border",
                  canAfford 
                    ? "bg-emerald-500/20 border-emerald-500/30" 
                    : "bg-brand-soft/20 border-brand-soft/30"
                )}
                whileHover={{ scale: 1.08, rotate: 5 }}
                animate={canAfford ? {
                  boxShadow: [
                    '0 0 0px rgba(16, 185, 129, 0.3)',
                    '0 0 25px rgba(16, 185, 129, 0.4)',
                    '0 0 0px rgba(16, 185, 129, 0.3)',
                  ]
                } : {}}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <GlowPulse 
                  color={canAfford ? '#10b981' : '#8b5cf6'} 
                  intensity={isHovered ? 'strong' : 'medium'} 
                  speed="medium"
                >
                  {nextReward.image ? (
                    <Image
                      src={nextReward.image}
                      alt={nextReward.name}
                      width={40}
                      height={40}
                      className="w-8 h-8 sm:w-10 sm:h-10 object-contain"
                    />
                  ) : (
                    <Ticket className={cn(
                      "w-6 h-6 sm:w-7 sm:h-7",
                      canAfford ? "text-emerald-400" : "text-brand-soft"
                    )} />
                  )}
                </GlowPulse>
                
                {/* Sparkles for unlocked */}
                {canAfford && (
                  <motion.div
                    className="absolute -top-1 -right-1"
                    animate={{ rotate: [0, 360], scale: [1, 1.2, 1] }}
                    transition={{ duration: 3, repeat: Infinity }}
                  >
                    <Sparkles className="w-4 h-4 text-yellow-400" />
                  </motion.div>
                )}
              </motion.div>
              
              {/* Reward Info */}
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline mb-2">
                  <h3 className="text-sm sm:text-base font-black text-white truncate pr-2">
                    {nextReward.name}
                  </h3>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
                    >
                      <Zap className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-brand-soft" />
                    </motion.div>
                    <span className="text-xs sm:text-sm font-bold text-brand-soft font-mono">
                      {nextReward.xpCost.toLocaleString()}
                    </span>
                  </div>
                </div>
                
                {/* Premium Progress Bar */}
                <div className="relative">
                  <div className="h-2.5 sm:h-3 bg-white/5 rounded-full overflow-hidden border border-white/5">
                    <motion.div
                      className={cn(
                        "h-full rounded-full",
                        canAfford 
                          ? "bg-gradient-to-r from-emerald-500 to-emerald-400" 
                          : "bg-gradient-to-r from-brand-soft via-purple-500 to-pink-500"
                      )}
                      style={{
                        boxShadow: canAfford 
                          ? '0 0 15px rgba(16, 185, 129, 0.5)' 
                          : '0 0 15px rgba(139, 92, 246, 0.5)',
                      }}
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 1.2, ease: [0.23, 1, 0.32, 1] }}
                    >
                      {/* Shimmer on progress */}
                      <motion.div
                        className="absolute inset-0"
                        style={{
                          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
                        }}
                        animate={{ x: ['-100%', '200%'] }}
                        transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
                      />
                    </motion.div>
                    
                    {/* Glowing tip */}
                    {progress > 0 && progress < 100 && (
                      <motion.div
                        className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-white"
                        style={{
                          left: `calc(${progress}% - 5px)`,
                          boxShadow: `0 0 10px #fff, 0 0 20px ${canAfford ? '#10b981' : '#8b5cf6'}`,
                        }}
                        animate={{
                          scale: [1, 1.4, 1],
                          opacity: [0.8, 1, 0.8],
                        }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                      />
                    )}
                  </div>
                  
                  {/* Progress label */}
                  <div className="flex justify-between mt-1.5">
                    <span className="text-[10px] text-zinc-500 font-medium">
                      <CountUpText value={currentXP} duration={1} /> XP
                    </span>
                    <motion.span 
                      className={cn(
                        "text-[10px] font-bold flex items-center gap-1",
                        canAfford ? "text-emerald-400" : "text-zinc-400"
                      )}
                      animate={canAfford ? { scale: [1, 1.05, 1] } : {}}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    >
                      <TrendingUp className="w-3 h-3" />
                      {Math.round(progress)}%
                    </motion.span>
                  </div>
                </div>
              </div>
              
              {/* Arrow indicator */}
              <motion.div
                className="hidden sm:flex items-center"
                animate={isHovered ? { x: 5 } : { x: 0 }}
                transition={{ type: 'spring', stiffness: 400 }}
              >
                <ChevronRight className="w-5 h-5 text-zinc-600" />
              </motion.div>
            </div>
          </div>
        </motion.div>
      </Link>
    </CursorHoverArea>
  )
}

