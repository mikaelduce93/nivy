'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence, Variants } from 'framer-motion'

/* ==========================================================================
   SKELETON SYSTEM - Silicon Valley Grade Premium Loading States
   
   Features:
   - Staggered reveal animations
   - Morphing transitions to real content
   - Premium gradient pulse effects
   - Multi-layer shimmer
   - Contextual skeleton shapes
   ========================================================================== */

// Animation variants for staggered children
const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
  exit: {
    opacity: 0,
    transition: {
      staggerChildren: 0.05,
      staggerDirection: -1,
    },
  },
}

const itemVariants: Variants = {
  hidden: { 
    opacity: 0, 
    y: 10,
    scale: 0.95,
  },
  visible: { 
    opacity: 1, 
    y: 0,
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 25,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    filter: 'blur(4px)',
  },
}

/* ==========================================================================
   BASE SKELETON - Enhanced with premium effects
   ========================================================================== */

interface SkeletonProps {
  className?: string
  variant?: 'default' | 'circular' | 'rounded' | 'text' | 'pill'
  animate?: boolean
  /** Shimmer speed: slow, medium, fast */
  shimmerSpeed?: 'slow' | 'medium' | 'fast'
  /** Multi-layer gradient effect */
  premium?: boolean
  /** Glow effect */
  glow?: boolean
  glowColor?: string
}

export function Skeleton({ 
  className, 
  variant = 'default', 
  animate = true,
  shimmerSpeed = 'medium',
  premium = false,
  glow = false,
  glowColor = 'rgba(139, 92, 246, 0.3)',
}: SkeletonProps) {
  const variantClasses = {
    default: 'rounded-md',
    circular: 'rounded-full',
    rounded: 'rounded-2xl',
    text: 'rounded h-4',
    pill: 'rounded-full h-6',
  }

  const shimmerDurations = {
    slow: '3s',
    medium: '2s',
    fast: '1.2s',
  }

  return (
    <div
      className={cn(
        'relative overflow-hidden',
        premium ? 'bg-gradient-to-br from-white/[0.08] via-white/[0.04] to-white/[0.08]' : 'bg-white/5',
        variantClasses[variant],
        glow && 'shadow-[0_0_20px_-5px_var(--glow-color)]',
        className
      )}
      style={{
        '--glow-color': glowColor,
      } as React.CSSProperties}
    >
      {animate && (
        <>
          {/* Primary shimmer */}
          <motion.div
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(110deg, transparent 25%, rgba(255,255,255,0.08) 50%, transparent 75%)',
              backgroundSize: '200% 100%',
            }}
            animate={{
              backgroundPosition: ['200% 0%', '-100% 0%'],
            }}
            transition={{
              duration: parseFloat(shimmerDurations[shimmerSpeed]),
              repeat: Infinity,
              ease: 'linear',
            }}
          />
          
          {/* Secondary shimmer for premium effect */}
          {premium && (
            <motion.div
              className="absolute inset-0"
              style={{
                background: 'linear-gradient(110deg, transparent 35%, rgba(139,92,246,0.1) 50%, transparent 65%)',
                backgroundSize: '200% 100%',
              }}
              animate={{
                backgroundPosition: ['200% 0%', '-100% 0%'],
              }}
              transition={{
                duration: parseFloat(shimmerDurations[shimmerSpeed]) * 1.5,
                repeat: Infinity,
                ease: 'linear',
                delay: 0.3,
              }}
            />
          )}
        </>
      )}
      
      {/* Subtle pulse overlay */}
      {animate && (
        <motion.div
          className="absolute inset-0 bg-white/[0.02]"
          animate={{
            opacity: [0, 0.5, 0],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      )}
    </div>
  )
}

/* ==========================================================================
   SKELETON CONTAINER - For staggered animations
   ========================================================================== */

interface SkeletonContainerProps {
  children: React.ReactNode
  className?: string
  /** Animate children with stagger */
  stagger?: boolean
}

export function SkeletonContainer({ 
  children, 
  className,
  stagger = true,
}: SkeletonContainerProps) {
  return (
    <motion.div
      className={className}
      variants={stagger ? containerVariants : undefined}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      {children}
    </motion.div>
  )
}

/* ==========================================================================
   SKELETON ITEM - Individual animated skeleton piece
   ========================================================================== */

interface SkeletonItemProps extends SkeletonProps {
  children?: React.ReactNode
}

export function SkeletonItem({ children, ...skeletonProps }: SkeletonItemProps) {
  return (
    <motion.div variants={itemVariants}>
      {children || <Skeleton {...skeletonProps} />}
    </motion.div>
  )
}

/* ==========================================================================
   MORPHING SKELETON - Transitions smoothly to content
   ========================================================================== */

interface MorphingSkeletonProps {
  isLoading: boolean
  skeleton: React.ReactNode
  children: React.ReactNode
  className?: string
}

export function MorphingSkeleton({
  isLoading,
  skeleton,
  children,
  className,
}: MorphingSkeletonProps) {
  return (
    <div className={cn('relative', className)}>
      <AnimatePresence mode="wait">
        {isLoading ? (
          <motion.div
            key="skeleton"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ 
              opacity: 0,
              scale: 0.98,
              filter: 'blur(8px)',
            }}
            transition={{ duration: 0.3 }}
          >
            {skeleton}
          </motion.div>
        ) : (
          <motion.div
            key="content"
            initial={{ 
              opacity: 0,
              scale: 1.02,
              filter: 'blur(8px)',
            }}
            animate={{ 
              opacity: 1,
              scale: 1,
              filter: 'blur(0px)',
            }}
            transition={{ 
              duration: 0.4,
              ease: [0.23, 1, 0.32, 1],
            }}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ==========================================================================
   HERO SKELETON - Premium dashboard hero loading
   ========================================================================== */

export function HeroSkeleton() {
  return (
    <SkeletonContainer className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-zinc-900/95 via-zinc-900/90 to-zinc-950/95 p-4 sm:p-6 md:p-8 border border-white/5">
      {/* Background glow */}
      <motion.div
        className="absolute top-0 right-0 w-64 h-64 rounded-full bg-gen-z-lavender/10 blur-[80px]"
        animate={{ opacity: [0.3, 0.5, 0.3] }}
        transition={{ duration: 3, repeat: Infinity }}
      />
      
      <div className="flex items-center gap-3 sm:gap-4 md:gap-6 relative z-10">
        {/* Avatar with orbiting ring */}
        <div className="relative">
          <SkeletonItem>
            <Skeleton className="w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20" variant="circular" premium glow />
          </SkeletonItem>
          <motion.div
            className="absolute inset-0 border-2 border-gen-z-lavender/30 rounded-full"
            animate={{ rotate: 360 }}
            transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
          />
        </div>
        
        {/* Name and greeting */}
        <div className="flex-1 space-y-2">
          <SkeletonItem>
            <Skeleton className="h-3 w-16" variant="text" />
          </SkeletonItem>
          <SkeletonItem>
            <Skeleton className="h-6 w-32 sm:h-8 sm:w-40" variant="rounded" premium />
          </SkeletonItem>
          <SkeletonItem>
            <Skeleton className="h-5 w-24" variant="pill" />
          </SkeletonItem>
        </div>
        
        {/* Stats */}
        <div className="flex gap-2 sm:gap-4">
          <SkeletonItem>
            <Skeleton className="w-16 h-16 sm:w-20 sm:h-20" variant="rounded" premium glow glowColor="rgba(251, 146, 60, 0.2)" />
          </SkeletonItem>
          <SkeletonItem>
            <Skeleton className="w-16 h-10" variant="rounded" premium glow />
          </SkeletonItem>
        </div>
      </div>
      
      {/* XP Bar */}
      <motion.div 
        className="mt-4 sm:mt-5 space-y-2 relative z-10"
        variants={itemVariants}
      >
        <div className="flex justify-between">
          <Skeleton className="h-4 w-24" variant="text" />
          <Skeleton className="h-4 w-32" variant="text" />
        </div>
        <Skeleton className="h-3 sm:h-3.5 w-full" variant="rounded" premium />
      </motion.div>
    </SkeletonContainer>
  )
}

/* ==========================================================================
   CARD SKELETON - Generic card loading state
   ========================================================================== */

export function CardSkeleton({ className }: { className?: string }) {
  return (
    <SkeletonContainer className={cn(
      'rounded-2xl sm:rounded-3xl bg-zinc-900/50 border border-white/5 p-4 sm:p-6',
      className
    )}>
      <div className="flex items-start justify-between mb-4">
        <SkeletonItem>
          <Skeleton className="w-10 h-10 sm:w-12 sm:h-12" variant="rounded" premium />
        </SkeletonItem>
        <SkeletonItem>
          <Skeleton className="w-16 h-5" variant="pill" />
        </SkeletonItem>
      </div>
      <SkeletonItem>
        <Skeleton className="h-5 w-3/4 mb-2" variant="text" />
      </SkeletonItem>
      <SkeletonItem>
        <Skeleton className="h-4 w-full mb-4" variant="text" />
      </SkeletonItem>
      <SkeletonItem>
        <Skeleton className="h-2 w-full" variant="rounded" premium glow />
      </SkeletonItem>
    </SkeletonContainer>
  )
}

/* ==========================================================================
   QUICK ACCESS SKELETON - Grid cards loading
   ========================================================================== */

export function QuickAccessSkeleton() {
  return (
    <SkeletonContainer className="p-4 sm:p-6 md:p-8 h-full">
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <div className="flex items-center gap-2 sm:gap-3">
          <SkeletonItem>
            <Skeleton className="w-8 h-8 sm:w-10 sm:h-10" variant="rounded" premium glow />
          </SkeletonItem>
          <div>
            <SkeletonItem>
              <Skeleton className="h-5 w-24 sm:w-32" variant="text" />
            </SkeletonItem>
            <SkeletonItem>
              <Skeleton className="h-3 w-20 mt-1 hidden sm:block" variant="text" />
            </SkeletonItem>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        {[...Array(4)].map((_, i) => (
          <SkeletonItem key={i}>
            <Skeleton 
              className="h-[120px] sm:h-[140px]" 
              variant="rounded" 
              premium 
              glow
              glowColor={[
                'rgba(139, 92, 246, 0.15)',
                'rgba(244, 63, 94, 0.15)',
                'rgba(245, 158, 11, 0.15)',
                'rgba(16, 185, 129, 0.15)',
              ][i]}
            />
          </SkeletonItem>
        ))}
      </div>
    </SkeletonContainer>
  )
}

/* ==========================================================================
   MAP SKELETON - Interactive map loading
   ========================================================================== */

export function MapSkeleton() {
  return (
    <div className="h-full w-full flex items-center justify-center bg-zinc-900/50 relative overflow-hidden rounded-[inherit]">
      {/* Animated map grid */}
      <div className="absolute inset-0 opacity-20">
        <motion.div 
          className="grid grid-cols-8 grid-rows-8 h-full w-full"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          {[...Array(64)].map((_, i) => (
            <motion.div 
              key={i} 
              className="border border-white/5"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.01 }}
            />
          ))}
        </motion.div>
      </div>
      
      {/* Loading indicator */}
      <motion.div 
        className="flex flex-col items-center gap-3 text-zinc-500 z-10"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <motion.div
          className="w-16 h-16 rounded-2xl bg-gradient-to-br from-white/10 to-white/5 flex items-center justify-center border border-white/10"
          animate={{ 
            scale: [1, 1.1, 1],
            boxShadow: [
              '0 0 0 0 rgba(139, 92, 246, 0)',
              '0 0 30px 10px rgba(139, 92, 246, 0.2)',
              '0 0 0 0 rgba(139, 92, 246, 0)',
            ],
          }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </motion.div>
        <motion.span 
          className="text-xs font-black uppercase tracking-widest"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          Loading Map...
        </motion.span>
      </motion.div>
      
      {/* Animated fake markers */}
      {[...Array(4)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute"
          style={{
            left: `${15 + i * 22}%`,
            top: `${25 + (i % 2) * 35}%`,
          }}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ 
            scale: [0, 1, 0.8, 1],
            opacity: [0, 0.8, 0.4, 0.6],
          }}
          transition={{ 
            duration: 2, 
            repeat: Infinity, 
            delay: i * 0.4,
            repeatDelay: 1,
          }}
        >
          <div className="w-4 h-4 rounded-full bg-gen-z-lavender/40 blur-sm" />
          <div className="absolute inset-0 w-4 h-4 rounded-full bg-gen-z-lavender animate-ping" />
        </motion.div>
      ))}
    </div>
  )
}

/* ==========================================================================
   FEED SKELETON - Activity feed loading
   ========================================================================== */

export function FeedSkeleton() {
  return (
    <SkeletonContainer className="space-y-4 p-4">
      {[...Array(4)].map((_, i) => (
        <motion.div
          key={i}
          className="flex gap-3"
          variants={itemVariants}
        >
          <Skeleton className="w-10 h-10 flex-shrink-0" variant="circular" premium />
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <Skeleton className="h-3 w-24" variant="text" />
              <Skeleton className="h-3 w-12" variant="text" />
            </div>
            <Skeleton className="h-3 w-full" variant="text" />
            <Skeleton className="h-3 w-2/3" variant="text" />
          </div>
        </motion.div>
      ))}
    </SkeletonContainer>
  )
}

/* ==========================================================================
   SOCIAL HUB SKELETON - Social section loading
   ========================================================================== */

export function SocialHubSkeleton() {
  return (
    <SkeletonContainer className="h-full flex flex-col p-4 sm:p-5">
      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-white/5 rounded-xl mb-4">
        {[...Array(3)].map((_, i) => (
          <SkeletonItem key={i}>
            <Skeleton className="flex-1 h-9" variant="rounded" />
          </SkeletonItem>
        ))}
      </div>
      
      {/* Content */}
      <div className="flex-1 space-y-3">
        {[...Array(4)].map((_, i) => (
          <motion.div key={i} className="flex items-center gap-3 p-2" variants={itemVariants}>
            <Skeleton className="w-9 h-9" variant="circular" premium />
            <div className="flex-1">
              <Skeleton className="h-3 w-24 mb-1" variant="text" />
              <Skeleton className="h-3 w-16" variant="text" />
            </div>
            <Skeleton className="w-6 h-6" variant="circular" />
          </motion.div>
        ))}
      </div>
    </SkeletonContainer>
  )
}

/* ==========================================================================
   FULL PAGE SKELETON - Complete dashboard loading
   ========================================================================== */

export function DashboardSkeleton() {
  return (
    <div className="relative min-h-screen bg-[#020203] text-white overflow-x-hidden">
      {/* Animated background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <motion.div 
          className="absolute -top-[10%] -right-[10%] w-[600px] h-[600px] rounded-full bg-gen-z-lavender/5 blur-[100px]"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{ duration: 8, repeat: Infinity }}
        />
        <motion.div 
          className="absolute bottom-[10%] -left-[10%] w-[400px] h-[400px] rounded-full bg-gen-z-coral/5 blur-[80px]"
          animate={{
            scale: [1, 1.1, 1],
            opacity: [0.2, 0.4, 0.2],
          }}
          transition={{ duration: 6, repeat: Infinity, delay: 1 }}
        />
      </div>

      <motion.div 
        className="relative z-10 py-6 sm:py-8 md:py-10 px-3 sm:px-4 md:px-8 max-w-[1600px] mx-auto space-y-6 sm:space-y-8 md:space-y-12 pb-24 md:pb-10"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        {/* Hero */}
        <HeroSkeleton />
        
        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-4 sm:gap-6">
          <div className="lg:col-span-6">
            <CardSkeleton className="min-h-[180px]" />
          </div>
          <div className="lg:col-span-6">
            <div className="h-[280px] sm:h-[320px] md:h-[400px] rounded-2xl sm:rounded-3xl overflow-hidden border border-white/5">
              <MapSkeleton />
            </div>
          </div>
          <div className="lg:col-span-6">
            <div className="rounded-2xl sm:rounded-3xl bg-zinc-900/50 border border-white/5 overflow-hidden">
              <QuickAccessSkeleton />
            </div>
          </div>
          <div className="lg:col-span-6">
            <div className="h-full rounded-2xl sm:rounded-3xl bg-zinc-900/50 border border-white/5 overflow-hidden">
              <SocialHubSkeleton />
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
